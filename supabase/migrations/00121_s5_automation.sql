-- =============================================================================
-- Migration 00121: Sprint 5 — Automation (Generated Columns + Triggers)
-- =============================================================================
-- S5-T1: Add normalized_name generated columns to clients, sites, staff
-- S5-T2: SKIP — duration_minutes already exists on time_entries as regular column
-- S5-T3: Trigger normalize_name_fields() on INSERT/UPDATE for 6 tables
-- S5-T4: Trigger auto_set_tenant_id() on INSERT for 6 critical tables
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S5-T1: Add normalized_name generated columns
-- Provides consistent lowercase/trimmed name for uniqueness checks and search.
-- ---------------------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS normalized_name TEXT
  GENERATED ALWAYS AS (lower(trim(name))) STORED;

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS normalized_name TEXT
  GENERATED ALWAYS AS (lower(trim(name))) STORED;

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS normalized_name TEXT
  GENERATED ALWAYS AS (lower(trim(full_name))) STORED;

-- ---------------------------------------------------------------------------
-- S5-T2: duration_minutes on time_entries
-- VERIFIED: Column already exists as a regular INT column (populated by app code).
-- No action needed — SKIP.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- S5-T3: Trigger normalize_name_fields() on INSERT/UPDATE
-- Trims whitespace and normalizes name fields before storage.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_name_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim leading/trailing whitespace from name fields
  IF TG_TABLE_NAME = 'clients' THEN
    NEW.name := trim(NEW.name);
  ELSIF TG_TABLE_NAME = 'sites' THEN
    NEW.name := trim(NEW.name);
  ELSIF TG_TABLE_NAME = 'staff' THEN
    NEW.full_name := trim(NEW.full_name);
    IF NEW.first_name IS NOT NULL THEN
      NEW.first_name := trim(NEW.first_name);
    END IF;
    IF NEW.last_name IS NOT NULL THEN
      NEW.last_name := trim(NEW.last_name);
    END IF;
  ELSIF TG_TABLE_NAME = 'contacts' THEN
    IF NEW.full_name IS NOT NULL THEN
      NEW.full_name := trim(NEW.full_name);
    END IF;
  ELSIF TG_TABLE_NAME = 'services' THEN
    NEW.name := trim(NEW.name);
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    NEW.name := trim(NEW.name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Apply to 6 tables
CREATE TRIGGER trg_normalize_name_clients
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

CREATE TRIGGER trg_normalize_name_sites
  BEFORE INSERT OR UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

CREATE TRIGGER trg_normalize_name_staff
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

CREATE TRIGGER trg_normalize_name_contacts
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

CREATE TRIGGER trg_normalize_name_services
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

CREATE TRIGGER trg_normalize_name_tasks
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION normalize_name_fields();

-- ---------------------------------------------------------------------------
-- S5-T4: Trigger auto_set_tenant_id() on INSERT
-- Automatically sets tenant_id from JWT claims if not provided.
-- Prevents orphan rows from missing tenant_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  jwt_tenant_id UUID;
BEGIN
  -- Only act if tenant_id is NULL
  IF NEW.tenant_id IS NULL THEN
    jwt_tenant_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid;
    IF jwt_tenant_id IS NOT NULL THEN
      NEW.tenant_id := jwt_tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Apply to 6 critical tables
CREATE TRIGGER trg_auto_tenant_clients
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER trg_auto_tenant_sites
  BEFORE INSERT ON sites
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER trg_auto_tenant_staff
  BEFORE INSERT ON staff
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER trg_auto_tenant_site_jobs
  BEFORE INSERT ON site_jobs
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER trg_auto_tenant_work_tickets
  BEFORE INSERT ON work_tickets
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER trg_auto_tenant_lookups
  BEFORE INSERT ON lookups
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

COMMIT;
