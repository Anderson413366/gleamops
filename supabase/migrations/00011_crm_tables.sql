-- =================================================================
-- Milestone D: CRM Core Tables
-- clients, sites, contacts, timeline_events
-- =================================================================

-- =================================================================
-- CLIENTS
-- =================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_code TEXT UNIQUE NOT NULL CHECK (client_code ~ '^CLI-[0-9]{4,}$'),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  billing_address JSONB,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Indexes
CREATE INDEX idx_clients_tenant_active ON clients(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_clients_code ON clients(client_code);
CREATE INDEX idx_clients_status ON clients(tenant_id, status) WHERE archived_at IS NULL;
CREATE INDEX idx_clients_search ON clients USING GIN (to_tsvector('english', name));

-- Triggers
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_etag
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON clients
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

-- =================================================================
-- SITES
-- =================================================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_code TEXT UNIQUE NOT NULL CHECK (site_code ~ '^SIT-[0-9]{4,}$'),
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  address JSONB NOT NULL DEFAULT '{}',
  alarm_code TEXT,
  access_notes TEXT,
  square_footage NUMERIC,
  geofence_center_lat NUMERIC,
  geofence_center_lng NUMERIC,
  geofence_radius_meters NUMERIC DEFAULT 50,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Indexes
CREATE INDEX idx_sites_tenant_active ON sites(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_sites_client ON sites(client_id);
CREATE INDEX idx_sites_code ON sites(site_code);
CREATE INDEX idx_sites_search ON sites USING GIN (to_tsvector('english', name));

-- Triggers
CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites_etag
  BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY sites_select ON sites
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
      OR user_can_access_site(auth.uid(), id)
    )
  );

CREATE POLICY sites_insert ON sites
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

CREATE POLICY sites_update ON sites
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

-- =================================================================
-- CONTACTS
-- =================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_code TEXT UNIQUE NOT NULL CHECK (contact_code ~ '^CON-[0-9]{4,}$'),
  client_id UUID REFERENCES clients(id),
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  -- A contact must belong to at least a client or a site
  CONSTRAINT contacts_parent_check CHECK (client_id IS NOT NULL OR site_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_contacts_tenant_active ON contacts(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_contacts_site ON contacts(site_id);
CREATE INDEX idx_contacts_code ON contacts(contact_code);
CREATE INDEX idx_contacts_search ON contacts USING GIN (to_tsvector('english', name));

-- Triggers
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_etag
  BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select ON contacts
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY contacts_insert ON contacts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

CREATE POLICY contacts_update ON contacts
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES'])
  );

-- =================================================================
-- TIMELINE EVENTS (activity feed per entity)
-- =================================================================
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_timeline_entity ON timeline_events(tenant_id, entity_type, entity_id);
CREATE INDEX idx_timeline_created ON timeline_events(created_at DESC);

-- RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_select ON timeline_events
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY timeline_insert ON timeline_events
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Initial sequence values for CRM codes
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, prefix, 1000
FROM tenants t
CROSS JOIN (VALUES ('CLI'), ('SIT'), ('CON')) AS prefixes(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
