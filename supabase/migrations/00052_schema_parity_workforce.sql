-- ==========================================================================
-- 00052_schema_parity_workforce.sql
-- P1 Schema Parity: Payroll + attendance tables
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. staff_payroll — Pay configuration per staff member
-- ---------------------------------------------------------------------------
CREATE TABLE staff_payroll (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  staff_id      UUID NOT NULL REFERENCES staff(id),
  pay_type      TEXT NOT NULL DEFAULT 'HOURLY'
                CHECK (pay_type IN ('HOURLY','SALARY','PER_JOB','CONTRACT')),
  base_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_rate NUMERIC(10,2),
  holiday_rate  NUMERIC(10,2),
  currency      TEXT NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  tax_filing_status TEXT,
  exemptions    INTEGER,
  direct_deposit BOOLEAN NOT NULL DEFAULT FALSE,
  bank_routing  TEXT,
  bank_account  TEXT,
  ssn_encrypted TEXT,
  notes         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid()
);

-- ---------------------------------------------------------------------------
-- 2. staff_attendance — Daily attendance records
-- ---------------------------------------------------------------------------
CREATE TABLE staff_attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  staff_id      UUID NOT NULL REFERENCES staff(id),
  attendance_date DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PRESENT'
                CHECK (status IN ('PRESENT','ABSENT','LATE','EXCUSED','HALF_DAY','HOLIDAY','PTO')),
  clock_in      TIMESTAMPTZ,
  clock_out     TIMESTAMPTZ,
  hours_worked  NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  site_id       UUID REFERENCES sites(id),
  job_id        UUID REFERENCES site_jobs(id),
  notes         TEXT,
  approved_by   UUID REFERENCES staff(id),
  approved_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (staff_id, attendance_date)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX idx_staff_payroll_tenant     ON staff_payroll(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_payroll_staff      ON staff_payroll(staff_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_payroll_effective  ON staff_payroll(staff_id, effective_date DESC) WHERE archived_at IS NULL;

CREATE INDEX idx_staff_attendance_tenant  ON staff_attendance(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_attendance_staff   ON staff_attendance(staff_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_attendance_date    ON staff_attendance(attendance_date DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_attendance_status  ON staff_attendance(status) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_attendance_site    ON staff_attendance(site_id) WHERE archived_at IS NULL AND site_id IS NOT NULL;

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================
CREATE TRIGGER trg_staff_payroll_updated_at     BEFORE UPDATE ON staff_payroll     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_payroll_etag           BEFORE UPDATE ON staff_payroll     FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_staff_attendance_updated_at  BEFORE UPDATE ON staff_attendance  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_attendance_etag        BEFORE UPDATE ON staff_attendance  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- ===========================================================================
-- HARD DELETE PREVENTION
-- ===========================================================================
CREATE TRIGGER no_hard_delete BEFORE DELETE ON staff_payroll     FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON staff_attendance  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

-- staff_payroll: owner/admin only (sensitive financial data)
ALTER TABLE staff_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_payroll_select ON staff_payroll
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
  );
CREATE POLICY staff_payroll_self_select ON staff_payroll
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );
CREATE POLICY staff_payroll_insert ON staff_payroll
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
  );
CREATE POLICY staff_payroll_update ON staff_payroll
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
  );

-- staff_attendance: managers + admins can manage, staff can view own
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_attendance_select ON staff_attendance
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY staff_attendance_insert ON staff_attendance
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
  );
CREATE POLICY staff_attendance_update ON staff_attendance
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
  );

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
