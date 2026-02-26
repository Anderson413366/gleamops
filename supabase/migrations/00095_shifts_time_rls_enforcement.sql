BEGIN;

-- ============================================================================
-- 00095_shifts_time_rls_enforcement.sql
-- Consolidated RLS + standard trigger enforcement for Shifts & Time tables.
-- Idempotent, safe to re-run.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
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
  ])
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = tbl || '_tenant_select'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I_tenant_select ON public.%I FOR SELECT USING (tenant_id = current_tenant_id())',
        tbl,
        tbl
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = tbl || '_tenant_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I_tenant_insert ON public.%I FOR INSERT WITH CHECK (tenant_id = current_tenant_id())',
        tbl,
        tbl
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = tbl || '_tenant_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I_tenant_update ON public.%I FOR UPDATE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
        tbl,
        tbl
      );
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl,
      tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_etag ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_etag BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_version_etag()',
      tbl,
      tbl
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
