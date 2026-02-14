-- ==========================================================================
-- 00051_schema_parity_core.sql
-- P1 Schema Parity: Site classification + job scheduling tables
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. site_types — Cleaning site classifications (Office, Warehouse, Medical…)
-- ---------------------------------------------------------------------------
CREATE TABLE site_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, code)
);

-- ---------------------------------------------------------------------------
-- 2. site_areas — Named areas within a site (Lobby, Restrooms, Kitchen…)
-- ---------------------------------------------------------------------------
CREATE TABLE site_areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  site_id     UUID NOT NULL REFERENCES sites(id),
  name        TEXT NOT NULL,
  area_type   TEXT,
  square_footage NUMERIC(12,2),
  floor_number   INTEGER,
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid()
);

-- ---------------------------------------------------------------------------
-- 3. site_type_tasks — Default tasks for each site type
-- ---------------------------------------------------------------------------
CREATE TABLE site_type_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  site_type_id  UUID NOT NULL REFERENCES site_types(id),
  task_id       UUID NOT NULL REFERENCES tasks(id),
  frequency     TEXT NOT NULL DEFAULT 'DAILY',
  is_required   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (site_type_id, task_id)
);

-- ---------------------------------------------------------------------------
-- 4. job_schedule_rules — Complement to recurrence_rules with richer config
-- ---------------------------------------------------------------------------
CREATE TABLE job_schedule_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  site_job_id     UUID NOT NULL REFERENCES site_jobs(id),
  recurrence_rule_id UUID REFERENCES recurrence_rules(id),
  rule_type       TEXT NOT NULL DEFAULT 'WEEKLY'
                  CHECK (rule_type IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','CUSTOM')),
  days_of_week    INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  week_interval   INTEGER NOT NULL DEFAULT 1,
  month_day       INTEGER,
  start_time      TIME,
  end_time        TIME,
  effective_from  DATE NOT NULL,
  effective_until DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at    TIMESTAMPTZ,
  archived_by    UUID,
  archive_reason TEXT,
  version_etag   UUID NOT NULL DEFAULT gen_random_uuid()
);

-- ---------------------------------------------------------------------------
-- 5. Add site_type_id FK to sites table
-- ---------------------------------------------------------------------------
ALTER TABLE sites ADD COLUMN IF NOT EXISTS site_type_id UUID REFERENCES site_types(id);

-- ===========================================================================
-- INDEXES
-- ===========================================================================
CREATE INDEX idx_site_types_tenant       ON site_types(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_site_types_active       ON site_types(tenant_id, is_active) WHERE archived_at IS NULL;

CREATE INDEX idx_site_areas_tenant       ON site_areas(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_site_areas_site         ON site_areas(site_id) WHERE archived_at IS NULL;

CREATE INDEX idx_site_type_tasks_tenant  ON site_type_tasks(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_site_type_tasks_type    ON site_type_tasks(site_type_id) WHERE archived_at IS NULL;

CREATE INDEX idx_job_schedule_rules_tenant  ON job_schedule_rules(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_job_schedule_rules_job     ON job_schedule_rules(site_job_id) WHERE archived_at IS NULL;
CREATE INDEX idx_job_schedule_rules_active  ON job_schedule_rules(site_job_id, is_active) WHERE archived_at IS NULL;

CREATE INDEX idx_sites_site_type         ON sites(site_type_id) WHERE archived_at IS NULL AND site_type_id IS NOT NULL;

-- ===========================================================================
-- TRIGGERS  (updated_at + version_etag)
-- ===========================================================================
CREATE TRIGGER trg_site_types_updated_at          BEFORE UPDATE ON site_types          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_types_etag                BEFORE UPDATE ON site_types          FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_site_areas_updated_at          BEFORE UPDATE ON site_areas          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_areas_etag                BEFORE UPDATE ON site_areas          FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_site_type_tasks_updated_at     BEFORE UPDATE ON site_type_tasks     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_type_tasks_etag           BEFORE UPDATE ON site_type_tasks     FOR EACH ROW EXECUTE FUNCTION set_version_etag();

CREATE TRIGGER trg_job_schedule_rules_updated_at  BEFORE UPDATE ON job_schedule_rules  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_schedule_rules_etag        BEFORE UPDATE ON job_schedule_rules  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- ===========================================================================
-- HARD DELETE PREVENTION
-- ===========================================================================
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_types          FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_areas          FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_type_tasks     FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON job_schedule_rules  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'site_types', 'site_areas', 'site_type_tasks', 'job_schedule_rules'
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
