BEGIN;

CREATE TABLE IF NOT EXISTS public.schedule_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  site_id UUID REFERENCES public.sites(id),
  period_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  published_by UUID,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_schedule_periods_dates CHECK (period_end >= period_start),
  CONSTRAINT chk_schedule_periods_status CHECK (status IN ('DRAFT','PUBLISHED','LOCKED','ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_periods_tenant_dates
  ON public.schedule_periods(tenant_id, period_start, period_end)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_periods_tenant_status
  ON public.schedule_periods(tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_periods_site_dates
  ON public.schedule_periods(tenant_id, site_id, period_start)
  WHERE archived_at IS NULL AND site_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_schedule_periods_updated_at ON public.schedule_periods;
CREATE TRIGGER trg_schedule_periods_updated_at
  BEFORE UPDATE ON public.schedule_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_schedule_periods_etag ON public.schedule_periods;
CREATE TRIGGER trg_schedule_periods_etag
  BEFORE UPDATE ON public.schedule_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.schedule_periods;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.schedule_periods
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMIT;
