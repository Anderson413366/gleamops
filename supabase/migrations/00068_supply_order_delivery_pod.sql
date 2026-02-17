BEGIN;

ALTER TABLE public.supply_orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.supply_order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_id UUID NOT NULL REFERENCES public.supply_orders(id),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_name TEXT NOT NULL,
  recipient_title TEXT,
  notes TEXT,
  signature_file_id UUID REFERENCES public.files(id),
  photo_file_id UUID REFERENCES public.files(id),
  gps_lat NUMERIC(9,6),
  gps_lng NUMERIC(9,6),
  gps_accuracy_meters NUMERIC(10,2),
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  captured_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, order_id),
  CONSTRAINT chk_supply_order_deliveries_lat CHECK (gps_lat IS NULL OR (gps_lat >= -90 AND gps_lat <= 90)),
  CONSTRAINT chk_supply_order_deliveries_lng CHECK (gps_lng IS NULL OR (gps_lng >= -180 AND gps_lng <= 180))
);

CREATE INDEX IF NOT EXISTS idx_supply_order_deliveries_order
  ON public.supply_order_deliveries(order_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supply_order_deliveries_delivered_at
  ON public.supply_order_deliveries(delivered_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.supply_order_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supply_order_deliveries_select ON public.supply_order_deliveries;
CREATE POLICY supply_order_deliveries_select ON public.supply_order_deliveries
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS supply_order_deliveries_insert ON public.supply_order_deliveries;
CREATE POLICY supply_order_deliveries_insert ON public.supply_order_deliveries
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS supply_order_deliveries_update ON public.supply_order_deliveries;
CREATE POLICY supply_order_deliveries_update ON public.supply_order_deliveries
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_supply_order_deliveries_updated_at ON public.supply_order_deliveries;
CREATE TRIGGER trg_supply_order_deliveries_updated_at
  BEFORE UPDATE ON public.supply_order_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_supply_order_deliveries_etag ON public.supply_order_deliveries;
CREATE TRIGGER trg_supply_order_deliveries_etag
  BEFORE UPDATE ON public.supply_order_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMIT;
