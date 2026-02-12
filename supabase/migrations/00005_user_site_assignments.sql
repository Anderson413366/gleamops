-- =================================================================
-- User site assignments (site-scoped visibility)
-- =================================================================

CREATE TABLE user_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  site_id UUID NOT NULL,  -- will reference sites(id) after CRM migration
  role_at_site TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, user_id, site_id)
);

CREATE INDEX idx_user_site_assignments_active
  ON user_site_assignments(tenant_id, user_id, site_id) WHERE archived_at IS NULL;

-- Triggers
CREATE TRIGGER trg_user_site_assignments_updated_at
  BEFORE UPDATE ON user_site_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_site_assignments_etag
  BEFORE UPDATE ON user_site_assignments FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- RLS
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY usa_select ON user_site_assignments
FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY usa_write ON user_site_assignments
FOR ALL USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

-- Check if user can access a site (assigned or admin/manager)
-- Deferred from 00002 because this table must exist first
CREATE OR REPLACE FUNCTION user_can_access_site(check_user_id UUID, check_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT (
    has_any_role(check_user_id, ARRAY['OWNER_ADMIN', 'MANAGER'])
    OR EXISTS (
      SELECT 1 FROM user_site_assignments
      WHERE tenant_id = current_tenant_id()
        AND user_id = check_user_id
        AND site_id = check_site_id
        AND archived_at IS NULL
    )
  );
$$;
