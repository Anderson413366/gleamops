BEGIN;

-- ============================================================================
-- 00090_shifts_time_paid_travel.sql
-- Paid travel segment tracking between route stops.
-- Tenant-isolated + RLS + standard triggers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.travel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  route_id UUID NOT NULL REFERENCES public.routes(id),
  from_stop_id UUID NOT NULL REFERENCES public.route_stops(id),
  to_stop_id UUID NOT NULL REFERENCES public.route_stops(id),
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  payable_minutes INTEGER NOT NULL DEFAULT 0,
  travel_start_at TIMESTAMPTZ,
  travel_end_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'AUTO',
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_travel_segments_minutes_estimated CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  CONSTRAINT chk_travel_segments_minutes_actual CHECK (actual_minutes IS NULL OR actual_minutes >= 0),
  CONSTRAINT chk_travel_segments_minutes_payable CHECK (payable_minutes >= 0),
  CONSTRAINT chk_travel_segments_distinct_stops CHECK (from_stop_id <> to_stop_id),
  CONSTRAINT chk_travel_segments_window CHECK (
    travel_end_at IS NULL
    OR travel_start_at IS NULL
    OR travel_end_at >= travel_start_at
  ),
  CONSTRAINT chk_travel_segments_source CHECK (source IN ('AUTO','MANUAL_ADJUST','SYSTEM_RECALC')),
  CONSTRAINT chk_travel_segments_status CHECK (status IN ('PENDING','CAPTURED','ADJUSTED','APPROVED','REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_travel_segments_tenant_route_time
  ON public.travel_segments(tenant_id, route_id, travel_start_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_travel_segments_tenant_status
  ON public.travel_segments(tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_travel_segments_tenant_from_stop
  ON public.travel_segments(tenant_id, from_stop_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_travel_segments_tenant_to_stop
  ON public.travel_segments(tenant_id, to_stop_id)
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_segments_route_stop_pair_active
  ON public.travel_segments(tenant_id, route_id, from_stop_id, to_stop_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.travel_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_segments_tenant_select ON public.travel_segments;
CREATE POLICY travel_segments_tenant_select
  ON public.travel_segments
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS travel_segments_tenant_insert ON public.travel_segments;
CREATE POLICY travel_segments_tenant_insert
  ON public.travel_segments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS travel_segments_tenant_update ON public.travel_segments;
CREATE POLICY travel_segments_tenant_update
  ON public.travel_segments
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_travel_segments_updated_at ON public.travel_segments;
CREATE TRIGGER trg_travel_segments_updated_at
  BEFORE UPDATE ON public.travel_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_travel_segments_etag ON public.travel_segments;
CREATE TRIGGER trg_travel_segments_etag
  BEFORE UPDATE ON public.travel_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- If hard-delete protection function exists, apply it to new table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'prevent_hard_delete'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS no_hard_delete ON public.travel_segments;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.travel_segments
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
