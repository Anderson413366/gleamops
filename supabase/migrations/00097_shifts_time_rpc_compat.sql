BEGIN;

-- ============================================================================
-- 00097_shifts_time_rpc_compat.sql
-- Compatibility patch: keep legacy route stop fields in sync while using the
-- new Shifts & Time RPC workflow.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_route_start_stop(
  p_route_stop_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.route_stops
LANGUAGE plpgsql
AS $$
DECLARE
  v_stop public.route_stops;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR']) THEN
    RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.route_stops rs
  SET
    status = CASE WHEN rs.status = 'PENDING' THEN 'IN_PROGRESS' ELSE rs.status END,
    stop_status = CASE WHEN rs.stop_status = 'PENDING' THEN 'ARRIVED' ELSE rs.stop_status END,
    actual_start_at = COALESCE(rs.actual_start_at, now()),
    arrived_at = COALESCE(rs.arrived_at, now()),
    updated_at = now()
  WHERE rs.id = p_route_stop_id
    AND rs.tenant_id = current_tenant_id()
    AND rs.archived_at IS NULL
  RETURNING rs.* INTO v_stop;

  IF v_stop.id IS NULL THEN
    RAISE EXCEPTION 'ROUTE_STOP_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_stop.work_ticket_id IS NOT NULL THEN
    UPDATE public.work_tickets
    SET status = CASE WHEN status = 'SCHEDULED' THEN 'IN_PROGRESS' ELSE status END
    WHERE id = v_stop.work_ticket_id
      AND tenant_id = current_tenant_id()
      AND archived_at IS NULL;
  END IF;

  RETURN v_stop;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_route_complete_stop(
  p_route_stop_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_stop public.route_stops;
  v_next_stop public.route_stops;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR']) THEN
    RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.route_stops rs
  SET
    status = CASE WHEN rs.status IN ('PENDING','IN_PROGRESS','ARRIVED') THEN 'COMPLETED' ELSE rs.status END,
    stop_status = CASE WHEN rs.stop_status IN ('PENDING','ARRIVED') THEN 'COMPLETED' ELSE rs.stop_status END,
    actual_end_at = COALESCE(rs.actual_end_at, now()),
    departed_at = COALESCE(rs.departed_at, now()),
    updated_at = now()
  WHERE rs.id = p_route_stop_id
    AND rs.tenant_id = current_tenant_id()
    AND rs.archived_at IS NULL
  RETURNING rs.* INTO v_stop;

  IF v_stop.id IS NULL THEN
    RAISE EXCEPTION 'ROUTE_STOP_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT rs.*
  INTO v_next_stop
  FROM public.route_stops rs
  WHERE rs.tenant_id = current_tenant_id()
    AND rs.route_id = v_stop.route_id
    AND rs.stop_order > v_stop.stop_order
    AND rs.archived_at IS NULL
  ORDER BY rs.stop_order ASC
  LIMIT 1;

  IF v_next_stop.id IS NOT NULL THEN
    INSERT INTO public.travel_segments (
      tenant_id,
      route_id,
      from_stop_id,
      to_stop_id,
      travel_start_at,
      source,
      status,
      payable_minutes
    )
    VALUES (
      current_tenant_id(),
      v_stop.route_id,
      v_stop.id,
      v_next_stop.id,
      COALESCE(v_stop.actual_end_at, now()),
      'AUTO',
      'PENDING',
      0
    )
    ON CONFLICT ON CONSTRAINT uq_travel_segments_route_stop_pair_active
    DO NOTHING;
  END IF;

  IF v_stop.work_ticket_id IS NOT NULL THEN
    UPDATE public.work_tickets
    SET status = CASE WHEN status = 'IN_PROGRESS' THEN 'COMPLETED' ELSE status END
    WHERE id = v_stop.work_ticket_id
      AND tenant_id = current_tenant_id()
      AND archived_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'completed_stop_id', v_stop.id,
    'next_stop_id', v_next_stop.id,
    'next_stop_order', v_next_stop.stop_order
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_route_start_stop(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_route_complete_stop(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
