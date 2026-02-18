BEGIN;

CREATE OR REPLACE FUNCTION public.fn_current_staff_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT s.id
  FROM public.staff s
  WHERE s.tenant_id = current_tenant_id()
    AND s.user_id = auth.uid()
    AND s.archived_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_schedule_period(p_period_id UUID)
RETURNS TABLE(conflict_type TEXT, conflict_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period public.schedule_periods%ROWTYPE;
BEGIN
  SELECT *
  INTO v_period
  FROM public.schedule_periods
  WHERE id = p_period_id
    AND archived_at IS NULL;

  IF v_period.id IS NULL OR v_period.tenant_id <> current_tenant_id() THEN
    RAISE EXCEPTION 'Invalid schedule period scope';
  END IF;

  DELETE FROM public.schedule_conflicts WHERE period_id = p_period_id AND tenant_id = current_tenant_id();

  -- Coverage gap conflicts
  WITH scope_tickets AS (
    SELECT wt.id, wt.ticket_code, wt.site_id, wt.scheduled_date, COALESCE(wt.required_staff_count, 1) AS required_staff_count
    FROM public.work_tickets wt
    WHERE wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.status NOT IN ('CANCELED', 'CANCELLED')
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  ),
  assigned_counts AS (
    SELECT
      st.id AS ticket_id,
      COUNT(ta.id)::INT AS assigned_count
    FROM scope_tickets st
    LEFT JOIN public.ticket_assignments ta
      ON ta.ticket_id = st.id
      AND ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
    GROUP BY st.id
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    st.id,
    'COVERAGE_GAP',
    'ERROR',
    format('Coverage gap on %s: assigned %s of %s required staff', st.ticket_code, ac.assigned_count, st.required_staff_count),
    jsonb_build_object(
      'ticket_code', st.ticket_code,
      'assigned_count', ac.assigned_count,
      'required_staff_count', st.required_staff_count
    ),
    true
  FROM scope_tickets st
  JOIN assigned_counts ac ON ac.ticket_id = st.id
  WHERE ac.assigned_count < st.required_staff_count;

  -- Overlap conflicts
  WITH scope_assignments AS (
    SELECT
      ta.id AS assignment_id,
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.scheduled_date,
      COALESCE(wt.start_time, time '00:00') AS start_time,
      COALESCE(wt.end_time, time '23:59:59') AS end_time,
      (wt.scheduled_date + COALESCE(wt.start_time, time '00:00'))::timestamp AS start_ts,
      (
        CASE
          WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
            THEN (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp
          ELSE (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp
        END
      ) AS end_ts
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.status NOT IN ('CANCELED', 'CANCELLED')
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  ),
  overlap_rows AS (
    SELECT
      a.staff_id,
      a.ticket_id AS ticket_id_a,
      a.ticket_code AS ticket_code_a,
      b.ticket_id AS ticket_id_b,
      b.ticket_code AS ticket_code_b
    FROM scope_assignments a
    JOIN scope_assignments b
      ON a.staff_id = b.staff_id
      AND a.assignment_id < b.assignment_id
      AND a.start_ts < b.end_ts
      AND b.start_ts < a.end_ts
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    o.ticket_id_a,
    o.staff_id,
    'OVERLAP',
    'ERROR',
    format('Staff has overlapping shifts (%s and %s)', o.ticket_code_a, o.ticket_code_b),
    jsonb_build_object(
      'ticket_code', o.ticket_code_a,
      'conflicting_ticket_id', o.ticket_id_b,
      'conflicting_ticket_code', o.ticket_code_b
    ),
    true
  FROM overlap_rows o;

  -- PTO conflicts (reuses HR Lite table)
  WITH scope_assignments AS (
    SELECT
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.scheduled_date
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.status NOT IN ('CANCELED', 'CANCELLED')
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    sa.ticket_id,
    sa.staff_id,
    'PTO_CONFLICT',
    'ERROR',
    format('Ticket %s conflicts with approved PTO', sa.ticket_code),
    jsonb_build_object(
      'ticket_code', sa.ticket_code,
      'pto_request_id', pto.id,
      'pto_start', pto.start_date,
      'pto_end', pto.end_date
    ),
    true
  FROM scope_assignments sa
  JOIN public.hr_pto_requests pto
    ON pto.tenant_id = current_tenant_id()
    AND pto.staff_id = sa.staff_id
    AND pto.archived_at IS NULL
    AND pto.status = 'APPROVED'
    AND sa.scheduled_date BETWEEN pto.start_date AND pto.end_date;

  -- Availability conflicts
  WITH scope_assignments AS (
    SELECT
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.scheduled_date,
      COALESCE(wt.start_time, time '00:00') AS start_time,
      COALESCE(wt.end_time, time '23:59:59') AS end_time,
      (wt.scheduled_date + COALESCE(wt.start_time, time '00:00'))::timestamp AS start_ts,
      (
        CASE
          WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
            THEN (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp
          ELSE (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp
        END
      ) AS end_ts
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.status NOT IN ('CANCELED', 'CANCELLED')
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    sa.ticket_id,
    sa.staff_id,
    'AVAILABILITY_CONFLICT',
    'ERROR',
    format('Ticket %s violates an unavailable availability rule', sa.ticket_code),
    jsonb_build_object('ticket_code', sa.ticket_code, 'availability_rule_id', ar.id),
    true
  FROM scope_assignments sa
  JOIN public.staff_availability_rules ar
    ON ar.tenant_id = current_tenant_id()
    AND ar.staff_id = sa.staff_id
    AND ar.archived_at IS NULL
    AND ar.availability_type = 'UNAVAILABLE'
    AND (
      (
        ar.rule_type = 'ONE_OFF'
        AND ar.one_off_start IS NOT NULL
        AND ar.one_off_end IS NOT NULL
        AND sa.start_ts < ar.one_off_end
        AND ar.one_off_start < sa.end_ts
      )
      OR
      (
        ar.rule_type = 'WEEKLY_RECURRING'
        AND ar.weekday = EXTRACT(DOW FROM sa.scheduled_date)::INT
        AND (ar.valid_from IS NULL OR sa.scheduled_date >= ar.valid_from)
        AND (ar.valid_to IS NULL OR sa.scheduled_date <= ar.valid_to)
        AND sa.start_time < COALESCE(ar.end_time, time '23:59:59')
        AND COALESCE(ar.start_time, time '00:00') < sa.end_time
      )
    );

  -- Role mismatch warning
  WITH scope_assignments AS (
    SELECT
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.position_code,
      ta.staff_id,
      ta.role
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.status NOT IN ('CANCELED', 'CANCELLED')
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
      AND wt.position_code IS NOT NULL
      AND ta.role IS NOT NULL
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    sa.ticket_id,
    sa.staff_id,
    'ROLE_MISMATCH',
    'WARNING',
    format('Assignment role (%s) does not match required position (%s) for %s', sa.role, sa.position_code, sa.ticket_code),
    jsonb_build_object(
      'ticket_code', sa.ticket_code,
      'required_position_code', sa.position_code,
      'assignment_role', sa.role
    ),
    false
  FROM scope_assignments sa
  WHERE UPPER(sa.position_code) <> UPPER(sa.role);

  RETURN QUERY
  SELECT sc.conflict_type, COUNT(*)::BIGINT
  FROM public.schedule_conflicts sc
  WHERE sc.period_id = p_period_id
    AND sc.tenant_id = current_tenant_id()
    AND sc.archived_at IS NULL
  GROUP BY sc.conflict_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_publish_schedule_period(p_period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period public.schedule_periods%ROWTYPE;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT *
  INTO v_period
  FROM public.schedule_periods
  WHERE id = p_period_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  IF v_period.id IS NULL THEN
    RAISE EXCEPTION 'Schedule period not found';
  END IF;

  IF v_period.status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Schedule period must be DRAFT before publish';
  END IF;

  PERFORM public.fn_validate_schedule_period(p_period_id);

  IF EXISTS (
    SELECT 1 FROM public.schedule_conflicts
    WHERE period_id = p_period_id
      AND tenant_id = current_tenant_id()
      AND is_blocking = true
      AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Blocking conflicts detected';
  END IF;

  UPDATE public.schedule_periods
  SET status = 'PUBLISHED', published_at = now(), published_by = auth.uid()
  WHERE id = p_period_id AND tenant_id = current_tenant_id();

  UPDATE public.work_tickets wt
  SET
    schedule_period_id = p_period_id,
    published_at = now(),
    published_by = auth.uid()
  WHERE wt.tenant_id = current_tenant_id()
    AND wt.archived_at IS NULL
    AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
    AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lock_schedule_period(p_period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period public.schedule_periods%ROWTYPE;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT *
  INTO v_period
  FROM public.schedule_periods
  WHERE id = p_period_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  IF v_period.id IS NULL THEN
    RAISE EXCEPTION 'Schedule period not found';
  END IF;

  UPDATE public.schedule_periods
  SET status = 'LOCKED', locked_at = now(), locked_by = auth.uid()
  WHERE id = p_period_id
    AND tenant_id = current_tenant_id()
    AND status = 'PUBLISHED'
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to lock schedule period';
  END IF;

  UPDATE public.work_tickets wt
  SET
    locked_at = now(),
    locked_by = auth.uid()
  WHERE wt.tenant_id = current_tenant_id()
    AND wt.archived_at IS NULL
    AND wt.schedule_period_id = p_period_id
    AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
    AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_request_shift_trade(
  p_ticket_id UUID,
  p_request_type TEXT DEFAULT 'SWAP',
  p_target_staff_id UUID DEFAULT NULL,
  p_initiator_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
  v_period_id UUID;
  v_trade_id UUID;
BEGIN
  v_staff_id := public.fn_current_staff_id();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No staff profile bound to current user';
  END IF;

  IF p_request_type NOT IN ('SWAP', 'RELEASE') THEN
    RAISE EXCEPTION 'Invalid request type';
  END IF;

  IF p_request_type = 'SWAP' AND p_target_staff_id IS NULL THEN
    RAISE EXCEPTION 'SWAP requests require a target staff id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ticket_assignments ta
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.ticket_id = p_ticket_id
      AND ta.staff_id = v_staff_id
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
  ) THEN
    RAISE EXCEPTION 'Initiator is not actively assigned to this ticket';
  END IF;

  SELECT wt.schedule_period_id INTO v_period_id
  FROM public.work_tickets wt
  WHERE wt.id = p_ticket_id
    AND wt.tenant_id = current_tenant_id()
    AND wt.archived_at IS NULL;

  INSERT INTO public.shift_trade_requests (
    tenant_id, ticket_id, period_id, initiator_staff_id, target_staff_id,
    request_type, status, initiator_note
  )
  VALUES (
    current_tenant_id(), p_ticket_id, v_period_id, v_staff_id, p_target_staff_id,
    p_request_type, 'PENDING', p_initiator_note
  )
  RETURNING id INTO v_trade_id;

  RETURN v_trade_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_accept_shift_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := public.fn_current_staff_id();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No staff profile bound to current user';
  END IF;

  UPDATE public.shift_trade_requests
  SET status = 'ACCEPTED', accepted_at = now()
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
    AND status = 'PENDING'
    AND request_type = 'SWAP'
    AND target_staff_id = v_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade request cannot be accepted by this user';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_approve_shift_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.shift_trade_requests
  SET status = 'MANAGER_APPROVED', approved_at = now(), manager_user_id = auth.uid()
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
    AND status IN ('PENDING','ACCEPTED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade request cannot be approved in current state';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_deny_shift_trade(p_trade_id UUID, p_manager_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.shift_trade_requests
  SET status = 'DENIED', manager_note = p_manager_note, manager_user_id = auth.uid()
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
    AND status IN ('PENDING','ACCEPTED','MANAGER_APPROVED');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cancel_shift_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := public.fn_current_staff_id();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No staff profile bound to current user';
  END IF;

  UPDATE public.shift_trade_requests
  SET status = 'CANCELED'
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
    AND status IN ('PENDING','ACCEPTED')
    AND initiator_staff_id = v_staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_shift_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade public.shift_trade_requests%ROWTYPE;
  v_initiator_assignment_id UUID;
  v_initiator_role TEXT;
  v_target_assignment_id UUID;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT *
  INTO v_trade
  FROM public.shift_trade_requests
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
  FOR UPDATE;

  IF v_trade.id IS NULL THEN
    RAISE EXCEPTION 'Trade request not found';
  END IF;

  IF v_trade.status <> 'MANAGER_APPROVED' THEN
    RAISE EXCEPTION 'Trade request not in approvable state';
  END IF;

  SELECT ta.id, ta.role
  INTO v_initiator_assignment_id, v_initiator_role
  FROM public.ticket_assignments ta
  WHERE ta.tenant_id = current_tenant_id()
    AND ta.ticket_id = v_trade.ticket_id
    AND ta.staff_id = v_trade.initiator_staff_id
    AND ta.archived_at IS NULL
    AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
  LIMIT 1
  FOR UPDATE;

  IF v_initiator_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Initiator assignment is no longer active';
  END IF;

  UPDATE public.ticket_assignments
  SET
    assignment_status = 'RELEASED',
    assignment_type = 'RELEASE',
    released_at = now(),
    released_by = auth.uid()
  WHERE id = v_initiator_assignment_id;

  IF v_trade.request_type = 'SWAP' THEN
    IF v_trade.target_staff_id IS NULL THEN
      RAISE EXCEPTION 'SWAP request missing target staff';
    END IF;

    SELECT ta.id
    INTO v_target_assignment_id
    FROM public.ticket_assignments ta
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.ticket_id = v_trade.ticket_id
      AND ta.staff_id = v_trade.target_staff_id
      AND ta.archived_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_target_assignment_id IS NULL THEN
      INSERT INTO public.ticket_assignments (
        tenant_id, ticket_id, staff_id, role, assignment_status, assignment_type
      )
      VALUES (
        current_tenant_id(), v_trade.ticket_id, v_trade.target_staff_id, v_initiator_role, 'ASSIGNED', 'SWAP'
      );
    ELSE
      UPDATE public.ticket_assignments
      SET
        role = COALESCE(role, v_initiator_role),
        assignment_status = 'ASSIGNED',
        assignment_type = 'SWAP',
        released_at = NULL,
        released_by = NULL
      WHERE id = v_target_assignment_id;
    END IF;
  END IF;

  UPDATE public.shift_trade_requests
  SET status = 'APPLIED', applied_at = now(), manager_user_id = auth.uid()
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND status = 'MANAGER_APPROVED'
    AND archived_at IS NULL;

END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_validate_schedule_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_publish_schedule_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_lock_schedule_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_request_shift_trade(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_accept_shift_trade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_shift_trade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_deny_shift_trade(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_shift_trade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_apply_shift_trade(UUID) TO authenticated;

COMMIT;
