-- Shift Tags configuration table (Scheduling Parity Initiative)
CREATE TABLE IF NOT EXISTS shift_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT 'blue',
  description     TEXT NOT NULL DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  archived_by     UUID,
  archive_reason  TEXT,
  version_etag    UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, name)
);

-- Standard triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shift_tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON shift_tags
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON shift_tags
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

CREATE TRIGGER auto_set_tenant_id BEFORE INSERT ON shift_tags
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- RLS
ALTER TABLE shift_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_tags_tenant_isolation ON shift_tags
  USING (tenant_id = current_tenant_id());

CREATE POLICY shift_tags_insert ON shift_tags
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- Seed sample data for tenant A
INSERT INTO shift_tags (tenant_id, name, color, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Training', 'blue', 'Shifts that include training activities'),
  ('a0000000-0000-0000-0000-000000000001', 'Deep Clean', 'green', 'Deep cleaning shift rotation'),
  ('a0000000-0000-0000-0000-000000000001', 'Emergency Cover', 'red', 'Emergency coverage shifts'),
  ('a0000000-0000-0000-0000-000000000001', 'Weekend Premium', 'purple', 'Weekend shifts with premium pay');
