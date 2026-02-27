BEGIN;

-- ============================================================================
-- 00089_shifts_time_core.sql
-- Additive extensions for route-based scheduling execution.
-- No destructive changes.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Routes: link to schedule periods and lifecycle metadata
-- --------------------------------------------------------------------------
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS schedule_period_id UUID REFERENCES public.schedule_periods(id),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID;

-- Expand route status values to support lock/archive semantics.
ALTER TABLE public.routes
  DROP CONSTRAINT IF EXISTS chk_routes_status;

ALTER TABLE public.routes
  ADD CONSTRAINT chk_routes_status
  CHECK (status IN ('DRAFT','PUBLISHED','LOCKED','COMPLETED','ARCHIVED'));

CREATE INDEX IF NOT EXISTS idx_routes_tenant_date_owner
  ON public.routes(tenant_id, route_date, route_owner_staff_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_routes_tenant_period
  ON public.routes(tenant_id, schedule_period_id)
  WHERE archived_at IS NULL AND schedule_period_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Route stops: execution fields bound to ticket/site timeline
-- --------------------------------------------------------------------------
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS work_ticket_id UUID REFERENCES public.work_tickets(id),
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id),
  ADD COLUMN IF NOT EXISTS planned_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';

-- Backfill route_stops.site_id when deterministically derivable via site_job_id.
UPDATE public.route_stops rs
SET site_id = sj.site_id
FROM public.site_jobs sj
WHERE rs.site_job_id = sj.id
  AND rs.site_id IS NULL;

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_status;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_status
  CHECK (status IN ('PENDING','ARRIVED','IN_PROGRESS','COMPLETED','SKIPPED','CANCELED'));

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_planned_window;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_planned_window
  CHECK (
    planned_end_at IS NULL
    OR planned_start_at IS NULL
    OR planned_end_at >= planned_start_at
  );

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_actual_window;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_actual_window
  CHECK (
    actual_end_at IS NULL
    OR actual_start_at IS NULL
    OR actual_end_at >= actual_start_at
  );

CREATE INDEX IF NOT EXISTS idx_route_stops_tenant_route_order
  ON public.route_stops(tenant_id, route_id, stop_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_stops_tenant_ticket
  ON public.route_stops(tenant_id, work_ticket_id)
  WHERE archived_at IS NULL AND work_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_route_stops_tenant_site_planned
  ON public.route_stops(tenant_id, site_id, planned_start_at)
  WHERE archived_at IS NULL AND site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_route_stops_tenant_status
  ON public.route_stops(tenant_id, status)
  WHERE archived_at IS NULL;

-- Ensure standard update triggers exist.
DROP TRIGGER IF EXISTS trg_routes_updated_at ON public.routes;
CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_routes_etag ON public.routes;
CREATE TRIGGER trg_routes_etag
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_route_stops_updated_at ON public.route_stops;
CREATE TRIGGER trg_route_stops_updated_at
  BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_stops_etag ON public.route_stops;
CREATE TRIGGER trg_route_stops_etag
  BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

NOTIFY pgrst, 'reload schema';

COMMIT;
