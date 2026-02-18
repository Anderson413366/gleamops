BEGIN;

CREATE TABLE IF NOT EXISTS public.payroll_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  provider TEXT NOT NULL DEFAULT 'CHECKWRITERS',
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  import_profile_id UUID REFERENCES public.checkwriters_import_profiles(id),
  payroll_run_id UUID REFERENCES public.payroll_runs(id),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'GENERATED',
  line_count INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_exports_provider CHECK (provider IN ('CHECKWRITERS')),
  CONSTRAINT chk_payroll_exports_file_name_len CHECK (char_length(file_name) < 15),
  CONSTRAINT chk_payroll_exports_file_ext CHECK (file_name ~* '\\.(csv|txt)$'),
  CONSTRAINT chk_payroll_exports_status CHECK (status IN ('DRAFT','GENERATED','DOWNLOADED','FAILED'))
);

CREATE TABLE IF NOT EXISTS public.payroll_export_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  export_id UUID NOT NULL REFERENCES public.payroll_exports(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  det TEXT NOT NULL,
  det_code TEXT NOT NULL,
  hours NUMERIC(12,2),
  rate NUMERIC(12,4),
  amount NUMERIC(12,2) NOT NULL,
  cost_center_code TEXT,
  job_code TEXT,
  line_number INTEGER NOT NULL,
  source_line_item_id UUID REFERENCES public.payroll_line_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_export_lines_det CHECK (det IN ('E','D','T')),
  CONSTRAINT chk_payroll_export_lines_nonneg CHECK (
    (hours IS NULL OR hours >= 0)
    AND (rate IS NULL OR rate >= 0)
    AND amount >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_payroll_exports_tenant_created
  ON public.payroll_exports(tenant_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_export_lines_export
  ON public.payroll_export_lines(export_id, line_number)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_payroll_exports_updated_at ON public.payroll_exports;
CREATE TRIGGER trg_payroll_exports_updated_at
  BEFORE UPDATE ON public.payroll_exports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_exports_etag ON public.payroll_exports;
CREATE TRIGGER trg_payroll_exports_etag
  BEFORE UPDATE ON public.payroll_exports
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_payroll_export_lines_updated_at ON public.payroll_export_lines;
CREATE TRIGGER trg_payroll_export_lines_updated_at
  BEFORE UPDATE ON public.payroll_export_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_export_lines_etag ON public.payroll_export_lines;
CREATE TRIGGER trg_payroll_export_lines_etag
  BEFORE UPDATE ON public.payroll_export_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

ALTER TABLE public.payroll_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_export_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_exports_select ON public.payroll_exports;
CREATE POLICY payroll_exports_select ON public.payroll_exports
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_exports_write ON public.payroll_exports;
CREATE POLICY payroll_exports_write ON public.payroll_exports
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS payroll_export_lines_select ON public.payroll_export_lines;
CREATE POLICY payroll_export_lines_select ON public.payroll_export_lines
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_lines_write ON public.payroll_export_lines;
CREATE POLICY payroll_export_lines_write ON public.payroll_export_lines
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

COMMIT;
