BEGIN;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS microfiber_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS microfiber_enrolled_at DATE,
  ADD COLUMN IF NOT EXISTS microfiber_exited_at DATE,
  ADD COLUMN IF NOT EXISTS microfiber_rate_per_set NUMERIC(6,2) NOT NULL DEFAULT 5.00;

CREATE TABLE IF NOT EXISTS public.microfiber_wash_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  wash_code TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  site_id UUID NOT NULL REFERENCES public.sites(id),
  wash_date DATE NOT NULL,
  sets_washed INTEGER NOT NULL DEFAULT 1,
  amount_due NUMERIC(6,2) NOT NULL,
  payroll_period_start DATE,
  payroll_period_end DATE,
  exported BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_microfiber_wash_log_code UNIQUE (tenant_id, wash_code),
  CONSTRAINT chk_microfiber_sets_washed CHECK (sets_washed >= 0),
  CONSTRAINT chk_microfiber_amount_due CHECK (amount_due >= 0),
  CONSTRAINT chk_microfiber_period CHECK (
    payroll_period_start IS NULL
    OR payroll_period_end IS NULL
    OR payroll_period_end >= payroll_period_start
  )
);

CREATE INDEX IF NOT EXISTS idx_microfiber_wash_log_tenant
  ON public.microfiber_wash_log (tenant_id, wash_date DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_microfiber_wash_log_staff
  ON public.microfiber_wash_log (tenant_id, staff_id, wash_date DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.site_supply_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  cost_code TEXT NOT NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  supply_id UUID NOT NULL REFERENCES public.supply_catalog(id),
  delivery_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,
  route_id UUID REFERENCES public.routes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_site_supply_costs_code UNIQUE (tenant_id, cost_code),
  CONSTRAINT chk_site_supply_costs_qty CHECK (quantity > 0),
  CONSTRAINT chk_site_supply_costs_unit_cost CHECK (unit_cost >= 0),
  CONSTRAINT chk_site_supply_costs_total_cost CHECK (total_cost >= 0),
  CONSTRAINT chk_site_supply_costs_source CHECK (
    source IN ('DELIVERY', 'ORDER', 'MANUAL')
  )
);

CREATE INDEX IF NOT EXISTS idx_site_supply_costs_tenant_date
  ON public.site_supply_costs (tenant_id, delivery_date DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_supply_costs_site
  ON public.site_supply_costs (tenant_id, site_id, delivery_date DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_supply_costs_supply
  ON public.site_supply_costs (tenant_id, supply_id, delivery_date DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.microfiber_wash_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS microfiber_wash_log_select ON public.microfiber_wash_log;
CREATE POLICY microfiber_wash_log_select
  ON public.microfiber_wash_log
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP POLICY IF EXISTS microfiber_wash_log_insert ON public.microfiber_wash_log;
CREATE POLICY microfiber_wash_log_insert
  ON public.microfiber_wash_log
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP POLICY IF EXISTS microfiber_wash_log_update ON public.microfiber_wash_log;
CREATE POLICY microfiber_wash_log_update
  ON public.microfiber_wash_log
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

ALTER TABLE public.site_supply_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_supply_costs_select ON public.site_supply_costs;
CREATE POLICY site_supply_costs_select
  ON public.site_supply_costs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP POLICY IF EXISTS site_supply_costs_insert ON public.site_supply_costs;
CREATE POLICY site_supply_costs_insert
  ON public.site_supply_costs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER'])
  );

DROP POLICY IF EXISTS site_supply_costs_update ON public.site_supply_costs;
CREATE POLICY site_supply_costs_update
  ON public.site_supply_costs
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP TRIGGER IF EXISTS trg_microfiber_wash_log_updated_at ON public.microfiber_wash_log;
CREATE TRIGGER trg_microfiber_wash_log_updated_at
  BEFORE UPDATE ON public.microfiber_wash_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_microfiber_wash_log_etag ON public.microfiber_wash_log;
CREATE TRIGGER trg_microfiber_wash_log_etag
  BEFORE UPDATE ON public.microfiber_wash_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_microfiber_wash_log_no_hard_delete ON public.microfiber_wash_log;
CREATE TRIGGER trg_microfiber_wash_log_no_hard_delete
  BEFORE DELETE ON public.microfiber_wash_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_site_supply_costs_updated_at ON public.site_supply_costs;
CREATE TRIGGER trg_site_supply_costs_updated_at
  BEFORE UPDATE ON public.site_supply_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_site_supply_costs_etag ON public.site_supply_costs;
CREATE TRIGGER trg_site_supply_costs_etag
  BEFORE UPDATE ON public.site_supply_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_site_supply_costs_no_hard_delete ON public.site_supply_costs;
CREATE TRIGGER trg_site_supply_costs_no_hard_delete
  BEFORE DELETE ON public.site_supply_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

NOTIFY pgrst, 'reload schema';

COMMIT;
