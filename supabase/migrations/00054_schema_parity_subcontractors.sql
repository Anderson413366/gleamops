-- ==========================================================================
-- 00054_schema_parity_subcontractors.sql
-- P1 Schema Parity: Subcontractor job assignments + compatibility view
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. subcontractor_jobs — Links subcontractors to specific jobs/sites
-- ---------------------------------------------------------------------------
CREATE TABLE subcontractor_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  subcontractor_id  UUID NOT NULL REFERENCES subcontractors(id),
  site_job_id       UUID NOT NULL REFERENCES site_jobs(id),
  site_id           UUID NOT NULL REFERENCES sites(id),
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','COMPLETED','CANCELED','SUSPENDED')),
  start_date        DATE,
  end_date          DATE,
  billing_rate      NUMERIC(10,2),
  billing_type      TEXT DEFAULT 'PER_SERVICE'
                    CHECK (billing_type IN ('HOURLY','PER_SERVICE','FLAT_MONTHLY','PER_SQFT')),
  scope_description TEXT,
  contract_ref      TEXT,
  performance_score NUMERIC(5,2),
  last_service_date DATE,
  notes             TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (subcontractor_id, site_job_id)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX idx_sub_jobs_tenant         ON subcontractor_jobs(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_sub_jobs_subcontractor  ON subcontractor_jobs(subcontractor_id) WHERE archived_at IS NULL;
CREATE INDEX idx_sub_jobs_site_job       ON subcontractor_jobs(site_job_id) WHERE archived_at IS NULL;
CREATE INDEX idx_sub_jobs_site           ON subcontractor_jobs(site_id) WHERE archived_at IS NULL;
CREATE INDEX idx_sub_jobs_status         ON subcontractor_jobs(status) WHERE archived_at IS NULL;

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================
CREATE TRIGGER trg_sub_jobs_updated_at  BEFORE UPDATE ON subcontractor_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sub_jobs_etag        BEFORE UPDATE ON subcontractor_jobs FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- ===========================================================================
-- HARD DELETE PREVENTION
-- ===========================================================================
CREATE TRIGGER no_hard_delete BEFORE DELETE ON subcontractor_jobs FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
ALTER TABLE subcontractor_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY subcontractor_jobs_tenant_select ON subcontractor_jobs
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY subcontractor_jobs_tenant_insert ON subcontractor_jobs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY subcontractor_jobs_tenant_update ON subcontractor_jobs
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- ===========================================================================
-- COMPATIBILITY VIEW: v_subcontractor_job_assignments
-- Maps the new subcontractor_jobs table into a read model that existing
-- subcontractor pages can query without code changes.
-- ===========================================================================
CREATE OR REPLACE VIEW v_subcontractor_job_assignments AS
SELECT
  sj.id,
  sj.tenant_id,
  sj.subcontractor_id,
  sub.subcontractor_code,
  sub.company_name        AS subcontractor_name,
  sj.site_job_id,
  j.job_code,
  j.job_name,
  sj.site_id,
  s.site_code,
  s.name                  AS site_name,
  c.id                    AS client_id,
  c.client_code,
  c.name                  AS client_name,
  sj.status,
  sj.start_date,
  sj.end_date,
  sj.billing_rate,
  sj.billing_type,
  sj.scope_description,
  sj.performance_score,
  sj.last_service_date,
  sj.created_at,
  sj.updated_at
FROM subcontractor_jobs sj
  JOIN subcontractors sub ON sub.id = sj.subcontractor_id
  JOIN site_jobs j        ON j.id  = sj.site_job_id
  JOIN sites s            ON s.id  = sj.site_id
  JOIN clients c          ON c.id  = s.client_id
WHERE sj.archived_at IS NULL;

-- ===========================================================================
-- COMPATIBILITY VIEW: v_site_supply_assignments
-- Normalizes site_supplies into a read model with supply catalog enrichment.
-- Existing site supply pages continue to work with this overlay.
-- ===========================================================================
CREATE OR REPLACE VIEW v_site_supply_assignments AS
SELECT
  ss.id,
  ss.tenant_id,
  ss.site_id,
  s.site_code,
  s.name          AS site_name,
  ss.name         AS supply_name,
  ss.category,
  ss.sds_url,
  ss.notes,
  s.client_id,
  c.client_code,
  c.name          AS client_name,
  ss.created_at,
  ss.updated_at
FROM site_supplies ss
  JOIN sites s   ON s.id = ss.site_id
  JOIN clients c ON c.id = s.client_id
WHERE ss.archived_at IS NULL;

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
