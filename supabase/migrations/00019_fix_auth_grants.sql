-- Fix: Grant INSERT on tenant_memberships to supabase_auth_admin
-- so the auto_assign_dev_tenant trigger can create memberships on user signup.
GRANT INSERT ON public.tenant_memberships TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
