-- =================================================================
-- Custom Access Token Hook
-- Injects tenant_id and role_code into the JWT so RLS can use them.
--
-- Supabase calls this function on every token refresh.
-- It reads from tenant_memberships and adds custom claims.
-- =================================================================

-- The hook function (must match Supabase's expected signature)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  claims JSONB;
  user_id UUID;
  membership RECORD;
BEGIN
  -- Extract current claims
  claims := event -> 'claims';
  user_id := (claims ->> 'sub')::UUID;

  -- Look up the user's tenant membership (first active one)
  SELECT tm.tenant_id, tm.role_code
  INTO membership
  FROM tenant_memberships tm
  WHERE tm.user_id = user_id
    AND tm.archived_at IS NULL
  ORDER BY tm.created_at ASC
  LIMIT 1;

  -- Inject tenant_id and role into claims
  IF membership IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(membership.tenant_id::text));
    claims := jsonb_set(claims, '{role}', to_jsonb(membership.role_code));
  ELSE
    -- No membership found — set null (RLS will block everything)
    claims := jsonb_set(claims, '{tenant_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{role}', '"NONE"'::jsonb);
  END IF;

  -- Return the modified event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for the hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- The hook also needs to read tenant_memberships
GRANT SELECT ON TABLE public.tenant_memberships TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
