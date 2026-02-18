BEGIN;

CREATE TABLE IF NOT EXISTS public.schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_id UUID NOT NULL REFERENCES public.schedule_periods(id),
  ticket_id UUID REFERENCES public.work_tickets(id),
  staff_id UUID REFERENCES public.staff(id),
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'ERROR',
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_schedule_conflicts_type CHECK (conflict_type IN (
    'OVERLAP','PTO_CONFLICT','AVAILABILITY_CONFLICT','COVERAGE_GAP','ROLE_MISMATCH',
    'REST_WINDOW_WARNING','MAX_WEEKLY_HOURS_WARNING'
  )),
  CONSTRAINT chk_schedule_conflicts_severity CHECK (severity IN ('INFO','WARNING','ERROR'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_period
  ON public.schedule_conflicts(period_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_tenant_type
  ON public.schedule_conflicts(tenant_id, conflict_type, severity)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_schedule_conflicts_updated_at ON public.schedule_conflicts;
CREATE TRIGGER trg_schedule_conflicts_updated_at
  BEFORE UPDATE ON public.schedule_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_schedule_conflicts_etag ON public.schedule_conflicts;
CREATE TRIGGER trg_schedule_conflicts_etag
  BEFORE UPDATE ON public.schedule_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.schedule_conflicts;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.schedule_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMIT;
