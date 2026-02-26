BEGIN;

CREATE TABLE IF NOT EXISTS public.periodic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  periodic_code TEXT NOT NULL,
  site_job_id UUID NOT NULL REFERENCES public.site_jobs(id),
  task_type TEXT NOT NULL,
  description_key TEXT,
  description_override TEXT,
  frequency TEXT NOT NULL,
  custom_interval_days INTEGER,
  last_completed_at TIMESTAMPTZ,
  last_completed_route_id UUID REFERENCES public.routes(id),
  next_due_date DATE NOT NULL,
  auto_add_to_route BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_staff_id UUID REFERENCES public.staff(id),
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_periodic_tasks_code UNIQUE (tenant_id, periodic_code),
  CONSTRAINT chk_periodic_tasks_type CHECK (
    task_type IN (
      'DELIVER_PICKUP', 'FULL_CLEAN', 'LIGHT_CLEAN', 'VACUUM_MOP_TRASH',
      'INSPECTION', 'INVENTORY', 'SUPPLY_REFILL', 'RESTROOM_CLEAN',
      'FLOOR_SCRUB', 'TRAINING', 'CUSTOM'
    )
  ),
  CONSTRAINT chk_periodic_tasks_frequency CHECK (
    frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM')
  ),
  CONSTRAINT chk_periodic_tasks_custom_interval CHECK (
    custom_interval_days IS NULL OR custom_interval_days > 0
  ),
  CONSTRAINT chk_periodic_tasks_frequency_custom_rule CHECK (
    (
      frequency = 'CUSTOM'
      AND custom_interval_days IS NOT NULL
      AND custom_interval_days > 0
    )
    OR (
      frequency <> 'CUSTOM'
      AND custom_interval_days IS NULL
    )
  ),
  CONSTRAINT chk_periodic_tasks_status CHECK (
    status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')
  )
);

CREATE INDEX IF NOT EXISTS idx_periodic_tasks_tenant
  ON public.periodic_tasks (tenant_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_periodic_tasks_site_job
  ON public.periodic_tasks (tenant_id, site_job_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_periodic_tasks_due
  ON public.periodic_tasks (tenant_id, next_due_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_periodic_tasks_status
  ON public.periodic_tasks (tenant_id, status)
  WHERE archived_at IS NULL;

ALTER TABLE public.periodic_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS periodic_tasks_select ON public.periodic_tasks;
CREATE POLICY periodic_tasks_select
  ON public.periodic_tasks
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER'])
  );

DROP POLICY IF EXISTS periodic_tasks_insert ON public.periodic_tasks;
CREATE POLICY periodic_tasks_insert
  ON public.periodic_tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP POLICY IF EXISTS periodic_tasks_update ON public.periodic_tasks;
CREATE POLICY periodic_tasks_update
  ON public.periodic_tasks
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP TRIGGER IF EXISTS trg_periodic_tasks_updated_at ON public.periodic_tasks;
CREATE TRIGGER trg_periodic_tasks_updated_at
  BEFORE UPDATE ON public.periodic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_periodic_tasks_etag ON public.periodic_tasks;
CREATE TRIGGER trg_periodic_tasks_etag
  BEFORE UPDATE ON public.periodic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.periodic_tasks;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.periodic_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

CREATE OR REPLACE FUNCTION public.complete_periodic_task(
  p_periodic_id UUID,
  p_completed_at TIMESTAMPTZ DEFAULT now(),
  p_route_id UUID DEFAULT NULL
)
RETURNS public.periodic_tasks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_periodic public.periodic_tasks%ROWTYPE;
  v_completed_at TIMESTAMPTZ;
  v_next_due DATE;
BEGIN
  IF p_periodic_id IS NULL THEN
    RAISE EXCEPTION 'p_periodic_id is required';
  END IF;

  v_completed_at := COALESCE(p_completed_at, now());

  SELECT *
  INTO v_periodic
  FROM public.periodic_tasks
  WHERE id = p_periodic_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periodic task not found';
  END IF;

  IF v_periodic.frequency = 'CUSTOM' AND (v_periodic.custom_interval_days IS NULL OR v_periodic.custom_interval_days <= 0) THEN
    RAISE EXCEPTION 'CUSTOM periodic tasks require custom_interval_days > 0';
  END IF;

  v_next_due := CASE v_periodic.frequency
    WHEN 'WEEKLY' THEN (v_completed_at::DATE + INTERVAL '7 days')::DATE
    WHEN 'BIWEEKLY' THEN (v_completed_at::DATE + INTERVAL '14 days')::DATE
    WHEN 'MONTHLY' THEN (v_completed_at::DATE + INTERVAL '1 month')::DATE
    WHEN 'QUARTERLY' THEN (v_completed_at::DATE + INTERVAL '3 months')::DATE
    ELSE (
      v_completed_at::DATE
      + make_interval(days => COALESCE(v_periodic.custom_interval_days, 1))
    )::DATE
  END;

  UPDATE public.periodic_tasks
  SET
    last_completed_at = v_completed_at,
    last_completed_route_id = p_route_id,
    next_due_date = v_next_due,
    version_etag = gen_random_uuid()
  WHERE id = p_periodic_id
  RETURNING * INTO v_periodic;

  RETURN v_periodic;
END;
$$;

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

    RETURN NEXT v_route;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_periodic_task(UUID, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_routes(UUID, DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
