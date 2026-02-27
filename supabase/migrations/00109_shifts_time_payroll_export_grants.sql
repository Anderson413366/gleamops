BEGIN;

GRANT SELECT, INSERT, UPDATE ON TABLE public.payroll_export_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payroll_export_mapping_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payroll_export_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payroll_export_items TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
