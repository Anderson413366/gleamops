-- =================================================================
-- Helper functions for RLS and business logic
-- =================================================================

-- Get current tenant_id from JWT claims
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid;
$$;

-- Check if a user has a specific role in the current tenant
CREATE OR REPLACE FUNCTION has_role(check_user_id UUID, check_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = current_tenant_id()
      AND user_id = check_user_id
      AND role_code = check_role
      AND archived_at IS NULL
  );
$$;

-- Check if a user has any of the given roles
CREATE OR REPLACE FUNCTION has_any_role(check_user_id UUID, check_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = current_tenant_id()
      AND user_id = check_user_id
      AND role_code = ANY(check_roles)
      AND archived_at IS NULL
  );
$$;

-- NOTE: user_can_access_site() is created in 00005 after user_site_assignments table

-- Generate next entity code (transaction-safe)
CREATE OR REPLACE FUNCTION next_code(p_tenant_id UUID, p_prefix TEXT, p_padding INT DEFAULT 4)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO system_sequences (tenant_id, prefix, current_value)
  VALUES (p_tenant_id, p_prefix, 1)
  ON CONFLICT (tenant_id, prefix)
  DO UPDATE SET current_value = system_sequences.current_value + 1
  RETURNING current_value INTO v_next;

  RETURN p_prefix || '-' || lpad(v_next::text, p_padding, '0');
END;
$$;

-- Validate status transition
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_from_status TEXT,
  p_to_status TEXT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM status_transitions
    WHERE (tenant_id = p_tenant_id OR tenant_id IS NULL)
      AND entity_type = p_entity_type
      AND from_status = p_from_status
      AND to_status = p_to_status
  );
$$;
