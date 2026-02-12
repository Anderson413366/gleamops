-- =================================================================
-- GleamOps Foundation Migration
-- Sprint 0: Tenants, roles, helpers, lookups, audit, sequences
-- =================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================================================
-- TENANTS
-- =================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT UNIQUE NOT NULL CHECK (tenant_code ~ '^TNT-[0-9]{4,}$'),
  name TEXT NOT NULL,
  default_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================================================
-- TENANT MEMBERSHIPS (links auth.users → tenant + role)
-- =================================================================
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,  -- references auth.users(id)
  role_code TEXT NOT NULL CHECK (role_code IN (
    'OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR', 'SALES'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, user_id)
);

-- =================================================================
-- LOOKUPS (no hardcoded enums)
-- =================================================================
CREATE TABLE lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),  -- NULL = global/system
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  UNIQUE (tenant_id, category, code)
);

-- =================================================================
-- STATUS TRANSITIONS (state machine rules)
-- =================================================================
CREATE TABLE status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT '{}',

  UNIQUE (tenant_id, entity_type, from_status, to_status)
);

-- =================================================================
-- SYSTEM SEQUENCES (for next_code generation)
-- =================================================================
CREATE TABLE system_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  prefix TEXT NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,

  UNIQUE (tenant_id, prefix)
);

-- =================================================================
-- AUDIT EVENTS
-- =================================================================
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  entity_code TEXT NULL,
  action TEXT NOT NULL,
  before JSONB NULL,
  after JSONB NULL,
  actor_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_tenant_entity ON audit_events(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_events_created ON audit_events(tenant_id, created_at DESC);

-- =================================================================
-- NOTIFICATIONS
-- =================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, read_at NULLS FIRST);

-- =================================================================
-- FILES (storage metadata)
-- =================================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  file_code TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_files_entity ON files(tenant_id, entity_type, entity_id) WHERE archived_at IS NULL;
