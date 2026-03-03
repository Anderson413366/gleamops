-- Fix SECURITY DEFINER views flagged by Supabase linter
-- All 9 views must use security_invoker = on so RLS policies
-- of the querying user are enforced, not the view creator.

ALTER VIEW public.hr_leave_requests SET (security_invoker = on);
ALTER VIEW public.v_staff_roster SET (security_invoker = on);
ALTER VIEW public.daily_routes SET (security_invoker = on);
ALTER VIEW public.checklist_instances SET (security_invoker = on);
ALTER VIEW public.v_active_sites SET (security_invoker = on);
ALTER VIEW public.v_sites_full SET (security_invoker = on);
ALTER VIEW public.employees SET (security_invoker = on);
ALTER VIEW public.checklist_items SET (security_invoker = on);
ALTER VIEW public.v_upcoming_tickets SET (security_invoker = on);
