BEGIN;

-- ============================================================================
-- 00091_shifts_time_callout_coverage.sql
-- Call-out events, coverage offers, and on-call pool tracking.
-- Additive only; tenant-isolated via RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.callout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  reported_by_staff_id UUID REFERENCES public.staff(id),
  affected_staff_id UUID NOT NULL REFERENCES public.staff(id),
  route_id UUID REFERENCES public.routes(id),
  route_stop_id UUID REFERENCES public.route_stops(id),
  work_ticket_id UUID REFERENCES public.work_tickets(id),
  site_id UUID REFERENCES public.sites(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REPORTED',
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escalated_at TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  covered_by_staff_id UUID REFERENCES public.staff(id),
  covered_at TIMESTAMPTZ,
  resolved_by_user_id UUID,
  resolution_note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_callout_events_reason CHECK (
    reason IN ('SICK','PERSONAL','EMERGENCY','NO_SHOW','WEATHER','TRANSPORT','OTHER')
  ),
  CONSTRAINT chk_callout_events_status CHECK (
    status IN ('REPORTED','FINDING_COVER','COVERED','UNCOVERED','ESCALATED','CANCELED')
  ),
  CONSTRAINT chk_callout_events_escalation_level CHECK (escalation_level >= 0 AND escalation_level <= 5),
  CONSTRAINT chk_callout_events_target_scope CHECK (
    route_id IS NOT NULL
    OR route_stop_id IS NOT NULL
    OR work_ticket_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_callout_events_tenant_status_reported
  ON public.callout_events(tenant_id, status, reported_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_callout_events_tenant_affected_staff
  ON public.callout_events(tenant_id, affected_staff_id, reported_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_callout_events_tenant_route
  ON public.callout_events(tenant_id, route_id)
  WHERE archived_at IS NULL AND route_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_callout_events_tenant_ticket
  ON public.callout_events(tenant_id, work_ticket_id)
  WHERE archived_at IS NULL AND work_ticket_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.coverage_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  callout_event_id UUID NOT NULL REFERENCES public.callout_events(id),
  candidate_staff_id UUID NOT NULL REFERENCES public.staff(id),
  offered_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING',
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  assignment_applied_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_coverage_offers_status CHECK (
    status IN ('PENDING','ACCEPTED','DECLINED','EXPIRED','CANCELED')
  ),
  CONSTRAINT chk_coverage_offers_window CHECK (
    expires_at IS NULL
    OR offered_at IS NULL
    OR expires_at >= offered_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coverage_offers_callout_candidate_active
  ON public.coverage_offers(tenant_id, callout_event_id, candidate_staff_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coverage_offers_tenant_status
  ON public.coverage_offers(tenant_id, status, offered_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coverage_offers_tenant_candidate
  ON public.coverage_offers(tenant_id, candidate_staff_id, offered_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.on_call_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  effective_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '16:00:00',
  end_time TIME NOT NULL DEFAULT '23:59:00',
  standby_fee NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  assigned_callout_event_id UUID REFERENCES public.callout_events(id),
  assigned_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  eligibility_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_on_call_pool_time_window CHECK (end_time > start_time),
  CONSTRAINT chk_on_call_pool_fee CHECK (standby_fee >= 0),
  CONSTRAINT chk_on_call_pool_status CHECK (
    status IN ('AVAILABLE','ASSIGNED','DECLINED','UNAVAILABLE','COMPLETED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_on_call_pool_staff_day_active
  ON public.on_call_pool(tenant_id, staff_id, effective_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_on_call_pool_tenant_date_status
  ON public.on_call_pool(tenant_id, effective_date, status)
  WHERE archived_at IS NULL;

ALTER TABLE public.callout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.on_call_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS callout_events_tenant_select ON public.callout_events;
CREATE POLICY callout_events_tenant_select
  ON public.callout_events
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS callout_events_tenant_insert ON public.callout_events;
CREATE POLICY callout_events_tenant_insert
  ON public.callout_events
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS callout_events_tenant_update ON public.callout_events;
CREATE POLICY callout_events_tenant_update
  ON public.callout_events
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS coverage_offers_tenant_select ON public.coverage_offers;
CREATE POLICY coverage_offers_tenant_select
  ON public.coverage_offers
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS coverage_offers_tenant_insert ON public.coverage_offers;
CREATE POLICY coverage_offers_tenant_insert
  ON public.coverage_offers
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS coverage_offers_tenant_update ON public.coverage_offers;
CREATE POLICY coverage_offers_tenant_update
  ON public.coverage_offers
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS on_call_pool_tenant_select ON public.on_call_pool;
CREATE POLICY on_call_pool_tenant_select
  ON public.on_call_pool
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS on_call_pool_tenant_insert ON public.on_call_pool;
CREATE POLICY on_call_pool_tenant_insert
  ON public.on_call_pool
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS on_call_pool_tenant_update ON public.on_call_pool;
CREATE POLICY on_call_pool_tenant_update
  ON public.on_call_pool
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_callout_events_updated_at ON public.callout_events;
CREATE TRIGGER trg_callout_events_updated_at
  BEFORE UPDATE ON public.callout_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_callout_events_etag ON public.callout_events;
CREATE TRIGGER trg_callout_events_etag
  BEFORE UPDATE ON public.callout_events
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_coverage_offers_updated_at ON public.coverage_offers;
CREATE TRIGGER trg_coverage_offers_updated_at
  BEFORE UPDATE ON public.coverage_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_coverage_offers_etag ON public.coverage_offers;
CREATE TRIGGER trg_coverage_offers_etag
  BEFORE UPDATE ON public.coverage_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_on_call_pool_updated_at ON public.on_call_pool;
CREATE TRIGGER trg_on_call_pool_updated_at
  BEFORE UPDATE ON public.on_call_pool
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_on_call_pool_etag ON public.on_call_pool;
CREATE TRIGGER trg_on_call_pool_etag
  BEFORE UPDATE ON public.on_call_pool
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- Apply no-hard-delete protection to new business tables when function exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'prevent_hard_delete'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS no_hard_delete ON public.callout_events;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.callout_events
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.coverage_offers;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.coverage_offers
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.on_call_pool;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.on_call_pool
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
