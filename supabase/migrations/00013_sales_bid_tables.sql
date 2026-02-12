-- =================================================================
-- Milestone E: Sales Pipeline + Bidding Tables
-- prospects, opportunities, bids, bid versions, areas, tasks,
-- schedule, labor rates, burden, workload results, pricing results
-- =================================================================

-- =================================================================
-- SALES PROSPECTS
-- =================================================================
CREATE TABLE sales_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  prospect_code TEXT UNIQUE NOT NULL CHECK (prospect_code ~ '^PRO-[0-9]{4,}$'),
  company_name TEXT NOT NULL,
  prospect_status_code TEXT NOT NULL DEFAULT 'NEW',
  owner_user_id UUID,
  notes TEXT,
  source TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_prospects_tenant_active ON sales_prospects(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_prospects_status ON sales_prospects(tenant_id, prospect_status_code);

CREATE TRIGGER trg_prospects_updated_at BEFORE UPDATE ON sales_prospects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_prospects_etag BEFORE UPDATE ON sales_prospects FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY prospects_select ON sales_prospects FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY prospects_insert ON sales_prospects FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY prospects_update ON sales_prospects FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));

-- =================================================================
-- SALES PROSPECT CONTACTS
-- =================================================================
CREATE TABLE sales_prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  prospect_id UUID NOT NULL REFERENCES sales_prospects(id),
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_prospect_contacts_prospect ON sales_prospect_contacts(prospect_id);

CREATE TRIGGER trg_prospect_contacts_updated_at BEFORE UPDATE ON sales_prospect_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_prospect_contacts_etag BEFORE UPDATE ON sales_prospect_contacts FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_prospect_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY spc_select ON sales_prospect_contacts FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY spc_insert ON sales_prospect_contacts FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY spc_update ON sales_prospect_contacts FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES OPPORTUNITIES
-- =================================================================
CREATE TABLE sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  opportunity_code TEXT UNIQUE NOT NULL CHECK (opportunity_code ~ '^OPP-[0-9]{4,}$'),
  prospect_id UUID REFERENCES sales_prospects(id),
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  stage_code TEXT NOT NULL DEFAULT 'QUALIFIED',
  owner_user_id UUID,
  estimated_monthly_value NUMERIC,
  expected_close_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_opportunities_tenant_active ON sales_opportunities(tenant_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON sales_opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_opportunities_etag BEFORE UPDATE ON sales_opportunities FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY opp_select ON sales_opportunities FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY opp_insert ON sales_opportunities FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY opp_update ON sales_opportunities FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));

-- =================================================================
-- SALES BIDS (the main bid record)
-- =================================================================
CREATE TABLE sales_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_code TEXT UNIQUE NOT NULL CHECK (bid_code ~ '^BID-[0-9]{4,}$'),
  opportunity_id UUID REFERENCES sales_opportunities(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  service_id UUID REFERENCES services(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_sqft NUMERIC,
  bid_monthly_price NUMERIC,
  target_margin_percent NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bids_tenant_active ON sales_bids(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_bids_client ON sales_bids(client_id);
CREATE INDEX idx_bids_status ON sales_bids(tenant_id, status);
CREATE INDEX idx_bids_code ON sales_bids(bid_code);

CREATE TRIGGER trg_bids_updated_at BEFORE UPDATE ON sales_bids FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bids_etag BEFORE UPDATE ON sales_bids FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY bids_select ON sales_bids FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bids_insert ON sales_bids FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY bids_update ON sales_bids FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));

-- =================================================================
-- SALES BID VERSIONS (immutable snapshots)
-- =================================================================
CREATE TABLE sales_bid_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_id UUID NOT NULL REFERENCES sales_bids(id),
  version_number INT NOT NULL DEFAULT 1,
  is_sent_snapshot BOOLEAN NOT NULL DEFAULT false,
  snapshot_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (bid_id, version_number)
);

CREATE INDEX idx_bid_versions_bid ON sales_bid_versions(bid_id);

CREATE TRIGGER trg_bid_versions_updated_at BEFORE UPDATE ON sales_bid_versions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_versions_etag BEFORE UPDATE ON sales_bid_versions FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bv_select ON sales_bid_versions FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bv_insert ON sales_bid_versions FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY bv_update ON sales_bid_versions FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID AREAS
-- =================================================================
CREATE TABLE sales_bid_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  name TEXT NOT NULL,
  area_type_code TEXT,
  floor_type_code TEXT,
  building_type_code TEXT,
  difficulty_code TEXT NOT NULL DEFAULT 'STANDARD',
  square_footage NUMERIC NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  fixtures JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bid_areas_version ON sales_bid_areas(bid_version_id);

CREATE TRIGGER trg_bid_areas_updated_at BEFORE UPDATE ON sales_bid_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_areas_etag BEFORE UPDATE ON sales_bid_areas FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY ba_select ON sales_bid_areas FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ba_insert ON sales_bid_areas FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ba_update ON sales_bid_areas FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID AREA TASKS
-- =================================================================
CREATE TABLE sales_bid_area_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_area_id UUID NOT NULL REFERENCES sales_bid_areas(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  task_code TEXT NOT NULL,
  frequency_code TEXT NOT NULL DEFAULT 'DAILY',
  use_ai BOOLEAN NOT NULL DEFAULT false,
  custom_minutes NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bid_area_tasks_area ON sales_bid_area_tasks(bid_area_id);

CREATE TRIGGER trg_bid_area_tasks_updated_at BEFORE UPDATE ON sales_bid_area_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_area_tasks_etag BEFORE UPDATE ON sales_bid_area_tasks FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_area_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY bat_select ON sales_bid_area_tasks FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bat_insert ON sales_bid_area_tasks FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY bat_update ON sales_bid_area_tasks FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID SCHEDULE
-- =================================================================
CREATE TABLE sales_bid_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  days_per_week INT NOT NULL DEFAULT 5,
  visits_per_day INT NOT NULL DEFAULT 1,
  hours_per_shift NUMERIC NOT NULL DEFAULT 4,
  lead_required BOOLEAN NOT NULL DEFAULT false,
  supervisor_hours_week NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bid_schedule_version ON sales_bid_schedule(bid_version_id);

CREATE TRIGGER trg_bid_schedule_updated_at BEFORE UPDATE ON sales_bid_schedule FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_schedule_etag BEFORE UPDATE ON sales_bid_schedule FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY bs_select ON sales_bid_schedule FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bs_insert ON sales_bid_schedule FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY bs_update ON sales_bid_schedule FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID LABOR RATES
-- =================================================================
CREATE TABLE sales_bid_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  cleaner_rate NUMERIC NOT NULL DEFAULT 15,
  lead_rate NUMERIC NOT NULL DEFAULT 18,
  supervisor_rate NUMERIC NOT NULL DEFAULT 22,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bid_labor_version ON sales_bid_labor_rates(bid_version_id);

CREATE TRIGGER trg_bid_labor_updated_at BEFORE UPDATE ON sales_bid_labor_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_labor_etag BEFORE UPDATE ON sales_bid_labor_rates FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_labor_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY bl_select ON sales_bid_labor_rates FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bl_insert ON sales_bid_labor_rates FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY bl_update ON sales_bid_labor_rates FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID BURDEN
-- =================================================================
CREATE TABLE sales_bid_burden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  employer_tax_pct NUMERIC NOT NULL DEFAULT 7.65,
  workers_comp_pct NUMERIC NOT NULL DEFAULT 5,
  insurance_pct NUMERIC NOT NULL DEFAULT 3,
  other_pct NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_bid_burden_version ON sales_bid_burden(bid_version_id);

CREATE TRIGGER trg_bid_burden_updated_at BEFORE UPDATE ON sales_bid_burden FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bid_burden_etag BEFORE UPDATE ON sales_bid_burden FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_burden ENABLE ROW LEVEL SECURITY;
CREATE POLICY bb_select ON sales_bid_burden FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY bb_insert ON sales_bid_burden FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY bb_update ON sales_bid_burden FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID WORKLOAD RESULTS
-- =================================================================
CREATE TABLE sales_bid_workload_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  total_minutes_per_visit NUMERIC NOT NULL,
  weekly_minutes NUMERIC NOT NULL,
  monthly_minutes NUMERIC NOT NULL,
  monthly_hours NUMERIC NOT NULL,
  hours_per_visit NUMERIC NOT NULL,
  cleaners_needed INT NOT NULL,
  lead_needed BOOLEAN NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_workload_results_version ON sales_bid_workload_results(bid_version_id);

CREATE TRIGGER trg_workload_results_updated_at BEFORE UPDATE ON sales_bid_workload_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workload_results_etag BEFORE UPDATE ON sales_bid_workload_results FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_workload_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY wr_select ON sales_bid_workload_results FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY wr_insert ON sales_bid_workload_results FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY wr_update ON sales_bid_workload_results FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES BID PRICING RESULTS
-- =================================================================
CREATE TABLE sales_bid_pricing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  pricing_method TEXT NOT NULL,
  total_monthly_cost NUMERIC NOT NULL,
  burdened_labor_cost NUMERIC NOT NULL,
  supplies_cost NUMERIC NOT NULL DEFAULT 0,
  equipment_cost NUMERIC NOT NULL DEFAULT 0,
  overhead_cost NUMERIC NOT NULL DEFAULT 0,
  recommended_price NUMERIC NOT NULL,
  effective_margin_pct NUMERIC NOT NULL,
  explanation JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_pricing_results_version ON sales_bid_pricing_results(bid_version_id);

CREATE TRIGGER trg_pricing_results_updated_at BEFORE UPDATE ON sales_bid_pricing_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pricing_results_etag BEFORE UPDATE ON sales_bid_pricing_results FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_pricing_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_select ON sales_bid_pricing_results FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY pr_insert ON sales_bid_pricing_results FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY pr_update ON sales_bid_pricing_results FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Sequence values for pipeline codes
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, prefix, 0
FROM tenants t
CROSS JOIN (VALUES ('PRO'), ('OPP'), ('BID')) AS prefixes(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
