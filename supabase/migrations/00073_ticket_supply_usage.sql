-- Migration 00073: Ticket Supply Usage
-- Records supply consumption per work ticket (cleaning visit).

CREATE TABLE ticket_supply_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_id UUID NOT NULL REFERENCES work_tickets(id),
  supply_id UUID NOT NULL REFERENCES supply_catalog(id),
  quantity_used NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'EACH',
  logged_by UUID REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE ticket_supply_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ticket_supply_usage
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ticket_supply_usage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_version_etag BEFORE UPDATE ON ticket_supply_usage
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE INDEX idx_ticket_supply_usage_ticket ON ticket_supply_usage(ticket_id);
CREATE INDEX idx_ticket_supply_usage_supply ON ticket_supply_usage(supply_id);
