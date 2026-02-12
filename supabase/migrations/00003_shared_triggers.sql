-- =================================================================
-- Shared triggers: updated_at, version_etag
-- Attach to every business table.
-- =================================================================

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-roll version_etag on row change (optimistic locking)
CREATE OR REPLACE FUNCTION set_version_etag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version_etag = gen_random_uuid();
  RETURN NEW;
END;
$$;

-- Apply triggers to foundation tables
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenant_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_memberships_etag
  BEFORE UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_files_updated_at
  BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_files_etag
  BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION set_version_etag();
