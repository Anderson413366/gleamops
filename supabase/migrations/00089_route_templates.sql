BEGIN;

CREATE TABLE IF NOT EXISTS public.route_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_code TEXT NOT NULL,
  label TEXT NOT NULL,
  weekday TEXT NOT NULL,
  assigned_staff_id UUID REFERENCES public.staff(id),
  default_vehicle_id UUID REFERENCES public.vehicles(id),
  default_key_box TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_route_templates_code UNIQUE (tenant_id, template_code),
  CONSTRAINT chk_route_templates_weekday CHECK (weekday IN ('MON','TUE','WED','THU','FRI','SAT','SUN'))
);

CREATE TABLE IF NOT EXISTS public.route_template_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_id UUID NOT NULL REFERENCES public.route_templates(id),
  site_job_id UUID NOT NULL REFERENCES public.site_jobs(id),
  stop_order INTEGER NOT NULL,
  access_window_start TIME,
  access_window_end TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_route_template_stops_order CHECK (stop_order >= 1),
  CONSTRAINT chk_route_template_stops_window CHECK (
    access_window_start IS NULL OR access_window_end IS NULL OR access_window_start <= access_window_end
  )
);

CREATE TABLE IF NOT EXISTS public.route_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_stop_id UUID NOT NULL REFERENCES public.route_template_stops(id),
  task_type TEXT NOT NULL,
  description_key TEXT,
  description_override TEXT,
  task_order INTEGER NOT NULL DEFAULT 1,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_route_template_tasks_type CHECK (
    task_type IN (
      'DELIVER_PICKUP', 'FULL_CLEAN', 'LIGHT_CLEAN', 'VACUUM_MOP_TRASH',
      'INSPECTION', 'INVENTORY', 'SUPPLY_REFILL', 'RESTROOM_CLEAN',
      'FLOOR_SCRUB', 'TRAINING', 'CUSTOM'
    )
  ),
  CONSTRAINT chk_route_template_tasks_order CHECK (task_order >= 1)
);

CREATE INDEX IF NOT EXISTS idx_route_templates_tenant
  ON public.route_templates (tenant_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_templates_weekday
  ON public.route_templates (tenant_id, weekday)
  WHERE archived_at IS NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_rts_template
  ON public.route_template_stops (template_id, stop_order)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rtt_template_stop
  ON public.route_template_tasks (template_stop_id, task_order)
  WHERE archived_at IS NULL;

ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_template_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_template_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS route_templates_select ON public.route_templates;
CREATE POLICY route_templates_select
  ON public.route_templates
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_templates_insert ON public.route_templates;
CREATE POLICY route_templates_insert
  ON public.route_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_templates_update ON public.route_templates;
CREATE POLICY route_templates_update
  ON public.route_templates
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_stops_select ON public.route_template_stops;
CREATE POLICY route_template_stops_select
  ON public.route_template_stops
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_stops_insert ON public.route_template_stops;
CREATE POLICY route_template_stops_insert
  ON public.route_template_stops
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_stops_update ON public.route_template_stops;
CREATE POLICY route_template_stops_update
  ON public.route_template_stops
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_tasks_select ON public.route_template_tasks;
CREATE POLICY route_template_tasks_select
  ON public.route_template_tasks
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_tasks_insert ON public.route_template_tasks;
CREATE POLICY route_template_tasks_insert
  ON public.route_template_tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS route_template_tasks_update ON public.route_template_tasks;
CREATE POLICY route_template_tasks_update
  ON public.route_template_tasks
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP TRIGGER IF EXISTS trg_route_templates_updated_at ON public.route_templates;
CREATE TRIGGER trg_route_templates_updated_at
  BEFORE UPDATE ON public.route_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_templates_etag ON public.route_templates;
CREATE TRIGGER trg_route_templates_etag
  BEFORE UPDATE ON public.route_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_route_template_stops_updated_at ON public.route_template_stops;
CREATE TRIGGER trg_route_template_stops_updated_at
  BEFORE UPDATE ON public.route_template_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_template_stops_etag ON public.route_template_stops;
CREATE TRIGGER trg_route_template_stops_etag
  BEFORE UPDATE ON public.route_template_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_route_template_tasks_updated_at ON public.route_template_tasks;
CREATE TRIGGER trg_route_template_tasks_updated_at
  BEFORE UPDATE ON public.route_template_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_template_tasks_etag ON public.route_template_tasks;
CREATE TRIGGER trg_route_template_tasks_etag
  BEFORE UPDATE ON public.route_template_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

NOTIFY pgrst, 'reload schema';

COMMIT;
