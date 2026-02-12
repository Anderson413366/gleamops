-- =================================================================
-- RLS policies for foundation tables
-- =================================================================

-- Tenants: members can read their own tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants
FOR SELECT USING (
  id = current_tenant_id()
);

CREATE POLICY tenants_update ON tenants
FOR UPDATE USING (
  id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
);

-- Tenant memberships: read own tenant, admin writes
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_memberships_select ON tenant_memberships
FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_memberships_insert ON tenant_memberships
FOR INSERT WITH CHECK (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
);

CREATE POLICY tenant_memberships_update ON tenant_memberships
FOR UPDATE USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
);

-- Lookups: all members read, admin writes
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY lookups_select ON lookups
FOR SELECT USING (
  tenant_id IS NULL  -- global lookups
  OR tenant_id = current_tenant_id()
);

CREATE POLICY lookups_insert ON lookups
FOR INSERT WITH CHECK (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

CREATE POLICY lookups_update ON lookups
FOR UPDATE USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

-- Status transitions: all read, admin writes
ALTER TABLE status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY status_transitions_select ON status_transitions
FOR SELECT USING (
  tenant_id IS NULL OR tenant_id = current_tenant_id()
);

CREATE POLICY status_transitions_write ON status_transitions
FOR ALL USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN'])
);

-- System sequences: admin only
ALTER TABLE system_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_sequences_all ON system_sequences
FOR ALL USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

-- Audit events: read-only for tenant members
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select ON audit_events
FOR SELECT USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

-- Audit events insert bypasses RLS (uses service role or SECURITY DEFINER function)

-- Notifications: user-only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
FOR SELECT USING (
  tenant_id = current_tenant_id()
  AND user_id = auth.uid()
);

CREATE POLICY notifications_update ON notifications
FOR UPDATE USING (
  tenant_id = current_tenant_id()
  AND user_id = auth.uid()
);

-- Files: tenant isolation
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY files_select ON files
FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY files_insert ON files
FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY files_update ON files
FOR UPDATE USING (
  tenant_id = current_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
);
