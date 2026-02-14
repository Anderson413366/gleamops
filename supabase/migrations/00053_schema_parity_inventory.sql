-- ==========================================================================
-- 00053_schema_parity_inventory.sql
-- P1 Schema Parity: Inventory forms + processed responses
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. inventory_forms — Configurable inventory count / inspection forms
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  form_code     TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  form_type     TEXT NOT NULL DEFAULT 'INVENTORY_COUNT'
                CHECK (form_type IN ('INVENTORY_COUNT','SUPPLY_AUDIT','EQUIPMENT_CHECK','CUSTOM')),
  schema_data   JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, form_code)
);

-- ---------------------------------------------------------------------------
-- 2. processed_form_responses — Submitted form data with processing status
-- ---------------------------------------------------------------------------
CREATE TABLE processed_form_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  form_id         UUID NOT NULL REFERENCES inventory_forms(id),
  response_code   TEXT NOT NULL,
  submitted_by    UUID REFERENCES staff(id),
  site_id         UUID REFERENCES sites(id),
  response_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'SUBMITTED'
                  CHECK (status IN ('SUBMITTED','PROCESSING','PROCESSED','REJECTED','ERROR')),
  processed_at    TIMESTAMPTZ,
  processed_by    UUID,
  processing_notes TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, response_code)
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX idx_inventory_forms_tenant    ON inventory_forms(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_inventory_forms_type      ON inventory_forms(tenant_id, form_type) WHERE archived_at IS NULL;
CREATE INDEX idx_inventory_forms_active    ON inventory_forms(tenant_id, is_active) WHERE archived_at IS NULL;

CREATE INDEX idx_proc_form_resp_tenant     ON processed_form_responses(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_proc_form_resp_form       ON processed_form_responses(form_id) WHERE archived_at IS NULL;
CREATE INDEX idx_proc_form_resp_site       ON processed_form_responses(site_id) WHERE archived_at IS NULL AND site_id IS NOT NULL;
CREATE INDEX idx_proc_form_resp_status     ON processed_form_responses(status) WHERE archived_at IS NULL;
CREATE INDEX idx_proc_form_resp_submitted  ON processed_form_responses(submitted_at DESC) WHERE archived_at IS NULL;

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================
CREATE TRIGGER trg_inventory_forms_updated_at       BEFORE UPDATE ON inventory_forms       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_forms_etag             BEFORE UPDATE ON inventory_forms       FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_proc_form_resp_updated_at        BEFORE UPDATE ON processed_form_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proc_form_resp_etag              BEFORE UPDATE ON processed_form_responses FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- ===========================================================================
-- HARD DELETE PREVENTION
-- ===========================================================================
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inventory_forms             FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON processed_form_responses    FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'inventory_forms', 'processed_form_responses'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'CREATE POLICY %I_tenant_select ON %I FOR SELECT USING (tenant_id = current_tenant_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_tenant_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_tenant_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_tenant_update ON %I FOR UPDATE USING (tenant_id = current_tenant_id())',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
