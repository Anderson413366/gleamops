BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_routes(
  p_tenant_id UUID,
  p_target_date DATE
)
RETURNS SETOF public.routes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template public.route_templates%ROWTYPE;
  v_stop public.route_template_stops%ROWTYPE;
  v_route public.routes%ROWTYPE;
  v_route_stop_id UUID;
  v_weekday TEXT;
  v_periodic RECORD;
  v_complaint RECORD;
  v_task_id UUID;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;

  IF p_target_date IS NULL THEN
    RAISE EXCEPTION 'p_target_date is required';
  END IF;

  v_weekday := CASE EXTRACT(ISODOW FROM p_target_date)
    WHEN 1 THEN 'MON'
    WHEN 2 THEN 'TUE'
    WHEN 3 THEN 'WED'
    WHEN 4 THEN 'THU'
    WHEN 5 THEN 'FRI'
    WHEN 6 THEN 'SAT'
    ELSE 'SUN'
  END;

  FOR v_template IN
    SELECT *
    FROM public.route_templates
    WHERE tenant_id = p_tenant_id
      AND weekday = v_weekday
      AND is_active = TRUE
      AND archived_at IS NULL
    ORDER BY created_at ASC
  LOOP
    SELECT *
    INTO v_route
    FROM public.routes
    WHERE tenant_id = p_tenant_id
      AND template_id = v_template.id
      AND route_date = p_target_date
      AND archived_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.routes (
        tenant_id,
        route_date,
        route_owner_staff_id,
        route_type,
        status,
        template_id,
        key_box_number
      )
      VALUES (
        p_tenant_id,
        p_target_date,
        v_template.assigned_staff_id,
        'DAILY_ROUTE',
        'DRAFT',
        v_template.id,
        v_template.default_key_box
      )
      RETURNING * INTO v_route;

      FOR v_stop IN
        SELECT *
        FROM public.route_template_stops
        WHERE tenant_id = p_tenant_id
          AND template_id = v_template.id
          AND archived_at IS NULL
        ORDER BY stop_order ASC
      LOOP
        INSERT INTO public.route_stops (
          tenant_id,
          route_id,
          site_job_id,
          stop_order,
          estimated_travel_minutes,
          is_locked,
          access_window_start,
          access_window_end
        )
        VALUES (
          p_tenant_id,
          v_route.id,
          v_stop.site_job_id,
          v_stop.stop_order,
          NULL,
          FALSE,
          v_stop.access_window_start,
          v_stop.access_window_end
        )
        RETURNING id INTO v_route_stop_id;

        INSERT INTO public.route_stop_tasks (
          tenant_id,
          route_stop_id,
          task_type,
          description,
          task_order,
          evidence_required,
          delivery_items,
          is_from_template
        )
        SELECT
          p_tenant_id,
          v_route_stop_id,
          rtt.task_type,
          COALESCE(
            NULLIF(BTRIM(rtt.description_override), ''),
            NULLIF(BTRIM(rtt.description_key), ''),
            INITCAP(REPLACE(LOWER(rtt.task_type), '_', ' '))
          ) AS description,
          rtt.task_order,
          COALESCE(rtt.evidence_required, FALSE),
          rtt.delivery_items,
          TRUE
        FROM public.route_template_tasks rtt
        WHERE rtt.tenant_id = p_tenant_id
          AND rtt.template_stop_id = v_stop.id
          AND rtt.archived_at IS NULL
        ORDER BY rtt.task_order ASC, rtt.created_at ASC;
      END LOOP;
    END IF;

    FOR v_periodic IN
      SELECT
        pt.id,
        pt.periodic_code,
        pt.task_type,
        pt.description_key,
        pt.description_override,
        pt.evidence_required,
        rs.id AS route_stop_id
      FROM public.periodic_tasks pt
      JOIN public.route_stops rs
        ON rs.tenant_id = p_tenant_id
       AND rs.route_id = v_route.id
       AND rs.site_job_id = pt.site_job_id
       AND rs.archived_at IS NULL
      WHERE pt.tenant_id = p_tenant_id
        AND pt.status = 'ACTIVE'
        AND pt.auto_add_to_route = TRUE
        AND pt.archived_at IS NULL
        AND pt.next_due_date <= (p_target_date + INTERVAL '3 days')::DATE
      ORDER BY pt.next_due_date ASC, pt.created_at ASC
    LOOP
      INSERT INTO public.route_stop_tasks (
        tenant_id,
        route_stop_id,
        task_type,
        description,
        task_order,
        evidence_required,
        delivery_items,
        is_from_template,
        notes
      )
      SELECT
        p_tenant_id,
        v_periodic.route_stop_id,
        v_periodic.task_type,
        v_periodic.periodic_code
          || ': '
          || COALESCE(
            NULLIF(BTRIM(v_periodic.description_override), ''),
            NULLIF(BTRIM(v_periodic.description_key), ''),
            INITCAP(REPLACE(LOWER(v_periodic.task_type), '_', ' '))
          ),
        COALESCE((
          SELECT MAX(existing.task_order) + 1
          FROM public.route_stop_tasks existing
          WHERE existing.route_stop_id = v_periodic.route_stop_id
            AND existing.archived_at IS NULL
        ), 1),
        COALESCE(v_periodic.evidence_required, FALSE),
        NULL,
        FALSE,
        'Auto-added periodic task'
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.route_stop_tasks existing
        WHERE existing.tenant_id = p_tenant_id
          AND existing.route_stop_id = v_periodic.route_stop_id
          AND existing.archived_at IS NULL
          AND existing.description LIKE v_periodic.periodic_code || ':%'
      );
    END LOOP;

    FOR v_complaint IN
      SELECT
        cr.id AS complaint_id,
        cr.complaint_code,
        cr.customer_original_message,
        rs.id AS route_stop_id
      FROM public.complaint_records cr
      JOIN public.site_jobs sj
        ON sj.tenant_id = p_tenant_id
       AND sj.site_id = cr.site_id
       AND sj.archived_at IS NULL
      JOIN public.route_stops rs
        ON rs.tenant_id = p_tenant_id
       AND rs.route_id = v_route.id
       AND rs.site_job_id = sj.id
       AND rs.archived_at IS NULL
      WHERE cr.tenant_id = p_tenant_id
        AND cr.priority = 'URGENT_SAME_NIGHT'
        AND cr.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED')
        AND cr.archived_at IS NULL
        AND cr.linked_route_task_id IS NULL
      ORDER BY cr.created_at ASC
    LOOP
      SELECT rst.id
      INTO v_task_id
      FROM public.route_stop_tasks rst
      WHERE rst.tenant_id = p_tenant_id
        AND rst.route_stop_id = v_complaint.route_stop_id
        AND rst.source_complaint_id = v_complaint.complaint_id
        AND rst.archived_at IS NULL
      LIMIT 1;

      IF v_task_id IS NULL THEN
        INSERT INTO public.route_stop_tasks (
          tenant_id,
          route_stop_id,
          task_type,
          description,
          task_order,
          evidence_required,
          delivery_items,
          is_from_template,
          source_complaint_id,
          notes
        )
        VALUES (
          p_tenant_id,
          v_complaint.route_stop_id,
          'CUSTOM',
          'URGENT '
            || v_complaint.complaint_code
            || ': '
            || COALESCE(NULLIF(LEFT(BTRIM(v_complaint.customer_original_message), 140), ''), 'Follow up required'),
          COALESCE((
            SELECT MAX(existing.task_order) + 1
            FROM public.route_stop_tasks existing
            WHERE existing.route_stop_id = v_complaint.route_stop_id
              AND existing.archived_at IS NULL
          ), 1),
          TRUE,
          NULL,
          FALSE,
          v_complaint.complaint_id,
          'Auto-added urgent complaint task'
        )
        RETURNING id INTO v_task_id;
      END IF;

      IF v_task_id IS NOT NULL THEN
        UPDATE public.complaint_records
        SET
          linked_route_task_id = v_task_id,
          status = CASE
            WHEN status = 'OPEN' THEN 'ASSIGNED'
            ELSE status
          END,
          version_etag = gen_random_uuid()
        WHERE id = v_complaint.complaint_id
          AND tenant_id = p_tenant_id
          AND archived_at IS NULL
          AND (linked_route_task_id IS NULL OR linked_route_task_id = v_task_id);
      END IF;
    END LOOP;

    RETURN NEXT v_route;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_routes(UUID, DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
