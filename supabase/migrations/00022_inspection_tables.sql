-- =================================================================
-- Milestone K: Inspections (Quality)
-- inspection_templates, inspection_template_items,
-- inspections, inspection_items, inspection_issues
-- =================================================================

-- =================================================================
-- INSPECTION TEMPLATES (admin-defined)
-- =================================================================
CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_code TEXT UNIQUE NOT NULL CHECK (template_code ~ '^INS-[0-9]{4,}$'),
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID REFERENCES services(id),
  scoring_scale INT NOT NULL DEFAULT 5, -- 0 to N
  pass_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.0, -- percentage
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_inspection_templates_tenant ON inspection_templates(tenant_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_inspection_templates_updated_at BEFORE UPDATE ON inspection_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspection_templates_etag BEFORE UPDATE ON inspection_templates FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY it_select ON inspection_templates FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY it_insert ON inspection_templates FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY it_update ON inspection_templates FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- INSPECTION TEMPLATE ITEMS
-- =================================================================
CREATE TABLE inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID NOT NULL REFERENCES inspection_templates(id),
  section TEXT,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0, -- scoring weight

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_inspection_template_items_template ON inspection_template_items(template_id);

CREATE TRIGGER trg_inspection_template_items_updated_at BEFORE UPDATE ON inspection_template_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspection_template_items_etag BEFORE UPDATE ON inspection_template_items FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE inspection_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY iti_select ON inspection_template_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY iti_insert ON inspection_template_items FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY iti_update ON inspection_template_items FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- INSPECTIONS (individual inspection records)
-- =================================================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inspection_code TEXT UNIQUE NOT NULL CHECK (inspection_code ~ '^QAI-[0-9]{4,}$'),
  template_id UUID REFERENCES inspection_templates(id),
  site_id UUID REFERENCES sites(id),
  ticket_id UUID REFERENCES work_tickets(id),
  inspector_id UUID REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | IN_PROGRESS | COMPLETED | SUBMITTED
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  score_pct NUMERIC(5,2),
  passed BOOLEAN,
  notes TEXT,
  client_version INT NOT NULL DEFAULT 1, -- for offline sync conflict resolution

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_inspections_tenant ON inspections(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_inspections_site ON inspections(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_inspections_ticket ON inspections(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id) WHERE inspector_id IS NOT NULL;

CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspections_etag BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY insp_select ON inspections FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY insp_insert ON inspections FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY insp_update ON inspections FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- INSPECTION ITEMS (scored line items)
-- =================================================================
CREATE TABLE inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id),
  template_item_id UUID REFERENCES inspection_template_items(id),
  section TEXT,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  score INT, -- 0..scoring_scale
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  photo_taken BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);

CREATE TRIGGER trg_inspection_items_updated_at BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspection_items_etag BEFORE UPDATE ON inspection_items FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ii_select ON inspection_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ii_insert ON inspection_items FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ii_update ON inspection_items FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- INSPECTION ISSUES (failed items → follow-up tickets)
-- =================================================================
CREATE TABLE inspection_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id),
  inspection_item_id UUID REFERENCES inspection_items(id),
  severity TEXT NOT NULL DEFAULT 'MINOR', -- MINOR | MAJOR | CRITICAL
  description TEXT NOT NULL,
  followup_ticket_id UUID REFERENCES work_tickets(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_inspection_issues_inspection ON inspection_issues(inspection_id);
CREATE INDEX idx_inspection_issues_unresolved ON inspection_issues(tenant_id) WHERE resolved_at IS NULL AND archived_at IS NULL;

CREATE TRIGGER trg_inspection_issues_updated_at BEFORE UPDATE ON inspection_issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inspection_issues_etag BEFORE UPDATE ON inspection_issues FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE inspection_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY iis_select ON inspection_issues FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY iis_insert ON inspection_issues FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY iis_update ON inspection_issues FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Sequence prefix for inspections
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, 'QAI', 0
FROM tenants t
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;

INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, 'INS', 0
FROM tenants t
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
