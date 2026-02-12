-- =================================================================
-- Milestone E (prereq): Service DNA Tables
-- tasks, task_production_rates, services, service_tasks
-- =================================================================

-- =================================================================
-- TASKS (the atomic cleaning activities)
-- =================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  task_code TEXT UNIQUE NOT NULL CHECK (task_code ~ '^TSK-[0-9]{3,}$'),
  name TEXT NOT NULL,
  production_rate_sqft_per_hour NUMERIC,
  category TEXT,
  unit_code TEXT NOT NULL DEFAULT 'SQFT_1000',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_tasks_tenant_active ON tasks(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_tasks_code ON tasks(task_code);
CREATE INDEX idx_tasks_search ON tasks USING GIN (to_tsvector('english', name));

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_etag BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_select ON tasks FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (
  tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (
  tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
);

-- =================================================================
-- TASK PRODUCTION RATES (most-specific-match lookup)
-- =================================================================
CREATE TABLE task_production_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  floor_type_code TEXT,
  building_type_code TEXT,
  unit_code TEXT NOT NULL DEFAULT 'SQFT_1000',
  base_minutes NUMERIC NOT NULL,
  default_ml_adjustment NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_task_prod_rates_lookup ON task_production_rates(tenant_id, task_id, floor_type_code, building_type_code) WHERE is_active = true;

CREATE TRIGGER trg_task_prod_rates_updated_at BEFORE UPDATE ON task_production_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_prod_rates_etag BEFORE UPDATE ON task_production_rates FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE task_production_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tpr_select ON task_production_rates FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tpr_insert ON task_production_rates FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));
CREATE POLICY tpr_update ON task_production_rates FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));

-- =================================================================
-- SERVICES (named grouping of tasks)
-- =================================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_code TEXT UNIQUE NOT NULL CHECK (service_code ~ '^SER-[0-9]{3,}$'),
  name TEXT NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_services_tenant_active ON services(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_services_code ON services(service_code);

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_etag BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_select ON services FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY services_insert ON services FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));
CREATE POLICY services_update ON services FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));

-- =================================================================
-- SERVICE TASKS (maps tasks to a service template)
-- =================================================================
CREATE TABLE service_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_id UUID NOT NULL REFERENCES services(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  frequency_default TEXT NOT NULL DEFAULT 'DAILY',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (tenant_id, service_id, task_id)
);

CREATE INDEX idx_service_tasks_service ON service_tasks(service_id);
CREATE INDEX idx_service_tasks_task ON service_tasks(task_id);

CREATE TRIGGER trg_service_tasks_updated_at BEFORE UPDATE ON service_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_tasks_etag BEFORE UPDATE ON service_tasks FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE service_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY st_select ON service_tasks FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY st_insert ON service_tasks FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));
CREATE POLICY st_update ON service_tasks FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER']));

-- =================================================================
-- SEED: Initial sequence values
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, prefix, 0
FROM tenants t
CROSS JOIN (VALUES ('TSK'), ('SER')) AS prefixes(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
