-- =================================================================
-- Migration 00045: New Module Tables
--
-- Creates 9 new tables for safety/compliance, fleet, access control,
-- and audit trail features. All follow StandardColumns pattern.
--
-- Tables:
--   1. staff_certifications
--   2. pay_rate_history
--   3. vehicle_checkouts
--   4. key_event_log
--   5. safety_documents
--   6. training_courses
--   7. training_completions
--   8. user_team_memberships
--   9. user_access_grants
-- =================================================================

BEGIN;

-- =====================================================================
-- 1. staff_certifications — Structured cert tracking
-- Replaces free-text certifications column on staff
-- =====================================================================

CREATE TABLE staff_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL CHECK (length(trim(certification_name)) >= 1),
  issuing_authority TEXT,
  certification_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING')),
  document_file_id UUID REFERENCES files(id),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_staff_certs_tenant ON staff_certifications(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_certs_staff ON staff_certifications(staff_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_certs_expiry ON staff_certifications(expiry_date) WHERE archived_at IS NULL AND status = 'ACTIVE';


-- =====================================================================
-- 2. pay_rate_history — Pay change audit trail
-- =====================================================================

CREATE TABLE pay_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  previous_rate NUMERIC(8,2),
  new_rate NUMERIC(8,2) NOT NULL CHECK (new_rate >= 0),
  previous_pay_type TEXT,
  new_pay_type TEXT,
  change_reason TEXT,
  changed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_pay_rate_history_tenant ON pay_rate_history(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_pay_rate_history_staff ON pay_rate_history(staff_id, effective_date DESC) WHERE archived_at IS NULL;


-- =====================================================================
-- 3. vehicle_checkouts — Fleet checkout/return per ticket
-- =====================================================================

CREATE TABLE vehicle_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  ticket_id UUID REFERENCES work_tickets(id),
  staff_id UUID REFERENCES staff(id),
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  checkout_odometer INTEGER,
  return_odometer INTEGER,
  fuel_level_out TEXT,
  fuel_level_in TEXT,
  condition_notes TEXT,
  status TEXT NOT NULL DEFAULT 'OUT' CHECK (status IN ('OUT', 'RETURNED', 'OVERDUE')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_vehicle_checkouts_tenant ON vehicle_checkouts(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_vehicle_checkouts_vehicle ON vehicle_checkouts(vehicle_id) WHERE archived_at IS NULL AND status = 'OUT';


-- =====================================================================
-- 4. key_event_log — Key assignment audit trail
-- =====================================================================

CREATE TABLE key_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key_id UUID NOT NULL REFERENCES key_inventory(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('ASSIGNED', 'RETURNED', 'LOST', 'REPLACED', 'DEACTIVATED')),
  staff_id UUID REFERENCES staff(id),
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_key_event_log_tenant ON key_event_log(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_key_event_log_key ON key_event_log(key_id, event_date DESC) WHERE archived_at IS NULL;


-- =====================================================================
-- 5. safety_documents — SDS + safety docs with expiry tracking
-- =====================================================================

CREATE TABLE safety_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_code TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) >= 1),
  document_type TEXT NOT NULL CHECK (document_type IN ('SDS', 'SAFETY_PLAN', 'PROCEDURE', 'REGULATION', 'TRAINING_MATERIAL', 'OTHER')),
  category TEXT,
  file_id UUID REFERENCES files(id),
  effective_date DATE,
  review_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'EXPIRED', 'SUPERSEDED', 'DRAFT')),
  applies_to_sites BOOLEAN NOT NULL DEFAULT false,
  site_ids UUID[],  -- Which sites this doc applies to (null = all)
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, document_code)
);

CREATE INDEX idx_safety_documents_tenant ON safety_documents(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_safety_documents_expiry ON safety_documents(expiry_date) WHERE archived_at IS NULL AND status = 'ACTIVE';
CREATE INDEX idx_safety_documents_review ON safety_documents(review_date) WHERE archived_at IS NULL AND status = 'ACTIVE';


-- =====================================================================
-- 6. training_courses — Course catalog with recurrence
-- =====================================================================

CREATE TABLE training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  course_code TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 1),
  description TEXT,
  category TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  recurrence_months INTEGER, -- NULL = one-time, else recur every N months
  duration_hours NUMERIC(5,1),
  provider TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, course_code)
);

CREATE INDEX idx_training_courses_tenant ON training_courses(tenant_id) WHERE archived_at IS NULL;


-- =====================================================================
-- 7. training_completions — Staff completion records
-- =====================================================================

CREATE TABLE training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  course_id UUID NOT NULL REFERENCES training_courses(id),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  expiry_date DATE, -- computed from course recurrence_months
  score NUMERIC(5,1),
  passed BOOLEAN,
  certificate_file_id UUID REFERENCES files(id),
  instructor TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_training_completions_tenant ON training_completions(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_training_completions_staff ON training_completions(staff_id, completed_date DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_training_completions_expiry ON training_completions(expiry_date) WHERE archived_at IS NULL;


-- =====================================================================
-- 8. user_team_memberships — Sub-tenant team grouping
-- =====================================================================

CREATE TABLE user_team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  team_name TEXT NOT NULL CHECK (length(trim(team_name)) >= 1),
  user_id UUID NOT NULL,
  role_in_team TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role_in_team IN ('LEAD', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, team_name, user_id)
);

CREATE INDEX idx_team_memberships_tenant ON user_team_memberships(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_team_memberships_user ON user_team_memberships(user_id) WHERE archived_at IS NULL AND left_at IS NULL;


-- =====================================================================
-- 9. user_access_grants — Entity-level permission grants
-- =====================================================================

CREATE TABLE user_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'site', 'job', 'team')),
  entity_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'READ' CHECK (permission IN ('READ', 'WRITE', 'ADMIN')),
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, user_id, entity_type, entity_id, permission)
);

CREATE INDEX idx_access_grants_tenant ON user_access_grants(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_access_grants_user ON user_access_grants(user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_access_grants_entity ON user_access_grants(entity_type, entity_id) WHERE archived_at IS NULL;


-- =====================================================================
-- RLS policies — Tenant isolation on all new tables
-- =====================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'staff_certifications', 'pay_rate_history', 'vehicle_checkouts',
    'key_event_log', 'safety_documents', 'training_courses',
    'training_completions', 'user_team_memberships', 'user_access_grants'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY %I_tenant_select ON %I FOR SELECT USING (tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb->>''tenant_id'')::uuid)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_tenant_insert ON %I FOR INSERT WITH CHECK (tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb->>''tenant_id'')::uuid)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_tenant_update ON %I FOR UPDATE USING (tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb->>''tenant_id'')::uuid)',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- =====================================================================
-- Triggers: updated_at + version_etag on all new tables
-- =====================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'staff_certifications', 'pay_rate_history', 'vehicle_checkouts',
    'key_event_log', 'safety_documents', 'training_courses',
    'training_completions', 'user_team_memberships', 'user_access_grants'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_%s_etag BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_version_etag()',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- =====================================================================
-- Seed system_sequences for code generation
-- =====================================================================

INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, p.prefix, 0
FROM tenants t
CROSS JOIN (VALUES ('CRT'), ('SDC'), ('TRC')) AS p(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;


COMMIT;
