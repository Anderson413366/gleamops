-- =================================================================
-- Fix JWT claims path: read tenant_id from app_metadata
-- Supabase puts app_metadata in JWT automatically.
-- The custom_access_token_hook (if enabled) will override to top-level,
-- but this fallback ensures RLS works without the hook enabled.
-- =================================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    -- First try top-level (set by custom_access_token_hook if enabled)
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    -- Fallback: read from app_metadata (default Supabase JWT structure)
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
  );
$$;

-- Also fix has_role and has_any_role to handle role from app_metadata
-- (These reference tenant_memberships directly so they don't need the JWT role,
--  but let's also add a helper for getting role from JWT)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    -- Top-level role (from custom hook)
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'authenticated'),
    -- Fallback: app_metadata role
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
  );
$$;
