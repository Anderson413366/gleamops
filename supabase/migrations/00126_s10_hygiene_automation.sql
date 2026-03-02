-- =============================================================================
-- Migration 00126: Sprint 10 — Data Hygiene Automation
-- =============================================================================
-- S10-T1: Create data_hygiene_issues table + RLS
-- S10-T2: Create run_data_hygiene_scan(p_tenant_id) RPC function
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S10-T1: data_hygiene_issues table
-- Stores results from automated data quality scans.
-- ---------------------------------------------------------------------------
CREATE TABLE data_hygiene_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_code TEXT,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  description TEXT NOT NULL,
  suggested_fix TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  scan_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_hygiene_severity CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  CONSTRAINT chk_hygiene_entity_type CHECK (entity_type IN (
    'client', 'site', 'staff', 'site_job', 'work_ticket', 'service', 'lookup', 'contact'
  ))
);

ALTER TABLE data_hygiene_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON data_hygiene_issues
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON data_hygiene_issues FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE INDEX idx_hygiene_tenant_unresolved
  ON data_hygiene_issues (tenant_id, entity_type, severity)
  WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- S10-T2: run_data_hygiene_scan(p_tenant_id) RPC function
-- Scans for common data quality issues and inserts findings.
-- Returns the count of issues found.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION run_data_hygiene_scan(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_rows INTEGER;
  v_run_at TIMESTAMPTZ := now();
BEGIN
  -- Clear previous unresolved issues for this tenant (fresh scan)
  DELETE FROM data_hygiene_issues
  WHERE tenant_id = p_tenant_id AND resolved_at IS NULL;

  -- 1. Clients without any sites
  INSERT INTO data_hygiene_issues (tenant_id, entity_type, entity_id, entity_code, issue_type, severity, description, suggested_fix, scan_run_at)
  SELECT
    c.tenant_id, 'client', c.id, c.client_code,
    'NO_SITES', 'WARNING',
    'Client "' || c.name || '" has no active sites.',
    'Add at least one site or archive the client.',
    v_run_at
  FROM clients c
  WHERE c.tenant_id = p_tenant_id
    AND c.archived_at IS NULL
    AND c.status = 'ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM sites s WHERE s.client_id = c.id AND s.archived_at IS NULL);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 2. Sites without any active jobs
  INSERT INTO data_hygiene_issues (tenant_id, entity_type, entity_id, entity_code, issue_type, severity, description, suggested_fix, scan_run_at)
  SELECT
    s.tenant_id, 'site', s.id, s.site_code,
    'NO_ACTIVE_JOBS', 'INFO',
    'Site "' || s.name || '" has no active service plans.',
    'Create a service plan or verify site is still active.',
    v_run_at
  FROM sites s
  WHERE s.tenant_id = p_tenant_id
    AND s.archived_at IS NULL
    AND COALESCE(s.status, 'ACTIVE') = 'ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM site_jobs sj WHERE sj.site_id = s.id AND sj.status = 'ACTIVE' AND sj.archived_at IS NULL);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 3. Staff without email
  INSERT INTO data_hygiene_issues (tenant_id, entity_type, entity_id, entity_code, issue_type, severity, description, suggested_fix, scan_run_at)
  SELECT
    st.tenant_id, 'staff', st.id, st.staff_code,
    'MISSING_EMAIL', 'WARNING',
    'Staff "' || st.full_name || '" has no email address.',
    'Add an email address for communication.',
    v_run_at
  FROM staff st
  WHERE st.tenant_id = p_tenant_id
    AND st.archived_at IS NULL
    AND st.status IN ('ACTIVE', 'ON_LEAVE')
    AND st.email IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 4. Active jobs with past end_date
  INSERT INTO data_hygiene_issues (tenant_id, entity_type, entity_id, entity_code, issue_type, severity, description, suggested_fix, scan_run_at)
  SELECT
    sj.tenant_id, 'site_job', sj.id, sj.job_code,
    'EXPIRED_JOB', 'WARNING',
    'Job "' || sj.job_code || '" is ACTIVE but end_date (' || sj.end_date::text || ') is in the past.',
    'Complete or cancel the job, or extend the end date.',
    v_run_at
  FROM site_jobs sj
  WHERE sj.tenant_id = p_tenant_id
    AND sj.archived_at IS NULL
    AND sj.status = 'ACTIVE'
    AND sj.end_date IS NOT NULL
    AND sj.end_date < CURRENT_DATE;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 5. Staff with missing pay_rate
  INSERT INTO data_hygiene_issues (tenant_id, entity_type, entity_id, entity_code, issue_type, severity, description, suggested_fix, scan_run_at)
  SELECT
    st.tenant_id, 'staff', st.id, st.staff_code,
    'MISSING_PAY_RATE', 'ERROR',
    'Staff "' || st.full_name || '" has no pay rate set.',
    'Set the pay rate for payroll calculations.',
    v_run_at
  FROM staff st
  WHERE st.tenant_id = p_tenant_id
    AND st.archived_at IS NULL
    AND st.status = 'ACTIVE'
    AND st.pay_rate IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

COMMIT;
