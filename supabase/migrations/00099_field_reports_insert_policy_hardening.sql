BEGIN;

DROP POLICY IF EXISTS field_reports_insert ON public.field_reports;
CREATE POLICY field_reports_insert
  ON public.field_reports
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
      OR (
        has_any_role(auth.uid(), ARRAY['CLEANER', 'INSPECTOR'])
        AND reported_by = (
          SELECT s.id
          FROM public.staff s
          WHERE s.user_id = auth.uid()
            AND s.archived_at IS NULL
          LIMIT 1
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
