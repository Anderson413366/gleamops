# Migration Template

Use this template when creating new SQL migration files.

## File Naming

```
NNNNN_description.sql
```

Where `NNNNN` is the next sequential number (zero-padded to 5 digits).

## Template

```sql
-- ==========================================================================
-- Migration: NNNNN_description
-- Author: [name]
-- Date: [YYYY-MM-DD]
-- Purpose: [Brief description of what this migration does]
--
-- Rollback: [Instructions to reverse this migration]
-- Example:
--   DROP TABLE IF EXISTS public.new_table;
--   DROP TRIGGER IF EXISTS set_updated_at_new_table ON public.new_table;
--   DROP TRIGGER IF EXISTS set_version_etag_new_table ON public.new_table;
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. Table Creation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.new_table (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  -- [entity-specific columns]
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',

  -- Standard metadata columns
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  version     INT NOT NULL DEFAULT 1,
  etag        TEXT NOT NULL DEFAULT gen_random_uuid()::text,

  -- Unique constraint per tenant
  UNIQUE (tenant_id, code)
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_new_table_tenant ON public.new_table(tenant_id);
CREATE INDEX idx_new_table_status ON public.new_table(status) WHERE archived_at IS NULL;
CREATE INDEX idx_new_table_code ON public.new_table(tenant_id, code);

-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_new_table
  BEFORE UPDATE ON public.new_table
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_version_etag_new_table
  BEFORE UPDATE ON public.new_table
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_new_table ON public.new_table
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY select_new_table ON public.new_table
  FOR SELECT USING (true);

CREATE POLICY insert_new_table ON public.new_table
  FOR INSERT WITH CHECK (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY update_new_table ON public.new_table
  FOR UPDATE USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

-- ---------------------------------------------------------------------------
-- 5. Hard-Delete Prevention
-- ---------------------------------------------------------------------------
-- Use soft-delete (archived_at) instead of DELETE.
-- This trigger prevents accidental hard deletes.
CREATE TRIGGER prevent_hard_delete_new_table
  BEFORE DELETE ON public.new_table
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

-- ---------------------------------------------------------------------------
-- 6. Seed Data (optional)
-- ---------------------------------------------------------------------------
-- INSERT INTO public.new_table (tenant_id, code, name)
-- SELECT t.id, 'CODE-0001', 'Example'
-- FROM public.tenants t
-- WHERE t.slug = 'demo';
```

## Checklist

Before submitting a migration, verify:

- [ ] Table has `tenant_id` FK (unless it's a system/lookup table)
- [ ] Table has `created_at`, `updated_at`, `archived_at`, `version`, `etag`
- [ ] `set_updated_at` trigger created
- [ ] `set_version_etag` trigger created
- [ ] RLS enabled with tenant isolation policy
- [ ] At least one index on `tenant_id`
- [ ] Hard-delete prevention trigger
- [ ] Rollback instructions in header comment
- [ ] Migration can be run idempotently (`IF NOT EXISTS` / `IF EXISTS`)
