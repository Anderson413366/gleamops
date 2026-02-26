BEGIN;

CREATE TABLE IF NOT EXISTS public.field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  report_code TEXT NOT NULL,
  report_type TEXT NOT NULL,
  reported_by UUID NOT NULL REFERENCES public.staff(id),
  site_id UUID REFERENCES public.sites(id),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  photos JSONB,
  requested_items JSONB,
  requested_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  acknowledged_by UUID REFERENCES public.staff(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.staff(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_field_reports_code UNIQUE (tenant_id, report_code),
  CONSTRAINT chk_field_reports_type CHECK (
    report_type IN ('SUPPLY_REQUEST', 'MAINTENANCE', 'DAY_OFF', 'INCIDENT', 'GENERAL')
  ),
  CONSTRAINT chk_field_reports_priority CHECK (
    priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')
  ),
  CONSTRAINT chk_field_reports_status CHECK (
    status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')
  )
);

CREATE INDEX IF NOT EXISTS idx_field_reports_tenant
  ON public.field_reports (tenant_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_field_reports_status
  ON public.field_reports (tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_field_reports_type
  ON public.field_reports (tenant_id, report_type)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_field_reports_site
  ON public.field_reports (tenant_id, site_id)
  WHERE archived_at IS NULL AND site_id IS NOT NULL;

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_reports_select ON public.field_reports;
CREATE POLICY field_reports_select
  ON public.field_reports
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
      OR reported_by = (
        SELECT s.id
        FROM public.staff s
        WHERE s.user_id = auth.uid()
          AND s.archived_at IS NULL
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS field_reports_insert ON public.field_reports;
CREATE POLICY field_reports_insert
  ON public.field_reports
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'])
  );

DROP POLICY IF EXISTS field_reports_update ON public.field_reports;
CREATE POLICY field_reports_update
  ON public.field_reports
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP TRIGGER IF EXISTS trg_field_reports_updated_at ON public.field_reports;
CREATE TRIGGER trg_field_reports_updated_at
  BEFORE UPDATE ON public.field_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_field_reports_etag ON public.field_reports;
CREATE TRIGGER trg_field_reports_etag
  BEFORE UPDATE ON public.field_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.field_reports;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.field_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS cleaning_procedures TEXT,
  ADD COLUMN IF NOT EXISTS cleaning_procedures_photos JSONB;

NOTIFY pgrst, 'reload schema';

COMMIT;
