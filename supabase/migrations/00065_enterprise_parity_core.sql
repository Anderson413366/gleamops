BEGIN;

-- ============================================================================
-- 00065_enterprise_parity_core.sql
-- Additive enterprise parity layer (core domains) without destructive renames.
-- Canonical base remains tenants/clients/sites/site_jobs/etc.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Tenancy & Security parity tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  default_invoice_terms TEXT NOT NULL DEFAULT 'NET_30',
  default_tax_rate NUMERIC(6,4),
  default_invoice_delivery TEXT NOT NULL DEFAULT 'EMAIL',
  default_quote_valid_days INTEGER NOT NULL DEFAULT 30,
  default_pay_period TEXT NOT NULL DEFAULT 'BIWEEKLY',
  default_language TEXT NOT NULL DEFAULT 'ENGLISH',
  enable_staging_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_org_settings_invoice_terms CHECK (default_invoice_terms IN ('DUE_ON_RECEIPT','NET_7','NET_15','NET_30','NET_45','NET_60','CUSTOM')),
  CONSTRAINT chk_org_settings_invoice_delivery CHECK (default_invoice_delivery IN ('EMAIL','CLIENT_PORTAL','EDI','MAIL')),
  CONSTRAINT chk_org_settings_pay_period CHECK (default_pay_period IN ('WEEKLY','BIWEEKLY','SEMI_MONTHLY','MONTHLY')),
  CONSTRAINT chk_org_settings_quote_days CHECK (default_quote_valid_days BETWEEN 1 AND 365),
  CONSTRAINT chk_org_settings_tax_rate CHECK (default_tax_rate IS NULL OR (default_tax_rate >= 0 AND default_tax_rate <= 1))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_user ON user_sessions(tenant_id, user_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role_name TEXT NOT NULL,
  role_kind TEXT NOT NULL DEFAULT 'CUSTOM',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, role_name),
  CONSTRAINT chk_roles_role_kind CHECK (role_kind IN ('SYSTEM','CUSTOM'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_permissions_module CHECK (module IN ('CUSTOMERS','SITES','QUOTES','CONTRACTS','JOBS','SCHEDULING','TIMEKEEPING','PAYROLL','INVOICING','INVENTORY','ASSETS','INSPECTIONS','ISSUES','MESSAGING','FILES','ADMIN'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  access_level TEXT NOT NULL DEFAULT 'READ',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (role_id, permission_id),
  CONSTRAINT chk_role_permissions_access CHECK (access_level IN ('NONE','READ','WRITE','ADMIN'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by_user_id UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Customer/Site parity extension tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  location_role TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (site_id, contact_id),
  CONSTRAINT chk_location_contacts_role CHECK (location_role IN ('PRIMARY','BILLING','FACILITY_MANAGER','SECURITY','AFTER_HOURS'))
);

CREATE TABLE IF NOT EXISTS location_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  access_type TEXT NOT NULL,
  access_value TEXT,
  instructions TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_location_access_type CHECK (access_type IN ('KEY','KEY_FOB','BADGE','DOOR_CODE','ALARM_CODE','OTHER')),
  CONSTRAINT chk_location_access_status CHECK (status IN ('ACTIVE','ROTATED','RETIRED'))
);

CREATE TABLE IF NOT EXISTS area_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_area_id UUID NOT NULL REFERENCES site_areas(id),
  fixture_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_area_fixtures_type CHECK (fixture_type IN ('TOILET','URINAL','SINK','MIRROR','STALL_DOOR','TRASH_CAN','SOAP_DISPENSER','PAPER_TOWEL_DISPENSER','HAND_SANITIZER_DISPENSER','DOOR_HANDLE','DESK_SURFACE','TABLE_SURFACE','TOUCHPOINT_BUNDLE','OTHER')),
  CONSTRAINT chk_area_fixtures_qty CHECK (quantity >= 0)
);

-- --------------------------------------------------------------------------
-- Service catalog parity extension
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  category_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, category_name)
);

CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  category_name TEXT NOT NULL,
  default_area_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, category_name),
  CONSTRAINT chk_task_categories_area_type CHECK (default_area_type IS NULL OR default_area_type IN ('RESTROOM','OFFICE','CONFERENCE','BREAKROOM','HALLWAY','ENTRYWAY','FLOORS','OTHER'))
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS billing_model TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_category_id UUID REFERENCES task_categories(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_minutes_per_unit NUMERIC(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_units_per_hour NUMERIC(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS compliance_standard TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_chemical BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_ppe BOOLEAN DEFAULT FALSE;

ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS default_area_type_filter TEXT;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS default_units NUMERIC(10,2);
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS qc_weight_override INTEGER;

CREATE TABLE IF NOT EXISTS checklist_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id),
  section_title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

-- --------------------------------------------------------------------------
-- Sales quote parity extension
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_id UUID NOT NULL REFERENCES sales_proposals(id),
  line_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_optional_addon BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_quote_line_type CHECK (line_type IN ('SERVICE','LABOR','SUPPLIES','TRAVEL','DISCOUNT','OTHER')),
  CONSTRAINT chk_quote_line_nonneg CHECK (quantity >= 0 AND unit_price >= 0 AND line_total >= 0)
);

CREATE TABLE IF NOT EXISTS quote_workload_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_id UUID NOT NULL REFERENCES sales_proposals(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  site_area_id UUID REFERENCES site_areas(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  units NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_type TEXT NOT NULL,
  minutes_per_unit NUMERIC(12,2),
  estimated_minutes_total NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_quote_workload_units CHECK (units >= 0),
  CONSTRAINT chk_quote_workload_unit_type CHECK (unit_type IN ('PER_VISIT','PER_ROOM','PER_FIXTURE','PER_1000_SQFT','PER_ITEM'))
);

-- --------------------------------------------------------------------------
-- Contract parity domain
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  contract_number TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  billing_cycle TEXT NOT NULL,
  contract_value_mrr NUMERIC(12,2),
  contract_value_arr NUMERIC(12,2),
  price_type TEXT NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  renewal_term_months INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  client_signed_at TIMESTAMPTZ,
  company_signed_at TIMESTAMPTZ,
  scope_of_work TEXT,
  exclusions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, contract_number),
  CONSTRAINT chk_contracts_billing_cycle CHECK (billing_cycle IN ('PER_VISIT','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','ANNUALLY')),
  CONSTRAINT chk_contracts_price_type CHECK (price_type IN ('FIXED','TIME_MATERIALS','UNIT_RATE','MIXED')),
  CONSTRAINT chk_contracts_status CHECK (status IN ('DRAFT','PENDING_SIGNATURE','ACTIVE','PAUSED','EXPIRED','CANCELLED'))
);

CREATE TABLE IF NOT EXISTS contract_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (contract_id, site_id)
);

CREATE TABLE IF NOT EXISTS contract_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  service_id UUID NOT NULL REFERENCES services(id),
  frequency TEXT NOT NULL,
  unit_price NUMERIC(12,2),
  estimated_labor_hours_per_period NUMERIC(10,2),
  included_in_base BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_contract_service_lines_frequency CHECK (frequency IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','ON_DEMAND'))
);

CREATE TABLE IF NOT EXISTS contract_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  sla_type TEXT NOT NULL,
  target_minutes INTEGER,
  target_score NUMERIC(5,2),
  severity TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_contract_slas_type CHECK (sla_type IN ('RESPONSE_TIME','COMPLETION_TIME','INSPECTION_SCORE_MINIMUM','ISSUE_RESOLUTION_TIME')),
  CONSTRAINT chk_contract_slas_severity CHECK (severity IN ('STANDARD','PRIORITY','CRITICAL')),
  CONSTRAINT chk_contract_slas_minutes CHECK (target_minutes IS NULL OR target_minutes >= 0),
  CONSTRAINT chk_contract_slas_score CHECK (target_score IS NULL OR (target_score >= 0 AND target_score <= 100))
);

-- --------------------------------------------------------------------------
-- Operations parity extensions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id),
  visit_type TEXT NOT NULL,
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_job_visits_type CHECK (visit_type IN ('STANDARD','RETURN_TRIP','NO_ACCESS','RECALL','OTHER')),
  CONSTRAINT chk_job_visits_status CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','NO_SHOW','CANCELLED'))
);

CREATE TABLE IF NOT EXISTS job_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  route_date DATE NOT NULL,
  route_owner_staff_id UUID REFERENCES staff(id),
  route_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_routes_type CHECK (route_type IN ('DAILY_ROUTE','MASTER_ROUTE','PROJECT_ROUTE')),
  CONSTRAINT chk_routes_status CHECK (status IN ('DRAFT','PUBLISHED','COMPLETED'))
);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id),
  stop_order INTEGER NOT NULL,
  estimated_travel_minutes INTEGER,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_route_stops_order CHECK (stop_order >= 1),
  CONSTRAINT chk_route_stops_travel CHECK (estimated_travel_minutes IS NULL OR estimated_travel_minutes >= 0)
);

ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS site_area_id UUID REFERENCES site_areas(id);
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'PENDING';
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS completion_photos JSONB;
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS completed_by_staff_id UUID REFERENCES staff(id);
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS frequency_instance TEXT;
ALTER TABLE job_tasks ADD COLUMN IF NOT EXISTS planned_units NUMERIC(10,2);

-- --------------------------------------------------------------------------
-- Timekeeping parity extensions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nfc_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  site_area_id UUID REFERENCES site_areas(id),
  tag_code TEXT NOT NULL,
  tag_purpose TEXT NOT NULL,
  installed_location_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, tag_code),
  CONSTRAINT chk_nfc_tags_purpose CHECK (tag_purpose IN ('CLOCK_IN_OUT','AREA_VERIFICATION','INSPECTION_POINT'))
);

CREATE TABLE IF NOT EXISTS time_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  policy_name TEXT NOT NULL,
  clock_in_restriction TEXT NOT NULL,
  early_clock_in_minutes INTEGER,
  late_clock_out_minutes INTEGER,
  requires_photo_on_manual_edit BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_time_policies_restriction CHECK (clock_in_restriction IN ('NONE','GEOFENCE_REQUIRED','NFC_QR_REQUIRED','BOTH_REQUIRED')),
  CONSTRAINT chk_time_policies_early CHECK (early_clock_in_minutes IS NULL OR (early_clock_in_minutes >= 0 AND early_clock_in_minutes <= 240)),
  CONSTRAINT chk_time_policies_late CHECK (late_clock_out_minutes IS NULL OR (late_clock_out_minutes >= 0 AND late_clock_out_minutes <= 240))
);

CREATE TABLE IF NOT EXISTS time_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  site_job_id UUID REFERENCES site_jobs(id),
  job_visit_id UUID REFERENCES job_visits(id),
  punch_type TEXT NOT NULL,
  method TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  geofence_id UUID REFERENCES geofences(id),
  nfc_tag_id UUID REFERENCES nfc_tags(id),
  within_geofence BOOLEAN,
  note TEXT,
  punched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_time_punches_type CHECK (punch_type IN ('CLOCK_IN','CLOCK_OUT','BREAK_START','BREAK_END')),
  CONSTRAINT chk_time_punches_method CHECK (method IN ('MOBILE_APP','NFC_TAG','QR_CODE','IVR','SMS','KIOSK','MANUAL'))
);
CREATE INDEX IF NOT EXISTS idx_time_punches_tenant_staff_time ON time_punches(tenant_id, staff_id, punched_at DESC) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- QC/Inspections parity extensions
-- --------------------------------------------------------------------------
ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS scoring_model TEXT;
ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT FALSE;
ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN DEFAULT FALSE;
ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS rating TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS summary_notes TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS photos JSONB;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS score_value NUMERIC(5,2);
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS photos JSONB;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS site_area_id UUID REFERENCES site_areas(id);

-- --------------------------------------------------------------------------
-- Issues & Ticketing
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  site_job_id UUID REFERENCES site_jobs(id),
  inspection_id UUID REFERENCES inspections(id),
  issue_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT TRUE,
  reported_by_user_id UUID,
  assigned_to_staff_id UUID REFERENCES staff(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_issues_type CHECK (issue_type IN ('CLEANING_DEFECT','CLIENT_SERVICE_REQUEST','SUPPLY_SHORTAGE','MAINTENANCE_REPAIR','SAFETY_ISSUE','ACCESS_PROBLEM','OTHER')),
  CONSTRAINT chk_issues_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT chk_issues_status CHECK (status IN ('OPEN','IN_PROGRESS','AWAITING_CLIENT','RESOLVED','CLOSED'))
);
CREATE INDEX IF NOT EXISTS idx_issues_tenant_status ON issues(tenant_id, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  issue_id UUID NOT NULL REFERENCES issues(id),
  author_user_id UUID,
  comment_body TEXT NOT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS issue_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  issue_id UUID NOT NULL REFERENCES issues(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  minutes_spent INTEGER NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_issue_work_logs_minutes CHECK (minutes_spent >= 0)
);
CREATE INDEX IF NOT EXISTS idx_issue_work_logs_issue ON issue_work_logs(issue_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Compatibility views for enterprise naming
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW organizations AS
SELECT
  t.id AS org_id,
  t.name AS org_name,
  t.name AS legal_name,
  NULL::TEXT AS duns_number,
  NULL::TEXT AS website_url,
  NULL::TEXT AS main_phone,
  NULL::TEXT AS address_line1,
  NULL::TEXT AS address_line2,
  NULL::TEXT AS city,
  NULL::TEXT AS state,
  NULL::TEXT AS postal_code,
  NULL::TEXT AS country,
  t.default_timezone AS timezone,
  'USD'::TEXT AS currency_code,
  'ACTIVE'::TEXT AS status,
  NULL::INTEGER AS data_retention_days,
  t.created_at,
  t.updated_at,
  NULL::TIMESTAMPTZ AS deleted_at
FROM tenants t;

CREATE OR REPLACE VIEW users AS
SELECT
  au.id AS user_id,
  tm.tenant_id AS org_id,
  au.email,
  COALESCE(au.email_confirmed_at IS NOT NULL, FALSE) AS email_verified,
  NULL::TEXT AS password_hash,
  CASE
    WHEN tm.role_code = 'CLEANER' THEN 'EMPLOYEE'
    WHEN tm.role_code = 'SALES' THEN 'EMPLOYEE'
    WHEN tm.role_code = 'SUPERVISOR' THEN 'EMPLOYEE'
    WHEN tm.role_code = 'MANAGER' THEN 'EMPLOYEE'
    WHEN tm.role_code = 'OWNER_ADMIN' THEN 'SYSTEM'
    ELSE 'EMPLOYEE'
  END::TEXT AS user_type,
  s.id AS employee_id,
  NULL::UUID AS client_contact_id,
  'ACTIVE'::TEXT AS status,
  au.last_sign_in_at AS last_login_at,
  COALESCE(au.raw_user_meta_data ? 'mfa_enabled', FALSE) AS mfa_enabled,
  au.created_at,
  COALESCE(au.updated_at, au.created_at) AS updated_at,
  NULL::TIMESTAMPTZ AS deleted_at
FROM tenant_memberships tm
JOIN auth.users au ON au.id = tm.user_id
LEFT JOIN staff s ON s.user_id = tm.user_id AND s.tenant_id = tm.tenant_id;

CREATE OR REPLACE VIEW audit_log AS
SELECT
  ae.id AS audit_id,
  ae.tenant_id AS org_id,
  ae.actor_user_id,
  ae.action,
  ae.entity_type,
  ae.entity_id,
  ae.before AS before_json,
  ae.after AS after_json,
  NULL::TEXT AS ip_address,
  ae.created_at
FROM audit_events ae;

CREATE OR REPLACE VIEW customers AS
SELECT
  c.id AS customer_id,
  c.tenant_id AS org_id,
  c.client_code AS customer_number,
  c.name AS customer_name,
  COALESCE(c.industry, 'OTHER') AS industry,
  COALESCE(c.payment_terms, 'NET_30') AS billing_terms,
  FALSE::BOOLEAN AS tax_exempt,
  'EMAIL'::TEXT AS invoice_delivery,
  CASE
    WHEN c.status = 'PROSPECT' THEN 'PROSPECTIVE'
    WHEN c.status = 'ON_HOLD' THEN 'PAUSED'
    WHEN c.status = 'CANCELED' THEN 'TERMINATED'
    WHEN c.status = 'INACTIVE' THEN 'TERMINATED'
    ELSE 'ACTIVE'
  END::TEXT AS status,
  c.notes,
  c.created_at,
  c.updated_at,
  c.archived_at AS deleted_at
FROM clients c;

CREATE OR REPLACE VIEW customer_contacts AS
SELECT
  c.id AS contact_id,
  c.tenant_id AS org_id,
  c.client_id AS customer_id,
  COALESCE(c.first_name, split_part(COALESCE(c.name,''), ' ', 1)) AS first_name,
  COALESCE(c.last_name, NULLIF(trim(replace(COALESCE(c.name,''), split_part(COALESCE(c.name,''), ' ', 1), '')), '')) AS last_name,
  c.email,
  COALESCE(c.mobile_phone, c.work_phone, c.phone) AS phone,
  COALESCE(c.role, 'PRIMARY') AS contact_role,
  COALESCE(c.preferred_contact_method, 'EMAIL') AS preferred_channel,
  TRUE::BOOLEAN AS is_active,
  c.notes,
  c.created_at,
  c.updated_at
FROM contacts c
WHERE c.client_id IS NOT NULL;

CREATE OR REPLACE VIEW locations AS
SELECT
  s.id AS location_id,
  s.tenant_id AS org_id,
  s.client_id AS customer_id,
  s.site_code AS location_number,
  s.name AS location_name,
  COALESCE(st.name, 'OTHER') AS facility_type,
  COALESCE(s.address->>'street','') AS address_line1,
  NULL::TEXT AS address_line2,
  COALESCE(s.address->>'city','') AS city,
  COALESCE(s.address->>'state','') AS state,
  COALESCE(s.address->>'zip','') AS postal_code,
  COALESCE(s.address->>'country','US') AS country,
  'America/New_York'::TEXT AS timezone,
  s.square_footage::INTEGER AS square_footage,
  NULL::TEXT AS occupancy_level,
  NULL::TEXT AS traffic_level,
  NULL::TEXT AS default_service_frequency,
  NULL::TEXT AS security_level,
  s.notes AS special_instructions,
  s.geofence_center_lat AS geo_lat,
  s.geofence_center_lng AS geo_long,
  COALESCE(s.status,'ACTIVE') AS status,
  s.created_at,
  s.updated_at,
  s.archived_at AS deleted_at
FROM sites s
LEFT JOIN site_types st ON st.id = s.site_type_id;

CREATE OR REPLACE VIEW leads AS
SELECT
  sp.id AS lead_id,
  sp.tenant_id AS org_id,
  sp.company_name,
  NULL::TEXT AS primary_contact_name,
  NULL::TEXT AS primary_email,
  NULL::TEXT AS primary_phone,
  COALESCE(sp.source, 'OTHER') AS source,
  CASE
    WHEN sp.prospect_status_code IN ('NEW','CONTACTED','QUALIFIED','PROPOSAL_SENT','NEGOTIATION','WON','LOST') THEN sp.prospect_status_code
    ELSE 'NEW'
  END::TEXT AS status,
  sp.owner_user_id,
  NULL::DATE AS expected_close_date,
  NULL::NUMERIC AS estimated_value,
  sp.notes,
  sp.created_at,
  sp.updated_at
FROM sales_prospects sp;

CREATE OR REPLACE VIEW opportunities AS
SELECT
  so.id AS opportunity_id,
  so.tenant_id AS org_id,
  so.prospect_id AS lead_id,
  CASE
    WHEN so.stage_code = 'QUALIFIED' THEN 'DISCOVERY'
    WHEN so.stage_code = 'PROPOSAL' THEN 'PROPOSAL'
    WHEN so.stage_code = 'NEGOTIATION' THEN 'NEGOTIATION'
    WHEN so.stage_code = 'WON' THEN 'CLOSED'
    WHEN so.stage_code = 'LOST' THEN 'CLOSED'
    ELSE 'DISCOVERY'
  END::TEXT AS pipeline_stage,
  so.estimated_monthly_value AS expected_mrr,
  CASE WHEN so.estimated_monthly_value IS NOT NULL THEN so.estimated_monthly_value * 12 ELSE NULL END AS expected_arr,
  NULL::DATE AS target_start_date,
  NULL::TEXT AS close_reason,
  so.created_at,
  so.updated_at,
  NULL::TEXT AS notes
FROM sales_opportunities so;

CREATE OR REPLACE VIEW jobs AS
SELECT
  sj.id AS job_id,
  sj.tenant_id AS org_id,
  s.client_id AS customer_id,
  sj.site_id AS location_id,
  NULL::UUID AS contract_id,
  NULL::UUID AS recurrence_rule_id,
  sj.job_code AS job_number,
  COALESCE(sj.job_type, 'RECURRING_SERVICE') AS job_type,
  CASE WHEN sj.start_time IS NULL THEN NULL ELSE 'CUSTOM' END::TEXT AS service_window,
  COALESCE(sj.start_date, CURRENT_DATE) AS service_date,
  sj.start_time AS scheduled_start_time,
  CASE
    WHEN sj.estimated_hours_per_service IS NULL THEN NULL
    ELSE (sj.estimated_hours_per_service * 60)::INTEGER
  END AS scheduled_duration_minutes,
  CASE
    WHEN sj.priority_level IN ('LOW','NORMAL','MEDIUM','HIGH','URGENT') THEN sj.priority_level
    WHEN sj.priority_level = 'CRITICAL' THEN 'URGENT'
    ELSE 'NORMAL'
  END::TEXT AS priority,
  CASE
    WHEN sj.status = 'ACTIVE' THEN 'SCHEDULED'
    WHEN sj.status = 'ON_HOLD' THEN 'BLOCKED'
    WHEN sj.status = 'CANCELLED' THEN 'CANCELLED'
    WHEN sj.status = 'COMPLETED' THEN 'COMPLETED'
    ELSE 'DRAFT'
  END::TEXT AS status,
  NULL::UUID AS checklist_template_id,
  sj.invoice_description AS client_visible_notes,
  sj.notes AS internal_notes,
  TRUE::BOOLEAN AS billable,
  sj.created_at,
  sj.updated_at
FROM site_jobs sj
JOIN sites s ON s.id = sj.site_id;

-- --------------------------------------------------------------------------
-- Seed permissions and default role mappings
-- --------------------------------------------------------------------------
INSERT INTO permissions(permission_code, module, description)
VALUES
  ('customers.read', 'CUSTOMERS', 'Read customer records'),
  ('customers.write', 'CUSTOMERS', 'Create and update customer records'),
  ('sites.read', 'SITES', 'Read site records'),
  ('sites.write', 'SITES', 'Create and update site records'),
  ('jobs.read', 'JOBS', 'Read jobs'),
  ('jobs.write', 'JOBS', 'Manage jobs'),
  ('inventory.read', 'INVENTORY', 'Read inventory'),
  ('inventory.write', 'INVENTORY', 'Manage inventory'),
  ('admin.read', 'ADMIN', 'Read admin settings'),
  ('admin.write', 'ADMIN', 'Manage admin settings')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO roles (tenant_id, role_name, role_kind, description, is_default)
SELECT t.id, 'Manager', 'SYSTEM', 'Default manager role', TRUE
FROM tenants t
ON CONFLICT (tenant_id, role_name) DO NOTHING;

INSERT INTO roles (tenant_id, role_name, role_kind, description, is_default)
SELECT t.id, 'Staff', 'SYSTEM', 'Default staff role', TRUE
FROM tenants t
ON CONFLICT (tenant_id, role_name) DO NOTHING;

INSERT INTO role_permissions (tenant_id, role_id, permission_id, access_level, is_enabled)
SELECT r.tenant_id, r.id, p.id,
  CASE
    WHEN r.role_name = 'Manager' THEN 'WRITE'
    ELSE 'READ'
  END,
  TRUE
FROM roles r
JOIN permissions p ON p.module IN ('CUSTOMERS','SITES','JOBS','INVENTORY')
WHERE r.role_name IN ('Manager','Staff')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- --------------------------------------------------------------------------
-- Trigger + RLS helper loops
-- --------------------------------------------------------------------------
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organization_settings','user_sessions','roles','role_permissions','user_roles',
    'location_contacts','location_access','area_fixtures',
    'service_categories','task_categories','checklist_template_sections',
    'quote_line_items','quote_workload_inputs',
    'contracts','contract_locations','contract_service_lines','contract_slas',
    'job_visits','job_status_events','routes','route_stops',
    'nfc_tags','time_policies','time_punches',
    'issues','issue_comments','issue_work_logs'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_tenant_select'
    ) THEN
      EXECUTE format('CREATE POLICY %I_tenant_select ON %I FOR SELECT USING (tenant_id = current_tenant_id())', tbl, tbl);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_tenant_insert'
    ) THEN
      EXECUTE format('CREATE POLICY %I_tenant_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_tenant_id())', tbl, tbl);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_tenant_update'
    ) THEN
      EXECUTE format('CREATE POLICY %I_tenant_update ON %I FOR UPDATE USING (tenant_id = current_tenant_id())', tbl, tbl);
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl, tbl);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_etag ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_etag BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_version_etag()', tbl, tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
