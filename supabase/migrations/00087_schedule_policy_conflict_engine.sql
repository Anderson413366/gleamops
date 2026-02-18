BEGIN;

ALTER TABLE public.schedule_conflicts
  DROP CONSTRAINT IF EXISTS chk_schedule_conflicts_type;

ALTER TABLE public.schedule_conflicts
  ADD CONSTRAINT chk_schedule_conflicts_type CHECK (conflict_type IN (
    'OVERLAP','PTO_CONFLICT','AVAILABILITY_CONFLICT','COVERAGE_GAP','ROLE_MISMATCH',
    'REST_WINDOW_WARNING','MAX_WEEKLY_HOURS_WARNING',
    'rest_window_violation','max_weekly_hours_violation','overtime_threshold_warning',
    'shift_overlap_warning','subcontractor_capacity_violation'
  ));

CREATE OR REPLACE FUNCTION public.fn_apply_schedule_policy_conflicts(p_period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period public.schedule_periods%ROWTYPE;
  v_policy public.schedule_policies%ROWTYPE;
  v_rest_blocking BOOLEAN := false;
  v_rest_severity TEXT := 'WARNING';
  v_weekly_blocking BOOLEAN := false;
  v_weekly_severity TEXT := 'WARNING';
  v_sub_capacity_blocking BOOLEAN := false;
  v_sub_capacity_severity TEXT := 'WARNING';
BEGIN
  SELECT *
  INTO v_period
  FROM public.schedule_periods
  WHERE id = p_period_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL;

  IF v_period.id IS NULL THEN
    RAISE EXCEPTION 'Schedule period not found';
  END IF;

  SELECT *
  INTO v_policy
  FROM public.fn_get_schedule_policy(v_period.site_id);

  v_rest_blocking := v_policy.rest_enforcement <> 'warn';
  v_rest_severity := CASE WHEN v_rest_blocking THEN 'ERROR' ELSE 'WARNING' END;

  v_weekly_blocking := v_policy.weekly_hours_enforcement <> 'warn';
  v_weekly_severity := CASE WHEN v_weekly_blocking THEN 'ERROR' ELSE 'WARNING' END;

  v_sub_capacity_blocking := v_policy.subcontractor_capacity_enforcement <> 'warn';
  v_sub_capacity_severity := CASE WHEN v_sub_capacity_blocking THEN 'ERROR' ELSE 'WARNING' END;

  DELETE FROM public.schedule_conflicts
  WHERE period_id = p_period_id
    AND tenant_id = current_tenant_id()
    AND conflict_type IN (
      'rest_window_violation',
      'max_weekly_hours_violation',
      'overtime_threshold_warning',
      'shift_overlap_warning',
      'subcontractor_capacity_violation'
    );

  -- Rest window checks across adjacent assignments for each staff member.
  WITH assignment_windows AS (
    SELECT
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.scheduled_date,
      (wt.scheduled_date + COALESCE(wt.start_time, time '00:00'))::timestamp AS start_ts,
      (
        CASE
          WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
            THEN (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp
          ELSE (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp
        END
      ) AS end_ts,
      LAG(
        CASE
          WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
            THEN (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp
          ELSE (wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp
        END
      ) OVER (PARTITION BY ta.staff_id ORDER BY wt.scheduled_date, COALESCE(wt.start_time, time '00:00')) AS previous_end_ts
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND ta.staff_id IS NOT NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    aw.ticket_id,
    aw.staff_id,
    'rest_window_violation',
    v_rest_severity,
    format('Rest window below policy minimum of %s hour(s)', v_policy.min_rest_hours),
    jsonb_build_object(
      'ticket_code', aw.ticket_code,
      'min_rest_hours', v_policy.min_rest_hours,
      'actual_rest_hours', ROUND(EXTRACT(EPOCH FROM (aw.start_ts - aw.previous_end_ts)) / 3600.0, 2),
      'enforcement', v_policy.rest_enforcement,
      'override_required', (v_policy.rest_enforcement = 'override_required')
    ),
    v_rest_blocking
  FROM assignment_windows aw
  WHERE aw.previous_end_ts IS NOT NULL
    AND (EXTRACT(EPOCH FROM (aw.start_ts - aw.previous_end_ts)) / 3600.0) < v_policy.min_rest_hours;

  -- Weekly hours + overtime warning checks per staff.
  WITH staff_hours AS (
    SELECT
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      SUM(
        GREATEST(
          EXTRACT(EPOCH FROM (
            CASE
              WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
                THEN ((wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp)
              ELSE ((wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp)
            END
            - ((wt.scheduled_date + COALESCE(wt.start_time, time '00:00'))::timestamp)
          )) / 3600.0,
          0
        )
      ) AS scheduled_hours
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND ta.staff_id IS NOT NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
    GROUP BY ta.staff_id, wt.id, wt.ticket_code
  ),
  staff_totals AS (
    SELECT
      staff_id,
      SUM(scheduled_hours) AS total_hours
    FROM staff_hours
    GROUP BY staff_id
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    sh.ticket_id,
    sh.staff_id,
    'max_weekly_hours_violation',
    v_weekly_severity,
    format('Scheduled weekly hours exceed policy max of %s', v_policy.max_weekly_hours),
    jsonb_build_object(
      'ticket_code', sh.ticket_code,
      'max_weekly_hours', v_policy.max_weekly_hours,
      'scheduled_hours', ROUND(st.total_hours::numeric, 2),
      'enforcement', v_policy.weekly_hours_enforcement,
      'override_required', (v_policy.weekly_hours_enforcement = 'override_required')
    ),
    v_weekly_blocking
  FROM staff_hours sh
  JOIN staff_totals st ON st.staff_id = sh.staff_id
  WHERE st.total_hours > v_policy.max_weekly_hours;

  WITH staff_hours AS (
    SELECT
      ta.staff_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      SUM(
        GREATEST(
          EXTRACT(EPOCH FROM (
            CASE
              WHEN COALESCE(wt.end_time, time '23:59:59') <= COALESCE(wt.start_time, time '00:00')
                THEN ((wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59') + interval '1 day')::timestamp)
              ELSE ((wt.scheduled_date + COALESCE(wt.end_time, time '23:59:59'))::timestamp)
            END
            - ((wt.scheduled_date + COALESCE(wt.start_time, time '00:00'))::timestamp)
          )) / 3600.0,
          0
        )
      ) AS scheduled_hours
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND ta.staff_id IS NOT NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
    GROUP BY ta.staff_id, wt.id, wt.ticket_code
  ),
  staff_totals AS (
    SELECT
      staff_id,
      SUM(scheduled_hours) AS total_hours
    FROM staff_hours
    GROUP BY staff_id
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    sh.ticket_id,
    sh.staff_id,
    'overtime_threshold_warning',
    'WARNING',
    format('Scheduled hours are near overtime threshold (%s)', v_policy.overtime_warning_at_hours),
    jsonb_build_object(
      'ticket_code', sh.ticket_code,
      'overtime_warning_at_hours', v_policy.overtime_warning_at_hours,
      'scheduled_hours', ROUND(st.total_hours::numeric, 2)
    ),
    false
  FROM staff_hours sh
  JOIN staff_totals st ON st.staff_id = sh.staff_id
  WHERE st.total_hours > v_policy.overtime_warning_at_hours
    AND st.total_hours <= v_policy.max_weekly_hours;

  -- Subcontractor capacity checks.
  WITH sub_windows AS (
    SELECT
      ta.subcontractor_id,
      wt.id AS ticket_id,
      wt.ticket_code,
      wt.scheduled_date,
      COALESCE(wt.start_time, time '00:00') AS start_time,
      COALESCE(wt.end_time, time '23:59:59') AS end_time
    FROM public.ticket_assignments ta
    JOIN public.work_tickets wt ON wt.id = ta.ticket_id
    WHERE ta.tenant_id = current_tenant_id()
      AND ta.archived_at IS NULL
      AND ta.subcontractor_id IS NOT NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND wt.scheduled_date BETWEEN v_period.period_start AND v_period.period_end
      AND (v_period.site_id IS NULL OR wt.site_id = v_period.site_id)
  ),
  sub_over AS (
    SELECT
      a.subcontractor_id,
      a.ticket_id,
      a.ticket_code,
      COUNT(*)::INT AS overlapping_assignments
    FROM sub_windows a
    JOIN sub_windows b
      ON a.subcontractor_id = b.subcontractor_id
      AND a.scheduled_date = b.scheduled_date
      AND a.ticket_id <> b.ticket_id
      AND a.start_time < b.end_time
      AND b.start_time < a.end_time
    GROUP BY a.subcontractor_id, a.ticket_id, a.ticket_code
  )
  INSERT INTO public.schedule_conflicts (
    tenant_id, period_id, ticket_id, conflict_type, severity, message, payload, is_blocking
  )
  SELECT
    current_tenant_id(),
    p_period_id,
    so.ticket_id,
    'subcontractor_capacity_violation',
    v_sub_capacity_severity,
    format('Subcontractor assignment overlaps exceed configured capacity of %s', sub.default_capacity),
    jsonb_build_object(
      'ticket_code', so.ticket_code,
      'subcontractor_id', so.subcontractor_id,
      'capacity', sub.default_capacity,
      'overlapping_assignments', so.overlapping_assignments,
      'enforcement', v_policy.subcontractor_capacity_enforcement,
      'override_required', (v_policy.subcontractor_capacity_enforcement = 'override_required')
    ),
    v_sub_capacity_blocking
  FROM sub_over so
  JOIN public.subcontractors sub ON sub.id = so.subcontractor_id
  WHERE so.overlapping_assignments > sub.default_capacity;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_schedule_policy_conflicts(UUID) TO authenticated;

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
  PERFORM public.fn_apply_schedule_policy_conflicts(p_period_id);

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

COMMIT;
