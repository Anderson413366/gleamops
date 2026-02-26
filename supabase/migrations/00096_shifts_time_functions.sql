BEGIN;

-- ============================================================================
-- 00096_shifts_time_functions.sql
-- RPC layer for route execution, call-out coverage, and payroll export lifecycle.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Route execution: start stop
-- --------------------------------------------------------------------------
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
    actual_start_at = COALESCE(rs.actual_start_at, now()),
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

-- --------------------------------------------------------------------------
-- Route execution: complete stop + open pending travel segment to next stop
-- --------------------------------------------------------------------------
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
    actual_end_at = COALESCE(rs.actual_end_at, now()),
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

-- --------------------------------------------------------------------------
-- Travel segment capture / finalize
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_auto_capture_travel_segment(
  p_route_id UUID,
  p_from_stop_id UUID,
  p_to_stop_id UUID,
  p_travel_end_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_at TIMESTAMPTZ;
  v_minutes INTEGER;
  v_segment_id UUID;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR']) THEN
    RAISE EXCEPTION 'ROUTE_EXECUTION_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(actual_end_at, now())
  INTO v_start_at
  FROM public.route_stops
  WHERE id = p_from_stop_id
    AND route_id = p_route_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  IF v_start_at IS NULL THEN
    RAISE EXCEPTION 'FROM_STOP_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  v_minutes := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (p_travel_end_at - v_start_at)) / 60)::INTEGER
  );

  INSERT INTO public.travel_segments (
    tenant_id,
    route_id,
    from_stop_id,
    to_stop_id,
    travel_start_at,
    travel_end_at,
    actual_minutes,
    payable_minutes,
    source,
    status
  )
  VALUES (
    current_tenant_id(),
    p_route_id,
    p_from_stop_id,
    p_to_stop_id,
    v_start_at,
    p_travel_end_at,
    v_minutes,
    v_minutes,
    'AUTO',
    'CAPTURED'
  )
  ON CONFLICT ON CONSTRAINT uq_travel_segments_route_stop_pair_active
  DO UPDATE
    SET
      travel_end_at = EXCLUDED.travel_end_at,
      actual_minutes = EXCLUDED.actual_minutes,
      payable_minutes = EXCLUDED.payable_minutes,
      source = 'SYSTEM_RECALC',
      status = 'CAPTURED',
      updated_at = now()
  RETURNING id INTO v_segment_id;

  RETURN v_segment_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Call-out reporting
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_report_callout(
  p_affected_staff_id UUID,
  p_reason TEXT,
  p_route_id UUID DEFAULT NULL,
  p_route_stop_id UUID DEFAULT NULL,
  p_work_ticket_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_reporter_staff_id UUID;
  v_is_manager BOOLEAN;
  v_callout_id UUID;
BEGIN
  SELECT public.fn_current_staff_id() INTO v_reporter_staff_id;

  SELECT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  INTO v_is_manager;

  IF v_reporter_staff_id IS DISTINCT FROM p_affected_staff_id AND NOT COALESCE(v_is_manager, false) THEN
    RAISE EXCEPTION 'CALL_OUT_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.callout_events (
    tenant_id,
    reported_by_staff_id,
    affected_staff_id,
    route_id,
    route_stop_id,
    work_ticket_id,
    site_id,
    reason,
    status,
    reported_at,
    resolution_note
  )
  VALUES (
    current_tenant_id(),
    v_reporter_staff_id,
    p_affected_staff_id,
    p_route_id,
    p_route_stop_id,
    p_work_ticket_id,
    p_site_id,
    UPPER(TRIM(p_reason)),
    'REPORTED',
    now(),
    p_resolution_note
  )
  RETURNING id INTO v_callout_id;

  RETURN v_callout_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Coverage offer creation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_offer_coverage(
  p_callout_event_id UUID,
  p_candidate_staff_id UUID,
  p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer_id UUID;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) THEN
    RAISE EXCEPTION 'COVERAGE_OFFER_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.coverage_offers (
    tenant_id,
    callout_event_id,
    candidate_staff_id,
    offered_by_user_id,
    status,
    offered_at,
    expires_at
  )
  VALUES (
    current_tenant_id(),
    p_callout_event_id,
    p_candidate_staff_id,
    auth.uid(),
    'PENDING',
    now(),
    now() + make_interval(mins => GREATEST(1, p_expires_in_minutes))
  )
  ON CONFLICT ON CONSTRAINT uq_coverage_offers_callout_candidate_active
  DO UPDATE SET
    status = 'PENDING',
    offered_at = now(),
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  RETURNING id INTO v_offer_id;

  UPDATE public.callout_events ce
  SET status = 'FINDING_COVER', updated_at = now()
  WHERE ce.id = p_callout_event_id
    AND ce.tenant_id = current_tenant_id()
    AND ce.archived_at IS NULL
    AND ce.status IN ('REPORTED','ESCALATED');

  RETURN v_offer_id;
END;
$$;

-- --------------------------------------------------------------------------
-- Coverage offer acceptance
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_accept_coverage(
  p_offer_id UUID,
  p_response_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer public.coverage_offers;
  v_actor_staff_id UUID;
  v_is_manager BOOLEAN;
BEGIN
  SELECT *
  INTO v_offer
  FROM public.coverage_offers co
  WHERE co.id = p_offer_id
    AND co.tenant_id = current_tenant_id()
    AND co.archived_at IS NULL;

  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION 'COVERAGE_OFFER_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT public.fn_current_staff_id() INTO v_actor_staff_id;
  SELECT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) INTO v_is_manager;

  IF v_offer.candidate_staff_id IS DISTINCT FROM v_actor_staff_id AND NOT COALESCE(v_is_manager, false) THEN
    RAISE EXCEPTION 'COVERAGE_ACCEPT_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.coverage_offers
  SET
    status = 'ACCEPTED',
    responded_at = now(),
    response_note = p_response_note,
    updated_at = now()
  WHERE id = p_offer_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  UPDATE public.callout_events ce
  SET
    status = 'COVERED',
    covered_by_staff_id = v_offer.candidate_staff_id,
    covered_at = now(),
    updated_at = now()
  WHERE ce.id = v_offer.callout_event_id
    AND ce.tenant_id = current_tenant_id()
    AND ce.archived_at IS NULL;

  UPDATE public.coverage_offers
  SET
    status = 'CANCELED',
    updated_at = now()
  WHERE callout_event_id = v_offer.callout_event_id
    AND id <> p_offer_id
    AND status = 'PENDING'
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  RETURN jsonb_build_object(
    'offer_id', p_offer_id,
    'callout_event_id', v_offer.callout_event_id,
    'covered_by_staff_id', v_offer.candidate_staff_id
  );
END;
$$;

-- --------------------------------------------------------------------------
-- Payroll export lifecycle
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_payroll_export_preview(
  p_mapping_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id UUID;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER']) THEN
    RAISE EXCEPTION 'PAYROLL_EXPORT_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.payroll_export_runs (
    tenant_id,
    mapping_id,
    period_start,
    period_end,
    status,
    total_rows,
    valid_rows,
    invalid_rows,
    metadata
  )
  VALUES (
    current_tenant_id(),
    p_mapping_id,
    p_period_start,
    p_period_end,
    'PREVIEW_READY',
    0,
    0,
    0,
    jsonb_build_object('generated_at', now())
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_finalize_payroll_export(
  p_run_id UUID,
  p_exported_file_path TEXT DEFAULT NULL,
  p_exported_file_checksum TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_run public.payroll_export_runs;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER']) THEN
    RAISE EXCEPTION 'PAYROLL_EXPORT_FORBIDDEN'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.payroll_export_runs pr
  SET
    status = 'EXPORTED',
    exported_file_path = COALESCE(p_exported_file_path, pr.exported_file_path),
    exported_file_checksum = COALESCE(p_exported_file_checksum, pr.exported_file_checksum),
    exported_by_user_id = auth.uid(),
    exported_at = now(),
    updated_at = now()
  WHERE pr.id = p_run_id
    AND pr.tenant_id = current_tenant_id()
    AND pr.archived_at IS NULL
    AND pr.status IN ('DRAFT','PREVIEW_READY')
  RETURNING pr.* INTO v_run;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'PAYROLL_EXPORT_RUN_NOT_FINALIZABLE'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'run_id', v_run.id,
    'status', v_run.status,
    'exported_at', v_run.exported_at,
    'exported_by_user_id', v_run.exported_by_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_route_start_stop(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_route_complete_stop(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_auto_capture_travel_segment(UUID, UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_report_callout(UUID, TEXT, UUID, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_offer_coverage(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_coverage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_generate_payroll_export_preview(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_finalize_payroll_export(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
