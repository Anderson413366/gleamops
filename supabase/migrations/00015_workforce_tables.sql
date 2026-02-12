-- =================================================================
-- Module E: Workforce — Staff table
-- Must run before conversion_ops (ticket_assignments references staff)
-- =================================================================

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_code TEXT UNIQUE NOT NULL CHECK (staff_code ~ '^STF-[0-9]{4,}$'),
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CLEANER',
  is_subcontractor BOOLEAN NOT NULL DEFAULT false,
  pay_rate NUMERIC(8,2),
  email TEXT,
  phone TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_staff_tenant ON staff(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_staff_user ON staff(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_etag BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_select ON staff FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY staff_insert ON staff FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY staff_update ON staff FOR UPDATE USING (tenant_id = current_tenant_id());

-- Seed sequence prefix
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, 'STF', 0
FROM tenants t
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
