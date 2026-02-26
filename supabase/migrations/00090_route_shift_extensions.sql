BEGIN;

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.route_templates(id),
  ADD COLUMN IF NOT EXISTS mileage_start INTEGER,
  ADD COLUMN IF NOT EXISTS mileage_end INTEGER,
  ADD COLUMN IF NOT EXISTS key_box_number TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_cleaned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS personal_items_removed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shift_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shift_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shift_summary JSONB,
  ADD COLUMN IF NOT EXISTS shift_review_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.staff(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

ALTER TABLE public.routes
  DROP CONSTRAINT IF EXISTS chk_routes_shift_review_status;

ALTER TABLE public.routes
  ADD CONSTRAINT chk_routes_shift_review_status
  CHECK (shift_review_status IN ('PENDING', 'REVIEWED', 'NEEDS_FOLLOWUP'));

ALTER TABLE public.routes
  DROP CONSTRAINT IF EXISTS chk_routes_mileage_start;

ALTER TABLE public.routes
  ADD CONSTRAINT chk_routes_mileage_start
  CHECK (mileage_start IS NULL OR mileage_start >= 0);

ALTER TABLE public.routes
  DROP CONSTRAINT IF EXISTS chk_routes_mileage_end;

ALTER TABLE public.routes
  ADD CONSTRAINT chk_routes_mileage_end
  CHECK (mileage_end IS NULL OR mileage_end >= 0);

ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stop_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS skip_notes TEXT,
  ADD COLUMN IF NOT EXISTS access_window_start TIME,
  ADD COLUMN IF NOT EXISTS access_window_end TIME;

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_status;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_status
  CHECK (stop_status IN ('PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED'));

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_skip_reason;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_skip_reason
  CHECK (skip_reason IS NULL OR skip_reason IN ('SITE_CLOSED', 'ACCESS_ISSUE', 'TIME_CONSTRAINT', 'OTHER'));

ALTER TABLE public.route_stops
  DROP CONSTRAINT IF EXISTS chk_route_stops_access_window;

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_route_stops_access_window
  CHECK (
    access_window_start IS NULL
    OR access_window_end IS NULL
    OR access_window_start <= access_window_end
  );

CREATE TABLE IF NOT EXISTS public.route_stop_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  route_stop_id UUID NOT NULL REFERENCES public.route_stops(id),
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  task_order INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.staff(id),
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_photos JSONB,
  notes TEXT,
  delivery_items JSONB,
  is_from_template BOOLEAN NOT NULL DEFAULT TRUE,
  source_complaint_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_route_stop_tasks_type CHECK (
    task_type IN (
      'DELIVER_PICKUP', 'FULL_CLEAN', 'LIGHT_CLEAN', 'VACUUM_MOP_TRASH',
      'INSPECTION', 'INVENTORY', 'SUPPLY_REFILL', 'RESTROOM_CLEAN',
      'FLOOR_SCRUB', 'TRAINING', 'CUSTOM'
    )
  ),
  CONSTRAINT chk_route_stop_tasks_order CHECK (task_order >= 1)
);

COMMENT ON COLUMN public.route_stop_tasks.source_complaint_id IS
  'Foreign key to complaint_records.id will be added in Phase 4 migration.';

CREATE INDEX IF NOT EXISTS idx_routes_template_date
  ON public.routes (tenant_id, template_id, route_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_stops_route_status
  ON public.route_stops (route_id, stop_status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_stop_tasks_route_stop
  ON public.route_stop_tasks (route_stop_id, task_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_stop_tasks_completion
  ON public.route_stop_tasks (tenant_id, is_completed)
  WHERE archived_at IS NULL;

ALTER TABLE public.route_stop_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS route_stop_tasks_select ON public.route_stop_tasks;
CREATE POLICY route_stop_tasks_select
  ON public.route_stop_tasks
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])
  );

DROP POLICY IF EXISTS route_stop_tasks_insert ON public.route_stop_tasks;
CREATE POLICY route_stop_tasks_insert
  ON public.route_stop_tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

DROP POLICY IF EXISTS route_stop_tasks_update ON public.route_stop_tasks;
CREATE POLICY route_stop_tasks_update
  ON public.route_stop_tasks
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])
  );

DROP TRIGGER IF EXISTS trg_route_stop_tasks_updated_at ON public.route_stop_tasks;
CREATE TRIGGER trg_route_stop_tasks_updated_at
  BEFORE UPDATE ON public.route_stop_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_stop_tasks_etag ON public.route_stop_tasks;
CREATE TRIGGER trg_route_stop_tasks_etag
  BEFORE UPDATE ON public.route_stop_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

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

    RETURN NEXT v_route;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_routes(UUID, DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
