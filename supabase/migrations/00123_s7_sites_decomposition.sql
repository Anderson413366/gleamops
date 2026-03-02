-- =============================================================================
-- Migration 00123: Sprint 7 — Sites Table Decomposition
-- =============================================================================
-- S7-T1: Create site_access_details table + RLS + triggers + backfill
-- S7-T2: Create site_compliance table + RLS + triggers + backfill
-- S7-T3: Create v_sites_full backward-compatible view (supplementary, not alias)
-- Columns NOT dropped from sites in this sprint.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S7-T1: site_access_details — extracted from sites access/entry columns
-- ---------------------------------------------------------------------------
CREATE TABLE site_access_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  alarm_code TEXT,
  alarm_system TEXT,
  alarm_company TEXT,
  entry_instructions TEXT,
  parking_instructions TEXT,
  security_protocol TEXT,
  weekend_access BOOLEAN DEFAULT false,
  earliest_start_time TIME,
  latest_start_time TIME,
  business_hours_start TIME,
  business_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (site_id)
);

ALTER TABLE site_access_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON site_access_details
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON site_access_details FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_update" ON site_access_details FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_delete" ON site_access_details FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER trg_site_access_details_updated_at
  BEFORE UPDATE ON site_access_details
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_access_details_etag
  BEFORE UPDATE ON site_access_details
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- Backfill from sites
INSERT INTO site_access_details (tenant_id, site_id, alarm_code, alarm_system, alarm_company,
  entry_instructions, parking_instructions, security_protocol, weekend_access,
  earliest_start_time, latest_start_time, business_hours_start, business_hours_end)
SELECT
  s.tenant_id, s.id, s.alarm_code, s.alarm_system, s.alarm_company,
  s.entry_instructions, s.parking_instructions, s.security_protocol, s.weekend_access,
  s.earliest_start_time, s.latest_start_time, s.business_hours_start, s.business_hours_end
FROM sites s
WHERE s.alarm_code IS NOT NULL
   OR s.alarm_system IS NOT NULL
   OR s.entry_instructions IS NOT NULL
   OR s.parking_instructions IS NOT NULL
   OR s.security_protocol IS NOT NULL
   OR s.weekend_access IS NOT NULL
   OR s.earliest_start_time IS NOT NULL
ON CONFLICT (site_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- S7-T2: site_compliance — extracted from sites compliance/safety columns
-- ---------------------------------------------------------------------------
CREATE TABLE site_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  risk_level TEXT,
  priority_level TEXT,
  osha_compliance_required BOOLEAN DEFAULT false,
  background_check_required BOOLEAN DEFAULT false,
  last_inspection_date DATE,
  next_inspection_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (site_id)
);

ALTER TABLE site_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON site_compliance
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON site_compliance FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_update" ON site_compliance FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_delete" ON site_compliance FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER trg_site_compliance_updated_at
  BEFORE UPDATE ON site_compliance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_compliance_etag
  BEFORE UPDATE ON site_compliance
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- Backfill from sites
INSERT INTO site_compliance (tenant_id, site_id, risk_level, priority_level,
  osha_compliance_required, background_check_required, last_inspection_date, next_inspection_date)
SELECT
  s.tenant_id, s.id, s.risk_level, s.priority_level,
  COALESCE(s.osha_compliance_required, false), COALESCE(s.background_check_required, false),
  s.last_inspection_date, s.next_inspection_date
FROM sites s
WHERE s.risk_level IS NOT NULL
   OR s.priority_level IS NOT NULL
   OR s.osha_compliance_required IS NOT NULL
   OR s.background_check_required IS NOT NULL
   OR s.last_inspection_date IS NOT NULL
   OR s.next_inspection_date IS NOT NULL
ON CONFLICT (site_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- S7-T3: v_sites_full — backward-compatible supplementary view
-- NOTE: This is NOT an alias view on sites. It joins the sub-tables
-- to provide a single read surface for consumers not yet migrated.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sites_full AS
SELECT
  s.*,
  -- Access details
  sad.alarm_system AS access_alarm_system,
  sad.alarm_company AS access_alarm_company,
  sad.entry_instructions AS access_entry_instructions,
  sad.parking_instructions AS access_parking_instructions,
  sad.security_protocol AS access_security_protocol,
  sad.weekend_access AS access_weekend_access,
  sad.earliest_start_time AS access_earliest_start_time,
  sad.latest_start_time AS access_latest_start_time,
  sad.business_hours_start AS access_business_hours_start,
  sad.business_hours_end AS access_business_hours_end,
  -- Compliance
  sc.risk_level AS compliance_risk_level,
  sc.priority_level AS compliance_priority_level,
  sc.osha_compliance_required AS compliance_osha_required,
  sc.background_check_required AS compliance_background_check,
  sc.last_inspection_date AS compliance_last_inspection,
  sc.next_inspection_date AS compliance_next_inspection
FROM sites s
LEFT JOIN site_access_details sad ON sad.site_id = s.id
LEFT JOIN site_compliance sc ON sc.site_id = s.id;

COMMIT;
