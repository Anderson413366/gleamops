-- =================================================================
-- Inventory & Asset Management tables
-- supply_catalog, supply_kits, supply_kit_items, vehicles, key_inventory
-- =================================================================

-- =================================================================
-- Supply catalog: master list of available supplies (tenant-wide)
-- =================================================================
CREATE TABLE supply_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^SUP-[0-9]{3,}$'),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'EA',
  sds_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_supply_catalog_tenant ON supply_catalog(tenant_id) WHERE archived_at IS NULL;
CREATE TRIGGER trg_supply_catalog_updated_at BEFORE UPDATE ON supply_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_supply_catalog_etag BEFORE UPDATE ON supply_catalog FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE supply_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_select ON supply_catalog FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY sc_insert ON supply_catalog FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY sc_update ON supply_catalog FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Supply kits: bundles of supplies for job types
-- =================================================================
CREATE TABLE supply_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^KIT-[0-9]{3,}$'),
  name TEXT NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_supply_kits_tenant ON supply_kits(tenant_id) WHERE archived_at IS NULL;
CREATE TRIGGER trg_supply_kits_updated_at BEFORE UPDATE ON supply_kits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_supply_kits_etag BEFORE UPDATE ON supply_kits FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE supply_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY sk_select ON supply_kits FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY sk_insert ON supply_kits FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY sk_update ON supply_kits FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Supply kit items: which supplies are in each kit
-- =================================================================
CREATE TABLE supply_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  kit_id UUID NOT NULL REFERENCES supply_kits(id),
  supply_id UUID NOT NULL REFERENCES supply_catalog(id),
  quantity NUMERIC NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (kit_id, supply_id)
);

CREATE INDEX idx_kit_items_kit ON supply_kit_items(kit_id) WHERE archived_at IS NULL;
CREATE TRIGGER trg_kit_items_updated_at BEFORE UPDATE ON supply_kit_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kit_items_etag BEFORE UPDATE ON supply_kit_items FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE supply_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ski_select ON supply_kit_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ski_insert ON supply_kit_items FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ski_update ON supply_kit_items FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Vehicles: fleet management
-- =================================================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_code TEXT UNIQUE NOT NULL CHECK (vehicle_code ~ '^VEH-[0-9]{3,}$'),
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INT,
  license_plate TEXT,
  vin TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IN_SHOP', 'RETIRED')),
  assigned_to UUID REFERENCES staff(id),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id) WHERE archived_at IS NULL;
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicles_etag BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY veh_select ON vehicles FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY veh_insert ON vehicles FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY veh_update ON vehicles FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Key inventory: key tracking
-- =================================================================
CREATE TABLE key_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key_code TEXT UNIQUE NOT NULL CHECK (key_code ~ '^KEY-[0-9]{3,}$'),
  site_id UUID REFERENCES sites(id),
  key_type TEXT NOT NULL DEFAULT 'STANDARD' CHECK (key_type IN ('STANDARD', 'FOB', 'CARD', 'CODE', 'OTHER')),
  label TEXT NOT NULL,
  total_count INT NOT NULL DEFAULT 1,
  assigned_to UUID REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'LOST', 'RETURNED')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_key_inventory_tenant ON key_inventory(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_key_inventory_site ON key_inventory(site_id) WHERE archived_at IS NULL;
CREATE TRIGGER trg_key_inventory_updated_at BEFORE UPDATE ON key_inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_key_inventory_etag BEFORE UPDATE ON key_inventory FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE key_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY ki_select ON key_inventory FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ki_insert ON key_inventory FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ki_update ON key_inventory FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Sequence seeds for new entity prefixes
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, prefix, 0
FROM tenants t
CROSS JOIN (VALUES ('SUP'), ('KIT'), ('VEH'), ('KEY')) AS prefixes(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
