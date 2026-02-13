-- ==========================================================================
-- Migration 00033: User profiles + client-level RBAC
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- user_profiles: per-user settings, display info, preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url   TEXT,
  phone        TEXT,
  preferences  JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles in their tenant
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Users can update their own profile
CREATE POLICY user_profiles_update ON public.user_profiles
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- Admins/Managers can insert profiles for new users
CREATE POLICY user_profiles_insert ON public.user_profiles
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_client_access: limits visibility to specific clients
-- For non-OWNER_ADMIN/MANAGER/SALES roles only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_client_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  client_id    UUID NOT NULL REFERENCES public.clients(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, client_id)
);

ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_client_access_select ON public.user_client_access
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY user_client_access_insert ON public.user_client_access
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

CREATE POLICY user_client_access_delete ON public.user_client_access
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

-- ---------------------------------------------------------------------------
-- user_can_access_client(): helper function
-- OWNER_ADMIN, MANAGER, SALES see all clients.
-- Others need explicit grant in user_client_access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_can_access_client(p_user_id UUID, p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    -- OWNER_ADMIN, MANAGER, SALES always have access
    has_any_role(p_user_id, ARRAY['OWNER_ADMIN','MANAGER','SALES'])
    OR
    -- Others need explicit grant
    EXISTS (
      SELECT 1 FROM public.user_client_access
      WHERE tenant_id = current_tenant_id()
        AND user_id = p_user_id
        AND client_id = p_client_id
    );
$$;
