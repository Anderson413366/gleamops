-- =================================================================
-- Milestone L: Checklists + Photos
-- checklist_templates, template_items, ticket_checklists,
-- ticket_checklist_items, ticket_photos
-- =================================================================

-- =================================================================
-- CHECKLIST TEMPLATES (admin-defined)
-- =================================================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_code TEXT UNIQUE NOT NULL CHECK (template_code ~ '^CLT-[0-9]{4,}$'),
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID REFERENCES services(id),
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_checklist_templates_tenant ON checklist_templates(tenant_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_checklist_templates_etag BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY clt_select ON checklist_templates FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY clt_insert ON checklist_templates FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));
CREATE POLICY clt_update ON checklist_templates FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));

-- =================================================================
-- CHECKLIST TEMPLATE ITEMS
-- =================================================================
CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID NOT NULL REFERENCES checklist_templates(id),
  section TEXT,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_template_items_template ON checklist_template_items(template_id);

CREATE TRIGGER trg_template_items_updated_at BEFORE UPDATE ON checklist_template_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_template_items_etag BEFORE UPDATE ON checklist_template_items FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cti_select ON checklist_template_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY cti_insert ON checklist_template_items FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY cti_update ON checklist_template_items FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TICKET CHECKLISTS (instantiated from template for a ticket)
-- =================================================================
CREATE TABLE ticket_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_id UUID NOT NULL REFERENCES work_tickets(id),
  template_id UUID REFERENCES checklist_templates(id),
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | IN_PROGRESS | COMPLETED
  completed_at TIMESTAMPTZ,
  completed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (ticket_id)
);

CREATE INDEX idx_ticket_checklists_ticket ON ticket_checklists(ticket_id);

CREATE TRIGGER trg_ticket_checklists_updated_at BEFORE UPDATE ON ticket_checklists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ticket_checklists_etag BEFORE UPDATE ON ticket_checklists FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE ticket_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY tc_select ON ticket_checklists FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tc_insert ON ticket_checklists FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tc_update ON ticket_checklists FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TICKET CHECKLIST ITEMS (individual checklist items)
-- =================================================================
CREATE TABLE ticket_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  checklist_id UUID NOT NULL REFERENCES ticket_checklists(id),
  template_item_id UUID REFERENCES checklist_template_items(id),
  section TEXT,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_checklist_items_checklist ON ticket_checklist_items(checklist_id);

CREATE TRIGGER trg_checklist_items_updated_at BEFORE UPDATE ON ticket_checklist_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_checklist_items_etag BEFORE UPDATE ON ticket_checklist_items FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE ticket_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tci_select ON ticket_checklist_items FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tci_insert ON ticket_checklist_items FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tci_update ON ticket_checklist_items FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TICKET PHOTOS
-- =================================================================
CREATE TABLE ticket_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_id UUID NOT NULL REFERENCES work_tickets(id),
  checklist_item_id UUID REFERENCES ticket_checklist_items(id),
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes INT,
  caption TEXT,
  uploaded_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_ticket_photos_ticket ON ticket_photos(ticket_id);
CREATE INDEX idx_ticket_photos_item ON ticket_photos(checklist_item_id) WHERE checklist_item_id IS NOT NULL;

CREATE TRIGGER trg_ticket_photos_updated_at BEFORE UPDATE ON ticket_photos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ticket_photos_etag BEFORE UPDATE ON ticket_photos FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE ticket_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tp_select ON ticket_photos FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tp_insert ON ticket_photos FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tp_update ON ticket_photos FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Sequence prefix for checklist templates
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, 'CLT', 0
FROM tenants t
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
