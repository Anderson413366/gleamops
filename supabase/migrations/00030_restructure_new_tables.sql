-- ==========================================================================
-- Migration 00030: New tables for module restructuring
-- Equipment, Equipment Assignments, Subcontractors, Staff Positions,
-- Vehicle Maintenance, Inventory Counts, Inventory Count Details, Supply Orders
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- Equipment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  equipment_code TEXT NOT NULL,
  name         TEXT NOT NULL,
  equipment_type TEXT,
  condition    TEXT DEFAULT 'GOOD' CHECK (condition IN ('GOOD','FAIR','POOR','OUT_OF_SERVICE')),
  serial_number TEXT,
  purchase_date DATE,
  assigned_to  UUID REFERENCES public.staff(id),
  site_id      UUID REFERENCES public.sites(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, equipment_code)
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.equipment
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Equipment Assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  staff_id     UUID REFERENCES public.staff(id),
  site_id      UUID REFERENCES public.sites(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.equipment_assignments
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Vehicle Maintenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  description  TEXT,
  cost         NUMERIC(10,2),
  odometer     INTEGER,
  performed_by TEXT,
  next_service_date DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.vehicle_maintenance
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Supply Orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  order_code   TEXT NOT NULL,
  supplier     TEXT,
  order_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  status       TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ORDERED','SHIPPED','RECEIVED','CANCELLED')),
  total_amount NUMERIC(10,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, order_code)
);

ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.supply_orders
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.supply_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.supply_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Inventory Counts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  count_code   TEXT NOT NULL,
  site_id      UUID REFERENCES public.sites(id),
  counted_by   UUID REFERENCES public.staff(id),
  count_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_PROGRESS','COMPLETED')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, count_code)
);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.inventory_counts
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.inventory_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Inventory Count Details
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_count_details (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  count_id     UUID NOT NULL REFERENCES public.inventory_counts(id),
  supply_id    UUID NOT NULL,
  expected_qty NUMERIC(10,2),
  actual_qty   NUMERIC(10,2) NOT NULL DEFAULT 0,
  variance     NUMERIC(10,2) GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE public.inventory_count_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.inventory_count_details
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory_count_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.inventory_count_details
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Subcontractors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  subcontractor_code TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  status       TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','PENDING')),
  services_provided TEXT,
  insurance_expiry DATE,
  license_number TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, subcontractor_code)
);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.subcontractors
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Staff Positions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_positions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  position_code TEXT NOT NULL,
  title        TEXT NOT NULL,
  department   TEXT,
  pay_grade    TEXT,
  is_active    BOOLEAN DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at  TIMESTAMPTZ,
  archived_by  UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, position_code)
);

ALTER TABLE public.staff_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.staff_positions
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.staff_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- Add sequence seeds for new entity prefixes
-- ---------------------------------------------------------------------------
INSERT INTO public.system_sequences (id, tenant_id, prefix, current_value)
SELECT gen_random_uuid(), t.id, p.prefix, 0
FROM public.tenants t
CROSS JOIN (VALUES ('EQP'), ('SUB'), ('POS'), ('ORD'), ('CNT')) AS p(prefix)
ON CONFLICT DO NOTHING;
