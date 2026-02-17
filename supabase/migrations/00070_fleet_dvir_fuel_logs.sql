BEGIN;

ALTER TABLE public.vehicle_checkouts
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.routes(id),
  ADD COLUMN IF NOT EXISTS dvir_out_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS dvir_in_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS return_notes TEXT;

ALTER TABLE public.vehicle_checkouts DROP CONSTRAINT IF EXISTS chk_vehicle_checkouts_dvir_out_status;
ALTER TABLE public.vehicle_checkouts
  ADD CONSTRAINT chk_vehicle_checkouts_dvir_out_status
  CHECK (dvir_out_status IN ('PENDING','PASS','FAIL'));

ALTER TABLE public.vehicle_checkouts DROP CONSTRAINT IF EXISTS chk_vehicle_checkouts_dvir_in_status;
ALTER TABLE public.vehicle_checkouts
  ADD CONSTRAINT chk_vehicle_checkouts_dvir_in_status
  CHECK (dvir_in_status IN ('PENDING','PASS','FAIL'));

CREATE TABLE IF NOT EXISTS public.vehicle_dvir_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  checkout_id UUID NOT NULL REFERENCES public.vehicle_checkouts(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  route_id UUID REFERENCES public.routes(id),
  staff_id UUID REFERENCES public.staff(id),
  report_type TEXT NOT NULL,
  odometer INTEGER,
  fuel_level TEXT,
  checklist_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues_found BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (checkout_id, report_type),
  CONSTRAINT chk_vehicle_dvir_logs_type CHECK (report_type IN ('CHECKOUT','RETURN')),
  CONSTRAINT chk_vehicle_dvir_logs_odometer CHECK (odometer IS NULL OR odometer >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_dvir_logs_vehicle
  ON public.vehicle_dvir_logs(vehicle_id, reported_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  route_id UUID REFERENCES public.routes(id),
  checkout_id UUID REFERENCES public.vehicle_checkouts(id),
  staff_id UUID REFERENCES public.staff(id),
  odometer INTEGER,
  gallons NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(12,2),
  station_name TEXT,
  notes TEXT,
  fueled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_vehicle_fuel_logs_odometer CHECK (odometer IS NULL OR odometer >= 0),
  CONSTRAINT chk_vehicle_fuel_logs_gallons CHECK (gallons > 0),
  CONSTRAINT chk_vehicle_fuel_logs_total_cost CHECK (total_cost IS NULL OR total_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_logs_vehicle
  ON public.vehicle_fuel_logs(vehicle_id, fueled_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.vehicle_dvir_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_dvir_logs_select ON public.vehicle_dvir_logs;
CREATE POLICY vehicle_dvir_logs_select ON public.vehicle_dvir_logs
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS vehicle_dvir_logs_insert ON public.vehicle_dvir_logs;
CREATE POLICY vehicle_dvir_logs_insert ON public.vehicle_dvir_logs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS vehicle_dvir_logs_update ON public.vehicle_dvir_logs;
CREATE POLICY vehicle_dvir_logs_update ON public.vehicle_dvir_logs
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS vehicle_fuel_logs_select ON public.vehicle_fuel_logs;
CREATE POLICY vehicle_fuel_logs_select ON public.vehicle_fuel_logs
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS vehicle_fuel_logs_insert ON public.vehicle_fuel_logs;
CREATE POLICY vehicle_fuel_logs_insert ON public.vehicle_fuel_logs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS vehicle_fuel_logs_update ON public.vehicle_fuel_logs;
CREATE POLICY vehicle_fuel_logs_update ON public.vehicle_fuel_logs
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_vehicle_dvir_logs_updated_at ON public.vehicle_dvir_logs;
CREATE TRIGGER trg_vehicle_dvir_logs_updated_at
  BEFORE UPDATE ON public.vehicle_dvir_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicle_dvir_logs_etag ON public.vehicle_dvir_logs;
CREATE TRIGGER trg_vehicle_dvir_logs_etag
  BEFORE UPDATE ON public.vehicle_dvir_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_vehicle_fuel_logs_updated_at ON public.vehicle_fuel_logs;
CREATE TRIGGER trg_vehicle_fuel_logs_updated_at
  BEFORE UPDATE ON public.vehicle_fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicle_fuel_logs_etag ON public.vehicle_fuel_logs;
CREATE TRIGGER trg_vehicle_fuel_logs_etag
  BEFORE UPDATE ON public.vehicle_fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMIT;
