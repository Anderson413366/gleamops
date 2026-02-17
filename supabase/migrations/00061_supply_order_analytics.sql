BEGIN;

-- ---------------------------------------------------------------------------
-- Site supply assignment enrichment for reorder planning
-- ---------------------------------------------------------------------------
ALTER TABLE public.site_supplies
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supply_catalog(id),
  ADD COLUMN IF NOT EXISTS par_level NUMERIC(10,2);

-- Backfill supply_id by normalized supply name when possible.
UPDATE public.site_supplies ss
SET supply_id = sc.id
FROM public.supply_catalog sc
WHERE ss.supply_id IS NULL
  AND lower(trim(ss.name)) = lower(trim(sc.name));

-- Backfill par level from catalog min stock when available, else 0.
UPDATE public.site_supplies ss
SET par_level = COALESCE(ss.par_level, sc.min_stock_level, 0)
FROM public.supply_catalog sc
WHERE ss.supply_id = sc.id
  AND ss.par_level IS NULL;

UPDATE public.site_supplies
SET par_level = 0
WHERE par_level IS NULL;

ALTER TABLE public.site_supplies
  ALTER COLUMN par_level SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_supplies_site_supply
  ON public.site_supplies(site_id, supply_id)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Supply order enhancements + line items
-- ---------------------------------------------------------------------------
ALTER TABLE public.supply_orders
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id),
  ADD COLUMN IF NOT EXISTS vendor_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date_est DATE,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Keep compatibility with old and new workflow status labels.
ALTER TABLE public.supply_orders DROP CONSTRAINT IF EXISTS supply_orders_status_check;
ALTER TABLE public.supply_orders
  ADD CONSTRAINT supply_orders_status_check
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'ORDERED', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'CANCELED'));

CREATE TABLE IF NOT EXISTS public.supply_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_id UUID NOT NULL REFERENCES public.supply_orders(id),
  supply_id UUID NOT NULL REFERENCES public.supply_catalog(id),
  quantity_ordered NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_supply_order_items_order
  ON public.supply_order_items(order_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.supply_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supply_order_items_select ON public.supply_order_items;
CREATE POLICY supply_order_items_select ON public.supply_order_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS supply_order_items_insert ON public.supply_order_items;
CREATE POLICY supply_order_items_insert ON public.supply_order_items
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS supply_order_items_update ON public.supply_order_items;
CREATE POLICY supply_order_items_update ON public.supply_order_items
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_supply_order_items_updated_at ON public.supply_order_items;
CREATE TRIGGER trg_supply_order_items_updated_at
  BEFORE UPDATE ON public.supply_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_supply_order_items_etag ON public.supply_order_items;
CREATE TRIGGER trg_supply_order_items_etag
  BEFORE UPDATE ON public.supply_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- Compatibility view updated with assignment planning fields.
CREATE OR REPLACE VIEW public.v_site_supply_assignments AS
SELECT
  ss.id,
  ss.tenant_id,
  ss.site_id,
  s.site_code,
  s.name AS site_name,
  COALESCE(sc.name, ss.name) AS supply_name,
  COALESCE(ss.category, sc.category) AS category,
  ss.sds_url,
  ss.notes,
  s.client_id,
  c.client_code,
  c.name AS client_name,
  ss.created_at,
  ss.updated_at,
  ss.supply_id,
  ss.par_level
FROM public.site_supplies ss
JOIN public.sites s ON s.id = ss.site_id
JOIN public.clients c ON c.id = s.client_id
LEFT JOIN public.supply_catalog sc ON sc.id = ss.supply_id
WHERE ss.archived_at IS NULL;

COMMIT;
