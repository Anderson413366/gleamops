-- =============================================================================
-- Migration 00128: Sprint 12 — Site Jobs Financial Extraction
-- =============================================================================
-- S12-T1: Create site_job_financials table + RLS + triggers + backfill
-- Financial fields extracted from site_jobs for separation of concerns.
-- Columns NOT dropped from site_jobs yet.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S12-T1: site_job_financials table
-- ---------------------------------------------------------------------------
CREATE TABLE site_job_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id) ON DELETE CASCADE,
  billing_amount NUMERIC(12,2),
  billing_uom TEXT,
  estimated_hours_per_service NUMERIC(10,2),
  estimated_hours_per_month NUMERIC(10,2),
  invoice_description TEXT,
  quality_score NUMERIC(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (site_job_id)
);

ALTER TABLE site_job_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON site_job_financials
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON site_job_financials FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_update" ON site_job_financials FOR UPDATE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_delete" ON site_job_financials FOR DELETE
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER trg_site_job_financials_updated_at
  BEFORE UPDATE ON site_job_financials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_job_financials_etag
  BEFORE UPDATE ON site_job_financials
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- Backfill from site_jobs
INSERT INTO site_job_financials (
  tenant_id, site_job_id, billing_amount, billing_uom,
  estimated_hours_per_service, estimated_hours_per_month,
  invoice_description, quality_score
)
SELECT
  sj.tenant_id, sj.id, sj.billing_amount, sj.billing_uom,
  sj.estimated_hours_per_service, sj.estimated_hours_per_month,
  sj.invoice_description, sj.quality_score
FROM site_jobs sj
WHERE sj.billing_amount IS NOT NULL
   OR sj.billing_uom IS NOT NULL
   OR sj.estimated_hours_per_service IS NOT NULL
   OR sj.estimated_hours_per_month IS NOT NULL
   OR sj.invoice_description IS NOT NULL
   OR sj.quality_score IS NOT NULL
ON CONFLICT (site_job_id) DO NOTHING;

CREATE INDEX idx_site_job_financials_tenant
  ON site_job_financials (tenant_id)
  WHERE archived_at IS NULL;

COMMIT;
