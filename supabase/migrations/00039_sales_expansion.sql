-- 00039_sales_expansion.sql
-- Milestone 9: Sales Foundation Tables
-- Creates 14 new tables for GleamBid spec
-- All follow StandardColumns pattern + RLS + triggers

BEGIN;

-- =========================================================================
-- A. Bid Configuration Tables
-- =========================================================================

-- 1. sales_bid_sites — Location data for bids (not yet CRM sites)
CREATE TABLE IF NOT EXISTS sales_bid_sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  site_name     TEXT NOT NULL,
  street_address TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  country       TEXT DEFAULT 'US',
  building_type_code TEXT, -- FK lookups via category
  total_square_footage NUMERIC,
  building_occupancy  INTEGER,
  public_traffic_code TEXT, -- LOW | MEDIUM | HIGH
  security_clearance_required BOOLEAN DEFAULT FALSE,
  union_required      BOOLEAN DEFAULT FALSE,
  sustainability_required BOOLEAN DEFAULT FALSE,
  walkthrough_date    DATE,
  notes         TEXT,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 2. sales_bid_general_tasks — Management/travel/break tasks
CREATE TABLE IF NOT EXISTS sales_bid_general_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  task_name     TEXT NOT NULL,
  category_code TEXT NOT NULL, -- QUALITY | CLOSING | SETUP | TRAVEL | BREAK | MANAGEMENT | OTHER
  time_minutes  NUMERIC NOT NULL DEFAULT 0,
  enabled       BOOLEAN DEFAULT TRUE,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 3. sales_production_rates — Editable production rate library
CREATE TABLE IF NOT EXISTS sales_production_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  rate_code     TEXT NOT NULL,
  task_name     TEXT NOT NULL,
  unit_code     TEXT NOT NULL DEFAULT 'SQFT_1000', -- SQFT_1000 | EACH
  base_minutes  NUMERIC NOT NULL DEFAULT 0,
  default_ml_adjustment NUMERIC DEFAULT 1.0,
  floor_type_code TEXT,
  building_type_code TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, rate_code)
);

-- =========================================================================
-- B. Costing Tables
-- =========================================================================

-- 4. sales_bid_consumables — Per-item consumable costs
CREATE TABLE IF NOT EXISTS sales_bid_consumables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  include_consumables BOOLEAN DEFAULT FALSE,
  -- Toilet paper
  toilet_paper_case_cost NUMERIC DEFAULT 0,
  toilet_paper_usage_per_person_month NUMERIC DEFAULT 0,
  -- Paper towels
  paper_towel_case_cost NUMERIC DEFAULT 0,
  paper_towel_usage_per_person_month NUMERIC DEFAULT 0,
  -- Soap
  soap_case_cost NUMERIC DEFAULT 0,
  soap_usage_per_person_month NUMERIC DEFAULT 0,
  -- Liners
  liner_case_cost NUMERIC DEFAULT 0,
  liner_usage_per_person_month NUMERIC DEFAULT 0,
  -- Seat covers
  seat_cover_case_cost NUMERIC DEFAULT 0,
  seat_cover_usage_per_person_month NUMERIC DEFAULT 0,
  -- Totals
  markup_pct    NUMERIC DEFAULT 0,
  monthly_consumables_cost NUMERIC GENERATED ALWAYS AS (
    (toilet_paper_case_cost * toilet_paper_usage_per_person_month +
     paper_towel_case_cost * paper_towel_usage_per_person_month +
     soap_case_cost * soap_usage_per_person_month +
     liner_case_cost * liner_usage_per_person_month +
     seat_cover_case_cost * seat_cover_usage_per_person_month)
    * (1 + markup_pct / 100.0)
  ) STORED,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 5. sales_bid_supply_allowances — Chemical/misc per sqft
CREATE TABLE IF NOT EXISTS sales_bid_supply_allowances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  allowance_per_sqft NUMERIC DEFAULT 0,
  monthly_supply_allowance NUMERIC DEFAULT 0,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 6. sales_bid_supply_kits — Link to inventory kits for conversion
CREATE TABLE IF NOT EXISTS sales_bid_supply_kits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  kit_id        UUID NOT NULL REFERENCES supply_kits(id),
  quantity_multiplier NUMERIC DEFAULT 1,
  include_in_conversion BOOLEAN DEFAULT TRUE,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 7. sales_bid_equipment_plan_items — Equipment cost planning
CREATE TABLE IF NOT EXISTS sales_bid_equipment_plan_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  equipment_type_code TEXT,
  cost          NUMERIC DEFAULT 0,
  life_years    NUMERIC DEFAULT 5,
  quantity_needed INTEGER DEFAULT 1,
  condition_code TEXT DEFAULT 'NEW', -- NEW | GOOD | FAIR | POOR
  monthly_depreciation NUMERIC GENERATED ALWAYS AS (
    CASE WHEN life_years > 0 THEN (cost * quantity_needed) / (life_years * 12) ELSE 0 END
  ) STORED,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 8. sales_bid_overhead — Overhead allocation
CREATE TABLE IF NOT EXISTS sales_bid_overhead (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  office_rent   NUMERIC DEFAULT 0,
  utilities     NUMERIC DEFAULT 0,
  phones_internet NUMERIC DEFAULT 0,
  marketing     NUMERIC DEFAULT 0,
  insurance     NUMERIC DEFAULT 0,
  vehicle       NUMERIC DEFAULT 0,
  misc          NUMERIC DEFAULT 0,
  allocation_percentage NUMERIC DEFAULT 0,
  industry_benchmark_percentage NUMERIC DEFAULT 10,
  overhead_total NUMERIC GENERATED ALWAYS AS (
    office_rent + utilities + phones_internet + marketing + insurance + vehicle + misc
  ) STORED,
  overhead_allocated NUMERIC GENERATED ALWAYS AS (
    (office_rent + utilities + phones_internet + marketing + insurance + vehicle + misc)
    * allocation_percentage / 100.0
  ) STORED,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 9. sales_bid_pricing_strategy — Pricing method config
CREATE TABLE IF NOT EXISTS sales_bid_pricing_strategy (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id) ON DELETE CASCADE,
  method_code   TEXT DEFAULT 'COST_PLUS', -- COST_PLUS | TARGET_MARGIN | MARKET_RATE | HYBRID
  cost_plus_markup_pct NUMERIC DEFAULT 15,
  target_margin_pct    NUMERIC DEFAULT 40,
  market_rate_low      NUMERIC,
  market_rate_high     NUMERIC,
  minimum_monthly      NUMERIC,
  include_initial_clean BOOLEAN DEFAULT FALSE,
  initial_clean_multiplier NUMERIC DEFAULT 2.0,
  annual_increase_pct  NUMERIC DEFAULT 3,
  final_price_override NUMERIC,
  price_elasticity_code TEXT DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- =========================================================================
-- C. Proposal Enhancement Tables
-- =========================================================================

-- 10. sales_proposal_attachments — PDF attachments (max 10)
CREATE TABLE IF NOT EXISTS sales_proposal_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  proposal_id   UUID NOT NULL REFERENCES sales_proposals(id) ON DELETE CASCADE,
  file_id       UUID NOT NULL REFERENCES files(id),
  sort_order    INTEGER DEFAULT 0,
  one_page_confirmed BOOLEAN DEFAULT FALSE,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 11. sales_marketing_inserts — Reusable marketing materials
CREATE TABLE IF NOT EXISTS sales_marketing_inserts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  insert_code   TEXT NOT NULL,
  title         TEXT NOT NULL,
  file_id       UUID NOT NULL REFERENCES files(id),
  is_active     BOOLEAN DEFAULT TRUE,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, insert_code)
);

-- 12. sales_proposal_marketing_inserts — Junction table
CREATE TABLE IF NOT EXISTS sales_proposal_marketing_inserts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  proposal_id   UUID NOT NULL REFERENCES sales_proposals(id) ON DELETE CASCADE,
  insert_code   TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- 13. sales_proposal_signatures — eSignature tracking
CREATE TABLE IF NOT EXISTS sales_proposal_signatures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  proposal_id   UUID NOT NULL REFERENCES sales_proposals(id) ON DELETE CASCADE,
  signer_name   TEXT NOT NULL,
  signer_email  TEXT NOT NULL,
  signature_type_code TEXT DEFAULT 'TYPED', -- DRAWN | TYPED | UPLOADED
  signature_file_id UUID REFERENCES files(id),
  signature_font_name TEXT,
  signed_at     TIMESTAMPTZ,
  ip_address    INET,
  user_agent    TEXT,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid()
);

-- =========================================================================
-- D. Follow-up Templates
-- =========================================================================

-- 14. sales_followup_templates — Reusable 5-step email sequences
CREATE TABLE IF NOT EXISTS sales_followup_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  template_code TEXT NOT NULL,
  name          TEXT NOT NULL,
  step_number   INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 5),
  subject_template TEXT NOT NULL,
  body_template_markdown TEXT NOT NULL,
  delay_days    INTEGER NOT NULL DEFAULT 3,
  is_active     BOOLEAN DEFAULT TRUE,
  -- Standard columns
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, template_code, step_number)
);

-- =========================================================================
-- RLS Policies
-- =========================================================================
ALTER TABLE sales_bid_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_general_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_production_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_supply_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_supply_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_equipment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_overhead ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bid_pricing_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_proposal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_marketing_inserts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_proposal_marketing_inserts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_proposal_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_followup_templates ENABLE ROW LEVEL SECURITY;

-- Tenant-isolation policies (same pattern as existing tables)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'sales_bid_sites', 'sales_bid_general_tasks', 'sales_production_rates',
    'sales_bid_consumables', 'sales_bid_supply_allowances', 'sales_bid_supply_kits',
    'sales_bid_equipment_plan_items', 'sales_bid_overhead', 'sales_bid_pricing_strategy',
    'sales_proposal_attachments', 'sales_marketing_inserts', 'sales_proposal_marketing_inserts',
    'sales_proposal_signatures', 'sales_followup_templates'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb->>''tenant_id'')::uuid)',
      tbl
    );
  END LOOP;
END;
$$;

-- =========================================================================
-- Triggers: updated_at + version_etag
-- =========================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'sales_bid_sites', 'sales_bid_general_tasks', 'sales_production_rates',
    'sales_bid_consumables', 'sales_bid_supply_allowances', 'sales_bid_supply_kits',
    'sales_bid_equipment_plan_items', 'sales_bid_overhead', 'sales_bid_pricing_strategy',
    'sales_proposal_attachments', 'sales_marketing_inserts', 'sales_proposal_marketing_inserts',
    'sales_proposal_signatures', 'sales_followup_templates'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_etag ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_etag BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_version_etag()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

COMMIT;
