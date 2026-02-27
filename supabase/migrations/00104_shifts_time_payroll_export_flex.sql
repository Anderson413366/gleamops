BEGIN;

-- ============================================================================
-- 00093_shifts_time_payroll_export_flex.sql
-- Flexible payroll export mappings, run history, and row payloads.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payroll_export_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_name TEXT NOT NULL,
  provider_code TEXT,
  delimiter TEXT NOT NULL DEFAULT ',',
  include_header BOOLEAN NOT NULL DEFAULT TRUE,
  quote_all BOOLEAN NOT NULL DEFAULT FALSE,
  decimal_separator TEXT NOT NULL DEFAULT '.',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_export_mappings_delimiter CHECK (delimiter IN (',',';','\t','|')),
  CONSTRAINT chk_payroll_export_mappings_decimal_separator CHECK (decimal_separator IN ('.',',')),
  UNIQUE (tenant_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_payroll_export_mappings_tenant_active
  ON public.payroll_export_mappings(tenant_id, is_active)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payroll_export_mapping_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  mapping_id UUID NOT NULL REFERENCES public.payroll_export_mappings(id),
  sort_order INTEGER NOT NULL,
  output_column_name TEXT NOT NULL,
  source_field TEXT,
  static_value TEXT,
  transform_config JSONB,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_export_mapping_fields_sort CHECK (sort_order >= 1),
  CONSTRAINT chk_payroll_export_mapping_fields_source_or_static CHECK (
    source_field IS NOT NULL OR static_value IS NOT NULL
  ),
  UNIQUE (mapping_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_payroll_export_mapping_fields_tenant_mapping
  ON public.payroll_export_mapping_fields(tenant_id, mapping_id, sort_order)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payroll_export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  mapping_id UUID NOT NULL REFERENCES public.payroll_export_mappings(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  exported_file_path TEXT,
  exported_file_checksum TEXT,
  exported_by_user_id UUID,
  exported_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_export_runs_period CHECK (period_end >= period_start),
  CONSTRAINT chk_payroll_export_runs_status CHECK (
    status IN ('DRAFT','PREVIEW_READY','EXPORTED','FAILED','CANCELED')
  ),
  CONSTRAINT chk_payroll_export_runs_row_counts CHECK (
    total_rows >= 0
    AND valid_rows >= 0
    AND invalid_rows >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_payroll_export_runs_tenant_period
  ON public.payroll_export_runs(tenant_id, period_start, period_end)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_export_runs_tenant_status
  ON public.payroll_export_runs(tenant_id, status, created_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payroll_export_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  run_id UUID NOT NULL REFERENCES public.payroll_export_runs(id),
  staff_id UUID REFERENCES public.staff(id),
  line_number INTEGER NOT NULL,
  payload JSONB NOT NULL,
  validation_errors JSONB,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_export_items_line_number CHECK (line_number >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_export_items_run_line_active
  ON public.payroll_export_items(run_id, line_number)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_export_items_tenant_run
  ON public.payroll_export_items(tenant_id, run_id, line_number)
  WHERE archived_at IS NULL;

ALTER TABLE public.payroll_export_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_export_mapping_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_export_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_export_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_export_mappings_tenant_select ON public.payroll_export_mappings;
CREATE POLICY payroll_export_mappings_tenant_select
  ON public.payroll_export_mappings
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_mappings_tenant_insert ON public.payroll_export_mappings;
CREATE POLICY payroll_export_mappings_tenant_insert
  ON public.payroll_export_mappings
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_mappings_tenant_update ON public.payroll_export_mappings;
CREATE POLICY payroll_export_mappings_tenant_update
  ON public.payroll_export_mappings
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_mapping_fields_tenant_select ON public.payroll_export_mapping_fields;
CREATE POLICY payroll_export_mapping_fields_tenant_select
  ON public.payroll_export_mapping_fields
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_mapping_fields_tenant_insert ON public.payroll_export_mapping_fields;
CREATE POLICY payroll_export_mapping_fields_tenant_insert
  ON public.payroll_export_mapping_fields
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_mapping_fields_tenant_update ON public.payroll_export_mapping_fields;
CREATE POLICY payroll_export_mapping_fields_tenant_update
  ON public.payroll_export_mapping_fields
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_runs_tenant_select ON public.payroll_export_runs;
CREATE POLICY payroll_export_runs_tenant_select
  ON public.payroll_export_runs
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_runs_tenant_insert ON public.payroll_export_runs;
CREATE POLICY payroll_export_runs_tenant_insert
  ON public.payroll_export_runs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_runs_tenant_update ON public.payroll_export_runs;
CREATE POLICY payroll_export_runs_tenant_update
  ON public.payroll_export_runs
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_items_tenant_select ON public.payroll_export_items;
CREATE POLICY payroll_export_items_tenant_select
  ON public.payroll_export_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_items_tenant_insert ON public.payroll_export_items;
CREATE POLICY payroll_export_items_tenant_insert
  ON public.payroll_export_items
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_export_items_tenant_update ON public.payroll_export_items;
CREATE POLICY payroll_export_items_tenant_update
  ON public.payroll_export_items
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_payroll_export_mappings_updated_at ON public.payroll_export_mappings;
CREATE TRIGGER trg_payroll_export_mappings_updated_at
  BEFORE UPDATE ON public.payroll_export_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_export_mappings_etag ON public.payroll_export_mappings;
CREATE TRIGGER trg_payroll_export_mappings_etag
  BEFORE UPDATE ON public.payroll_export_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_payroll_export_mapping_fields_updated_at ON public.payroll_export_mapping_fields;
CREATE TRIGGER trg_payroll_export_mapping_fields_updated_at
  BEFORE UPDATE ON public.payroll_export_mapping_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_export_mapping_fields_etag ON public.payroll_export_mapping_fields;
CREATE TRIGGER trg_payroll_export_mapping_fields_etag
  BEFORE UPDATE ON public.payroll_export_mapping_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_payroll_export_runs_updated_at ON public.payroll_export_runs;
CREATE TRIGGER trg_payroll_export_runs_updated_at
  BEFORE UPDATE ON public.payroll_export_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_export_runs_etag ON public.payroll_export_runs;
CREATE TRIGGER trg_payroll_export_runs_etag
  BEFORE UPDATE ON public.payroll_export_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_payroll_export_items_updated_at ON public.payroll_export_items;
CREATE TRIGGER trg_payroll_export_items_updated_at
  BEFORE UPDATE ON public.payroll_export_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_export_items_etag ON public.payroll_export_items;
CREATE TRIGGER trg_payroll_export_items_etag
  BEFORE UPDATE ON public.payroll_export_items
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'prevent_hard_delete'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS no_hard_delete ON public.payroll_export_mappings;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.payroll_export_mappings
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.payroll_export_mapping_fields;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.payroll_export_mapping_fields
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.payroll_export_runs;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.payroll_export_runs
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.payroll_export_items;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.payroll_export_items
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
