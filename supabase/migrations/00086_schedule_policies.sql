BEGIN;

CREATE TABLE IF NOT EXISTS public.schedule_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  site_id UUID REFERENCES public.sites(id),
  min_rest_hours NUMERIC(5,2) NOT NULL DEFAULT 8,
  max_weekly_hours NUMERIC(7,2) NOT NULL DEFAULT 40,
  overtime_warning_at_hours NUMERIC(7,2) NOT NULL DEFAULT 38,
  rest_enforcement TEXT NOT NULL DEFAULT 'warn',
  weekly_hours_enforcement TEXT NOT NULL DEFAULT 'warn',
  subcontractor_capacity_enforcement TEXT NOT NULL DEFAULT 'warn',
  availability_enforcement TEXT NOT NULL DEFAULT 'warn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, site_id),
  CONSTRAINT chk_schedule_policy_rest_hours CHECK (min_rest_hours >= 0),
  CONSTRAINT chk_schedule_policy_weekly_hours CHECK (max_weekly_hours >= 0),
  CONSTRAINT chk_schedule_policy_overtime_warning CHECK (overtime_warning_at_hours >= 0),
  CONSTRAINT chk_schedule_policy_rest_enforcement CHECK (rest_enforcement IN ('warn','block','override_required')),
  CONSTRAINT chk_schedule_policy_weekly_enforcement CHECK (weekly_hours_enforcement IN ('warn','block','override_required')),
  CONSTRAINT chk_schedule_policy_sub_capacity_enforcement CHECK (subcontractor_capacity_enforcement IN ('warn','block','override_required')),
  CONSTRAINT chk_schedule_policy_availability_enforcement CHECK (availability_enforcement IN ('warn','block','override_required'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_policies_tenant_site
  ON public.schedule_policies(tenant_id, site_id)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_schedule_policies_updated_at ON public.schedule_policies;
CREATE TRIGGER trg_schedule_policies_updated_at
  BEFORE UPDATE ON public.schedule_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_schedule_policies_etag ON public.schedule_policies;
CREATE TRIGGER trg_schedule_policies_etag
  BEFORE UPDATE ON public.schedule_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.schedule_policies;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.schedule_policies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

ALTER TABLE public.schedule_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_policies_select ON public.schedule_policies;
CREATE POLICY schedule_policies_select ON public.schedule_policies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS schedule_policies_insert ON public.schedule_policies;
CREATE POLICY schedule_policies_insert ON public.schedule_policies
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS schedule_policies_update ON public.schedule_policies;
CREATE POLICY schedule_policies_update ON public.schedule_policies
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

CREATE OR REPLACE FUNCTION public.fn_get_schedule_policy(p_site_id UUID)
RETURNS public.schedule_policies
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  v_policy public.schedule_policies%ROWTYPE;
BEGIN
  SELECT *
  INTO v_policy
  FROM public.schedule_policies sp
  WHERE sp.tenant_id = current_tenant_id()
    AND sp.archived_at IS NULL
    AND sp.site_id IS NOT DISTINCT FROM p_site_id
  ORDER BY sp.updated_at DESC
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    SELECT *
    INTO v_policy
    FROM public.schedule_policies sp
    WHERE sp.tenant_id = current_tenant_id()
      AND sp.archived_at IS NULL
      AND sp.site_id IS NULL
    ORDER BY sp.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_policy.id IS NULL THEN
    INSERT INTO public.schedule_policies (
      tenant_id,
      site_id,
      min_rest_hours,
      max_weekly_hours,
      overtime_warning_at_hours,
      rest_enforcement,
      weekly_hours_enforcement,
      subcontractor_capacity_enforcement,
      availability_enforcement
    )
    VALUES (
      current_tenant_id(),
      NULL,
      8,
      40,
      38,
      'warn',
      'warn',
      'warn',
      'warn'
    )
    RETURNING * INTO v_policy;
  END IF;

  RETURN v_policy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_schedule_policy(UUID) TO authenticated;

COMMIT;
