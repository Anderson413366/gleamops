-- =================================================================
-- Site supplies (with SDS links) + Asset requirements + Checkouts
-- =================================================================

-- Site supplies: which supplies are used at each site
-- Includes sds_url for Safety Data Sheet links (OSHA compliance)
CREATE TABLE site_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  name TEXT NOT NULL,
  category TEXT,
  sds_url TEXT,         -- Safety Data Sheet URL
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_site_supplies_site ON site_supplies(site_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_site_supplies_updated_at BEFORE UPDATE ON site_supplies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_supplies_etag BEFORE UPDATE ON site_supplies FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE site_supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY ss_select ON site_supplies FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ss_insert ON site_supplies FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ss_update ON site_supplies FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Site asset requirements: keys, vehicles, equipment needed per site
-- =================================================================
CREATE TABLE site_asset_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('KEY', 'VEHICLE', 'EQUIPMENT')),
  description TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_site_asset_reqs_site ON site_asset_requirements(site_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_site_asset_reqs_updated_at BEFORE UPDATE ON site_asset_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_asset_reqs_etag BEFORE UPDATE ON site_asset_requirements FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE site_asset_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY sar_select ON site_asset_requirements FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY sar_insert ON site_asset_requirements FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY sar_update ON site_asset_requirements FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- Ticket asset checkouts: staff confirms they have the required asset
-- One checkout per ticket per requirement — prevents double-checkout
-- =================================================================
CREATE TABLE ticket_asset_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_id UUID NOT NULL REFERENCES work_tickets(id),
  requirement_id UUID NOT NULL REFERENCES site_asset_requirements(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (ticket_id, requirement_id)
);

CREATE INDEX idx_ticket_checkouts_ticket ON ticket_asset_checkouts(ticket_id);

CREATE TRIGGER trg_ticket_checkouts_updated_at BEFORE UPDATE ON ticket_asset_checkouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ticket_checkouts_etag BEFORE UPDATE ON ticket_asset_checkouts FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE ticket_asset_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tac_select ON ticket_asset_checkouts FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tac_insert ON ticket_asset_checkouts FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tac_update ON ticket_asset_checkouts FOR UPDATE USING (tenant_id = current_tenant_id());
