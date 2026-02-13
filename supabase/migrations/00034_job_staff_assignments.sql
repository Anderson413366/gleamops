-- ============================================================================
-- Migration 00034: Job Staff Assignments
-- Links staff members to jobs with role and date range.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Create job_staff_assignments table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_staff_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  job_id        UUID NOT NULL REFERENCES site_jobs(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role          TEXT,                   -- e.g., LEAD, HELPER, INSPECTOR
  start_date    DATE,
  end_date      DATE,
  notes         TEXT,
  -- Standard columns
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Unique constraint: one staff per job per tenant (unless archived)
  CONSTRAINT uq_job_staff_assignment UNIQUE (tenant_id, job_id, staff_id)
);

-- ---------------------------------------------------------------------------
-- B. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_job_staff_assignments_job_id
  ON job_staff_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_staff_assignments_staff_id
  ON job_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_staff_assignments_tenant_id
  ON job_staff_assignments(tenant_id);

-- ---------------------------------------------------------------------------
-- C. Triggers (updated_at + version_etag)
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON job_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_version_etag
  BEFORE UPDATE ON job_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- ---------------------------------------------------------------------------
-- D. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE job_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_staff_assignments_select"
  ON job_staff_assignments FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "job_staff_assignments_insert"
  ON job_staff_assignments FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY "job_staff_assignments_update"
  ON job_staff_assignments FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- E. Storage bucket for staff photos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;
