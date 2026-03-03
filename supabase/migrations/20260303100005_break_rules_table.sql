-- Break Rules configuration table (Scheduling Parity Initiative)
CREATE TABLE IF NOT EXISTS break_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to      TEXT NOT NULL DEFAULT 'All Positions',
  min_shift_hours NUMERIC(4,1) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  archived_by     UUID,
  archive_reason  TEXT,
  version_etag    UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Standard triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON break_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON break_rules
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON break_rules
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER auto_set_tenant_id BEFORE INSERT ON break_rules
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- RLS
ALTER TABLE break_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY break_rules_tenant_isolation ON break_rules
  USING (tenant_id = current_tenant_id());

CREATE POLICY break_rules_insert ON break_rules
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- Seed sample data for tenant A
INSERT INTO break_rules (tenant_id, name, duration_minutes, is_paid, applies_to, min_shift_hours) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Standard Break', 30, false, 'All Positions', 6),
  ('a0000000-0000-0000-0000-000000000001', 'Short Break', 15, true, 'All Positions', 4),
  ('a0000000-0000-0000-0000-000000000001', 'Extended Lunch', 60, false, 'Day Porter', 8);
