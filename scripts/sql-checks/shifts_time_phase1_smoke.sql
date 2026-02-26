-- ============================================================================
-- Shifts & Time Phase 1 smoke checks
-- ============================================================================
-- Usage:
--   psql "$DATABASE_URL" -f scripts/sql-checks/shifts_time_phase1_smoke.sql
--
-- This script validates critical security/correctness invariants after running
-- migrations 00089..00096.
-- ============================================================================

\echo 'Shifts & Time smoke: validating table presence and RLS invariants...'

DO $$
DECLARE
  v_missing TEXT[];
  v_required_tables TEXT[] := ARRAY[
    'routes',
    'route_stops',
    'travel_segments',
    'callout_events',
    'coverage_offers',
    'on_call_pool',
    'site_books',
    'site_book_checklist_items',
    'payroll_export_mappings',
    'payroll_export_mapping_fields',
    'payroll_export_runs',
    'payroll_export_items',
    'attendance_policies',
    'holiday_calendar'
  ];
BEGIN
  SELECT ARRAY_AGG(t)
  INTO v_missing
  FROM unnest(v_required_tables) t
  WHERE to_regclass('public.' || t) IS NULL;

  IF COALESCE(array_length(v_missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Missing required Shifts & Time tables: %', array_to_string(v_missing, ', ');
  END IF;
END $$;

DO $$
DECLARE
  v_no_rls TEXT[];
BEGIN
  SELECT ARRAY_AGG(c.relname)
  INTO v_no_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(ARRAY[
      'routes','route_stops','travel_segments','callout_events','coverage_offers','on_call_pool',
      'site_books','site_book_checklist_items','payroll_export_mappings','payroll_export_mapping_fields',
      'payroll_export_runs','payroll_export_items','attendance_policies','holiday_calendar'
    ])
    AND c.relrowsecurity = false;

  IF COALESCE(array_length(v_no_rls, 1), 0) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled for tables: %', array_to_string(v_no_rls, ', ');
  END IF;
END $$;

DO $$
DECLARE
  v_bad_policies TEXT[];
BEGIN
  SELECT ARRAY_AGG(t.tbl)
  INTO v_bad_policies
  FROM (
    SELECT t.tbl,
           pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
    FROM unnest(ARRAY[
      'routes','route_stops','travel_segments','callout_events','coverage_offers','on_call_pool',
      'site_books','site_book_checklist_items','payroll_export_mappings','payroll_export_mapping_fields',
      'payroll_export_runs','payroll_export_items','attendance_policies','holiday_calendar'
    ]) AS t(tbl)
    LEFT JOIN pg_class c
      ON c.relname = t.tbl
    LEFT JOIN pg_namespace n
      ON n.oid = c.relnamespace
     AND n.nspname = 'public'
    LEFT JOIN pg_policy p
      ON p.polrelid = c.oid
     AND p.polname = t.tbl || '_tenant_update'
  ) t
  WHERE t.with_check_expr IS NULL
     OR t.with_check_expr NOT ILIKE '%tenant_id = current_tenant_id%';

  IF COALESCE(array_length(v_bad_policies, 1), 0) > 0 THEN
    RAISE EXCEPTION 'UPDATE policy missing tenant WITH CHECK for: %', array_to_string(v_bad_policies, ', ');
  END IF;
END $$;

\echo 'Shifts & Time smoke: validating RPC execute grants...'

DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.fn_offer_coverage(uuid, uuid, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing execute grant: fn_offer_coverage for authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.fn_accept_coverage(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing execute grant: fn_accept_coverage for authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.fn_finalize_payroll_export(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing execute grant: fn_finalize_payroll_export for authenticated';
  END IF;
END $$;

\echo 'Shifts & Time smoke checks passed.'
