BEGIN;

-- ============================================================================
-- 00066_enterprise_parity_extended.sql
-- Enterprise parity (inventory/finance/payroll/files/integrations + wrappers)
-- Additive only, no destructive renames.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Core additive fields for parity with legacy/enterprise specs
-- --------------------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_terms TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_persons JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS terms TEXT;

ALTER TABLE sites ADD COLUMN IF NOT EXISTS key_code TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS qr_closet_id TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS supply_closet_items JSONB;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS occupancy_level TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS traffic_level TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS security_level TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS default_service_frequency TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS geo_lat NUMERIC;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS geo_long NUMERIC;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS service_schedule JSONB;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS special_instructions TEXT;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_site_ids UUID[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS integration_ids JSONB;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferences JSONB;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS services JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_term TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE services ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS default_rate NUMERIC(12,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS supplies_required UUID[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_required UUID[];

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qc_weight INTEGER;

ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS default_frequency TEXT;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS facility_type TEXT;
ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS minutes_per_unit NUMERIC(12,2);
ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE task_production_rates ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS response_type TEXT;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS weight INTEGER;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS applies_to_area_type TEXT;
ALTER TABLE checklist_template_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE site_areas ADD COLUMN IF NOT EXISTS area_name TEXT;
ALTER TABLE site_areas ADD COLUMN IF NOT EXISTS area_code TEXT;
ALTER TABLE site_areas ADD COLUMN IF NOT EXISTS area_sqft INTEGER;
ALTER TABLE site_areas ADD COLUMN IF NOT EXISTS is_serviceable BOOLEAN DEFAULT TRUE;
ALTER TABLE site_areas ADD COLUMN IF NOT EXISTS map_ref TEXT;

ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS checklist JSONB;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID[];
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS verification_photos JSONB;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS progress INTEGER;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS audit_trail JSONB;

ALTER TABLE job_staff_assignments ADD COLUMN IF NOT EXISTS assignment_status TEXT;
ALTER TABLE job_staff_assignments ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE job_staff_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE routes ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS planned_end TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_order INTEGER;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS tasks UUID[];
ALTER TABLE routes ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_location JSONB;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_location JSONB;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved BOOLEAN;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS flags TEXT[];
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS work_minutes INTEGER;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS pay_code TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS assigned_site_id UUID REFERENCES sites(id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES staff(id);

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS area_scores JSONB;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS follow_up_tasks UUID[];

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role_filter TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS trigger_data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS send_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload_json JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS contact_info JSONB;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS rate NUMERIC(12,2);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS assigned_sites UUID[];
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS insurance_expiration DATE;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_number TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;

ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS recurrence_type TEXT;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS rrule_text TEXT;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS default_start_time TIME;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE geofences ADD COLUMN IF NOT EXISTS center_long NUMERIC;

ALTER TABLE inspection_templates ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE inspection_template_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE inspection_template_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE inspection_template_items ADD COLUMN IF NOT EXISTS area_type TEXT;
ALTER TABLE inspection_template_items ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments_json JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS byte_size INTEGER;
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS tenant_org_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  legal_name TEXT,
  duns_number TEXT,
  website_url TEXT,
  main_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  timezone TEXT,
  currency_code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  data_retention_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_tenant_org_profiles_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  CONSTRAINT chk_tenant_org_profiles_retention CHECK (data_retention_days IS NULL OR (data_retention_days >= 0 AND data_retention_days <= 3650))
);

CREATE TABLE IF NOT EXISTS user_security_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  user_status TEXT NOT NULL DEFAULT 'ACTIVE',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,
  reset_token TEXT,
  notification_channels TEXT[] DEFAULT ARRAY['IN_APP']::TEXT[],
  preferred_language TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, user_id),
  CONSTRAINT chk_user_security_status CHECK (user_status IN ('ACTIVE', 'LOCKED', 'DISABLED', 'PENDING_INVITE'))
);
CREATE INDEX IF NOT EXISTS idx_user_security_profiles_tenant_user ON user_security_profiles(tenant_id, user_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Inventory & purchasing parity
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_vendors_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_status ON vendors(tenant_id, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  location_type TEXT NOT NULL,
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  address_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_inventory_locations_type CHECK (location_type IN ('WAREHOUSE','OFFICE','CLIENT_SITE','VEHICLE','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_tenant ON inventory_locations(tenant_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supply_catalog_id UUID REFERENCES supply_catalog(id),
  vendor_id UUID REFERENCES vendors(id),
  sku TEXT,
  name TEXT,
  item_name TEXT NOT NULL,
  category TEXT,
  item_category TEXT NOT NULL,
  unit TEXT,
  uom TEXT NOT NULL,
  unit_cost NUMERIC(12,2),
  unit_price NUMERIC(12,2),
  reorder_point INTEGER,
  reorder_quantity INTEGER,
  reorder_qty INTEGER,
  billable_price NUMERIC(12,2),
  is_hazardous BOOLEAN NOT NULL DEFAULT FALSE,
  sds_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, sku),
  CONSTRAINT chk_items_category CHECK (item_category IN ('CHEMICAL','CONSUMABLE','PPE','TOOL','EQUIPMENT_PART','OTHER')),
  CONSTRAINT chk_items_uom CHECK (uom IN ('EACH','BOTTLE','GALLON','BOX','CASE','ROLL')),
  CONSTRAINT chk_items_nonneg CHECK (
    (unit_cost IS NULL OR unit_cost >= 0)
    AND (unit_price IS NULL OR unit_price >= 0)
    AND (reorder_point IS NULL OR reorder_point >= 0)
    AND (reorder_qty IS NULL OR reorder_qty >= 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_items_tenant_category ON items(tenant_id, item_category) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (inventory_location_id, item_id),
  CONSTRAINT chk_stock_levels_qty CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant_item ON stock_levels(tenant_id, item_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  item_id UUID NOT NULL REFERENCES items(id),
  date DATE,
  type TEXT,
  performed_by UUID,
  from_inventory_location_id UUID REFERENCES inventory_locations(id),
  to_inventory_location_id UUID REFERENCES inventory_locations(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2),
  site_job_id UUID REFERENCES site_jobs(id),
  performed_by_user_id UUID,
  notes TEXT,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_stock_movements_type CHECK (movement_type IN ('RECEIVE','TRANSFER','CONSUME','ADJUST','RETURN')),
  CONSTRAINT chk_stock_movements_qty CHECK (quantity >= 1),
  CONSTRAINT chk_stock_movements_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_moved_at ON stock_movements(tenant_id, moved_at DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  po_number TEXT NOT NULL,
  po_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  ship_to_inventory_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, po_number),
  CONSTRAINT chk_purchase_orders_status CHECK (status IN ('DRAFT','SENT','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
  CONSTRAINT chk_purchase_orders_total CHECK (subtotal >= 0 AND (tax IS NULL OR tax >= 0) AND total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status ON purchase_orders(tenant_id, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_purchase_order_lines_qty CHECK (quantity_ordered >= 1 AND quantity_received >= 0),
  CONSTRAINT chk_purchase_order_lines_cost CHECK (unit_cost >= 0 AND line_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po ON purchase_order_lines(purchase_order_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS supply_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID REFERENCES sites(id),
  inventory_location_id UUID REFERENCES inventory_locations(id),
  requested_by_staff_id UUID NOT NULL REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_supply_requests_status CHECK (status IN ('PENDING','APPROVED','REJECTED','FULFILLED'))
);
CREATE INDEX IF NOT EXISTS idx_supply_requests_tenant_status ON supply_requests(tenant_id, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS supply_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supply_request_id UUID NOT NULL REFERENCES supply_requests(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity_requested INTEGER NOT NULL,
  quantity_fulfilled INTEGER,
  line_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_supply_request_lines_qty CHECK (
    quantity_requested >= 1
    AND (quantity_fulfilled IS NULL OR quantity_fulfilled >= 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_supply_request_lines_request ON supply_request_lines(supply_request_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Asset parity extensions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  from_inventory_location_id UUID REFERENCES inventory_locations(id),
  to_inventory_location_id UUID REFERENCES inventory_locations(id),
  from_site_id UUID REFERENCES sites(id),
  to_site_id UUID REFERENCES sites(id),
  performed_by_user_id UUID,
  notes TEXT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_tenant_equipment ON asset_transfers(tenant_id, equipment_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  date DATE,
  performed_by UUID,
  description TEXT,
  next_due_date DATE,
  maintenance_type TEXT NOT NULL,
  performed_on DATE NOT NULL,
  cost NUMERIC(12,2),
  details TEXT,
  performed_by_staff_id UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_asset_maintenance_logs_type CHECK (maintenance_type IN ('PREVENTIVE','REPAIR','INSPECTION','OTHER')),
  CONSTRAINT chk_asset_maintenance_logs_cost CHECK (cost IS NULL OR cost >= 0)
);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_tenant_equipment ON asset_maintenance_logs(tenant_id, equipment_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Finance parity
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  contract_id UUID REFERENCES contracts(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  terms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2),
  discount_amount NUMERIC(12,2),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, invoice_number),
  CONSTRAINT chk_invoices_terms CHECK (terms IN ('DUE_ON_RECEIPT','NET_7','NET_15','NET_30','NET_45','NET_60','CUSTOM')),
  CONSTRAINT chk_invoices_status CHECK (status IN ('DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','VOID')),
  CONSTRAINT chk_invoices_nonneg CHECK (
    subtotal >= 0
    AND (tax_amount IS NULL OR tax_amount >= 0)
    AND (discount_amount IS NULL OR discount_amount >= 0)
    AND total >= 0
    AND balance_due >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  line_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  uom TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_invoice_line_items_type CHECK (line_type IN ('SERVICE','LABOR','SUPPLIES','TRAVEL','DISCOUNT','OTHER')),
  CONSTRAINT chk_invoice_line_items_nonneg CHECK (quantity >= 0 AND unit_price >= 0 AND line_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS invoice_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id),
  is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (invoice_id, site_job_id)
);
CREATE INDEX IF NOT EXISTS idx_invoice_jobs_invoice ON invoice_jobs(invoice_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCEEDED',
  processed_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payments_method CHECK (payment_method IN ('CREDIT_CARD','ACH','CASH','CHECK','PAYPAL','OTHER')),
  CONSTRAINT chk_payments_status CHECK (status IN ('PENDING','SUCCEEDED','FAILED','REFUNDED')),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0)
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Payroll parity
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_pay_periods_status CHECK (status IN ('OPEN','APPROVED','EXPORTED','CLOSED'))
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_tenant_dates ON pay_periods(tenant_id, period_start, period_end) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id),
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_runs_type CHECK (run_type IN ('REGULAR','OFF_CYCLE','CORRECTION')),
  CONSTRAINT chk_payroll_runs_status CHECK (status IN ('DRAFT','CALCULATED','APPROVED','EXPORTED'))
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS earning_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, code),
  CONSTRAINT chk_earning_codes_type CHECK (type IN ('REGULAR','OVERTIME','DOUBLE_TIME','BONUS','TRAVEL','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_earning_codes_tenant_active ON earning_codes(tenant_id, is_active) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  earning_code_id UUID NOT NULL REFERENCES earning_codes(id),
  hours NUMERIC(10,2),
  rate NUMERIC(12,2),
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_payroll_line_items_nonneg CHECK (
    (hours IS NULL OR hours >= 0)
    AND (rate IS NULL OR rate >= 0)
    AND amount >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_run ON payroll_line_items(payroll_run_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Conversations/notifications wrappers
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  conversation_type TEXT NOT NULL,
  site_job_id UUID REFERENCES site_jobs(id),
  site_id UUID REFERENCES sites(id),
  issue_id UUID REFERENCES issues(id),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_conversations_type CHECK (conversation_type IN ('JOB_THREAD','LOCATION_THREAD','ISSUE_THREAD','CUSTOMER_THREAD','DIRECT_MESSAGE'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_type ON conversations(tenant_id, conversation_type) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL,
  participant_role TEXT NOT NULL,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (conversation_id, user_id),
  CONSTRAINT chk_conversation_participants_role CHECK (participant_role IN ('MEMBER','MODERATOR','OWNER'))
);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  default_channel TEXT NOT NULL DEFAULT 'IN_APP',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, user_id),
  CONSTRAINT chk_notification_preferences_channel CHECK (default_channel IN ('IN_APP','SMS','EMAIL','PUSH'))
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_user ON notification_preferences(tenant_id, user_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- File links, tags, and custom fields
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  file_id UUID NOT NULL REFERENCES files(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  label TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS idx_file_links_entity ON file_links(tenant_id, entity_type, entity_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tag_name TEXT NOT NULL,
  color_hex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, tag_name)
);
CREATE INDEX IF NOT EXISTS idx_tags_tenant_name ON tags(tenant_id, tag_name) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tag_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_entity ON tag_assignments(tenant_id, entity_type, entity_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, entity_type, field_key),
  CONSTRAINT chk_custom_fields_type CHECK (field_type IN ('TEXT','NUMBER','DATE','BOOLEAN','DROPDOWN','MULTI_SELECT'))
);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_fields(tenant_id, entity_type) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS custom_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id),
  option_label TEXT NOT NULL,
  option_value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (custom_field_id, option_value),
  CONSTRAINT chk_custom_field_options_sort CHECK (sort_order >= 0)
);
CREATE INDEX IF NOT EXISTS idx_custom_field_options_field ON custom_field_options(custom_field_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id),
  entity_id UUID NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_bool BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (custom_field_id, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(tenant_id, entity_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Integrations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  integration_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  api_key_encrypted TEXT,
  oauth_json JSONB,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_integration_connections_type CHECK (integration_type IN ('ACCOUNTING','PAYROLL','PAYMENT_GATEWAY','CRM','MESSAGING','OTHER')),
  CONSTRAINT chk_integration_connections_status CHECK (status IN ('CONNECTED','DISCONNECTED','EXPIRED'))
);
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant_type ON integration_connections(tenant_id, integration_type) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  integration_connection_id UUID NOT NULL REFERENCES integration_connections(id),
  sync_direction TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  details_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_integration_sync_logs_direction CHECK (sync_direction IN ('PUSH','PULL','BI_DIRECTIONAL')),
  CONSTRAINT chk_integration_sync_logs_status CHECK (status IN ('STARTED','SUCCEEDED','FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_connection ON integration_sync_logs(integration_connection_id, started_at DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  target_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  secret_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_webhooks_event_type CHECK (event_type IN ('JOB_CREATED','JOB_UPDATED','ISSUE_CREATED','INSPECTION_SUBMITTED','INVOICE_SENT','PAYMENT_RECEIVED'))
);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_active ON webhooks(tenant_id, is_active) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS external_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  integration_connection_id UUID NOT NULL REFERENCES integration_connections(id),
  entity_type TEXT NOT NULL,
  internal_entity_id UUID NOT NULL,
  external_entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (integration_connection_id, entity_type, internal_entity_id),
  CONSTRAINT chk_external_id_map_entity_type CHECK (entity_type IN ('CUSTOMER','INVOICE','PAYMENT','VENDOR','ITEM'))
);
CREATE INDEX IF NOT EXISTS idx_external_id_map_external ON external_id_map(integration_connection_id, external_entity_id) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Optional module: real-estate properties
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS real_estate_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type TEXT,
  property_type TEXT NOT NULL,
  address JSONB,
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_value NUMERIC(12,2),
  rental_units JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_real_estate_properties_type CHECK (property_type IN ('RESIDENTIAL','COMMERCIAL','LAND'))
);
CREATE INDEX IF NOT EXISTS idx_real_estate_properties_tenant_type ON real_estate_properties(tenant_id, property_type) WHERE archived_at IS NULL;

-- --------------------------------------------------------------------------
-- Compatibility views (enterprise aliases)
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW job_sites AS
SELECT
  s.id,
  s.client_id,
  s.name,
  s.address,
  COALESCE(s.geo_lat, s.geofence_center_lat) AS geo_lat,
  COALESCE(s.geo_long, s.geofence_center_lng) AS geo_long,
  s.square_footage,
  s.service_schedule,
  s.alarm_code,
  s.key_code,
  s.qr_closet_id,
  COALESCE(s.special_instructions, s.entry_instructions, s.notes) AS special_instructions,
  s.supply_closet_items,
  s.status,
  s.created_at,
  s.updated_at
FROM sites s;

CREATE OR REPLACE VIEW work_orders AS
SELECT
  wt.id,
  s.client_id,
  wt.site_id,
  wt.contract_id,
  COALESCE(wt.service_id, sj.service_id) AS service_id,
  wt.type,
  wt.title,
  wt.description,
  wt.checklist,
  wt.assigned_to,
  wt.status,
  wt.priority,
  wt.scheduled_at,
  wt.due_at,
  wt.completed_at,
  wt.verification_photos,
  wt.progress,
  wt.created_by,
  wt.notes,
  wt.audit_trail,
  wt.created_at,
  wt.updated_at
FROM work_tickets wt
LEFT JOIN site_jobs sj ON sj.id = wt.job_id
LEFT JOIN sites s ON s.id = wt.site_id;

CREATE OR REPLACE VIEW schedules AS
SELECT
  jv.id,
  jv.tenant_id,
  COALESCE(jv.planned_start::DATE, CURRENT_DATE) AS date,
  sj.site_id,
  NULL::UUID AS user_id,
  jv.planned_start AS planned_start,
  jv.planned_end AS planned_end,
  NULL::INTEGER AS route_order,
  jv.actual_start,
  jv.actual_end,
  jv.status,
  ARRAY[jv.site_job_id]::UUID[] AS tasks,
  jv.notes,
  jv.created_at,
  jv.updated_at
FROM job_visits jv
JOIN site_jobs sj ON sj.id = jv.site_job_id;

CREATE OR REPLACE VIEW inventory_items AS
SELECT
  i.id,
  i.tenant_id,
  COALESCE(i.name, i.item_name) AS name,
  COALESCE(i.category, i.item_category) AS category,
  COALESCE(i.unit, i.uom) AS unit,
  i.vendor_id,
  i.reorder_point,
  COALESCE(i.reorder_quantity, i.reorder_qty) AS reorder_quantity,
  i.unit_cost,
  i.billable_price,
  i.notes,
  i.created_at,
  i.updated_at
FROM items i;

CREATE OR REPLACE VIEW inventory_transactions AS
SELECT
  sm.id,
  sm.tenant_id,
  COALESCE(sm.date, sm.moved_at::DATE) AS date,
  sm.to_inventory_location_id AS site_id,
  sm.item_id,
  sm.quantity,
  COALESCE(sm.type, sm.movement_type) AS type,
  COALESCE(sm.performed_by, sm.performed_by_user_id) AS performed_by,
  NULL::UUID AS related_order_id,
  sm.notes,
  sm.created_at,
  sm.updated_at
FROM stock_movements sm;

CREATE OR REPLACE VIEW equipment_maintenance_logs AS
SELECT
  aml.id,
  aml.equipment_id,
  COALESCE(aml.date, aml.performed_on) AS date,
  COALESCE(aml.performed_by, aml.performed_by_staff_id) AS performed_by,
  COALESCE(aml.description, aml.details) AS description,
  aml.cost,
  aml.next_due_date,
  aml.created_at,
  aml.updated_at
FROM asset_maintenance_logs aml;

CREATE OR REPLACE VIEW quality_control_inspections AS
SELECT
  i.id,
  i.site_id,
  i.inspector_id,
  i.type,
  COALESCE(i.date, i.inspection_date) AS date,
  i.area_scores,
  i.comments,
  i.photos AS photos,
  i.result,
  i.follow_up_tasks,
  i.created_at,
  i.updated_at
FROM inspections i;

CREATE OR REPLACE VIEW employees AS
SELECT
  s.id AS employee_id,
  s.tenant_id AS org_id,
  s.staff_code AS employee_number,
  COALESCE(s.first_name, split_part(COALESCE(s.full_name, ''), ' ', 1)) AS first_name,
  COALESCE(s.last_name, NULLIF(trim(replace(COALESCE(s.full_name, ''), split_part(COALESCE(s.full_name, ''), ' ', 1), '')), '')) AS last_name,
  s.full_name,
  s.staff_status AS status,
  s.role,
  s.employment_type,
  s.pay_type,
  s.pay_rate,
  s.hire_date,
  s.date_of_birth,
  s.languages,
  s.email,
  COALESCE(s.mobile_phone, s.phone) AS phone,
  s.address,
  s.supervisor_id,
  s.integration_ids,
  s.preferences,
  s.created_at,
  s.updated_at,
  s.archived_at AS deleted_at
FROM staff s;

CREATE OR REPLACE VIEW training_modules AS
SELECT
  tc.id AS module_id,
  tc.tenant_id AS org_id,
  tc.course_code AS module_code,
  tc.name AS title,
  tc.category AS department,
  NULL::TEXT AS language,
  NULL::TEXT AS content_url,
  CASE
    WHEN tc.duration_hours IS NULL THEN NULL
    ELSE (tc.duration_hours * 60)::INTEGER
  END AS duration_minutes,
  tc.created_at,
  tc.updated_at
FROM training_courses tc;

CREATE OR REPLACE VIEW training_records AS
SELECT
  tcomp.id AS record_id,
  tcomp.tenant_id AS org_id,
  tcomp.staff_id AS user_id,
  tcomp.course_id AS module_id,
  CASE
    WHEN COALESCE(tcomp.passed, FALSE) = TRUE THEN 'COMPLETED'
    ELSE 'IN_PROGRESS'
  END::TEXT AS status,
  tcomp.completed_date AS completion_date,
  tcomp.score,
  tcomp.notes,
  tcomp.created_at,
  tcomp.updated_at
FROM training_completions tcomp;

CREATE OR REPLACE VIEW assets AS
SELECT
  e.id AS asset_id,
  e.tenant_id AS org_id,
  e.name AS asset_name,
  COALESCE(e.equipment_type, e.equipment_category, 'OTHER') AS asset_type,
  e.serial_number,
  e.manufacturer,
  COALESCE(e.model_number, e.brand) AS model,
  e.purchase_date,
  e.purchase_price AS purchase_cost,
  NULL::DATE AS warranty_expires_at,
  CASE
    WHEN e.condition IN ('OUT_OF_SERVICE') THEN 'UNDER_REPAIR'
    WHEN e.archived_at IS NOT NULL THEN 'RETIRED'
    ELSE 'IN_SERVICE'
  END AS status,
  NULL::UUID AS current_inventory_location_id,
  e.site_id AS current_location_id,
  FALSE::BOOLEAN AS track_via_scan,
  NULL::TEXT AS scan_code,
  e.notes,
  e.updated_at
FROM equipment e;

CREATE OR REPLACE VIEW quotes AS
SELECT
  sp.id AS quote_id,
  sp.tenant_id AS org_id,
  NULL::UUID AS lead_id,
  NULL::UUID AS customer_id,
  NULL::UUID AS location_id,
  NULL::UUID AS prepared_by_user_id,
  sp.proposal_code AS quote_number,
  COALESCE(sp.created_at::DATE, CURRENT_DATE) AS quote_date,
  COALESCE(sp.valid_until::DATE, CURRENT_DATE + INTERVAL '30 day')::DATE AS valid_until,
  CASE
    WHEN sp.status IN ('DRAFT','SENT','APPROVED','REJECTED','EXPIRED','VIEWED') THEN sp.status
    WHEN sp.status = 'WON' THEN 'APPROVED'
    WHEN sp.status = 'LOST' THEN 'REJECTED'
    WHEN sp.status = 'GENERATED' THEN 'DRAFT'
    WHEN sp.status = 'DELIVERED' THEN 'SENT'
    WHEN sp.status = 'OPENED' THEN 'VIEWED'
    ELSE 'DRAFT'
  END AS status,
  'CUSTOM'::TEXT AS pricing_basis,
  0::NUMERIC(12,2) AS subtotal,
  NULL::NUMERIC(12,2) AS tax_amount,
  NULL::NUMERIC(12,2) AS discount_amount,
  0::NUMERIC(12,2) AS total,
  sp.notes AS scope_summary,
  NULL::TEXT AS assumptions,
  NULL::TEXT AS exclusions,
  NULL::TIMESTAMPTZ AS approved_at,
  NULL::UUID AS approved_by_user_id,
  NULL::UUID AS converted_contract_id,
  sp.created_at,
  sp.updated_at
FROM sales_proposals sp;

-- Replace organizations/users views with extension-aware projections
CREATE OR REPLACE VIEW organizations AS
SELECT
  t.id AS org_id,
  t.name AS org_name,
  COALESCE(topr.legal_name, t.name) AS legal_name,
  topr.duns_number,
  topr.website_url,
  topr.main_phone,
  topr.address_line1,
  topr.address_line2,
  topr.city,
  topr.state,
  topr.postal_code,
  COALESCE(topr.country, 'US') AS country,
  COALESCE(topr.timezone, t.default_timezone, 'America/New_York') AS timezone,
  COALESCE(topr.currency_code, 'USD') AS currency_code,
  COALESCE(topr.status, 'ACTIVE') AS status,
  topr.data_retention_days,
  t.created_at,
  COALESCE(topr.updated_at, t.updated_at) AS updated_at,
  topr.archived_at AS deleted_at
FROM tenants t
LEFT JOIN tenant_org_profiles topr ON topr.tenant_id = t.id;

DROP VIEW IF EXISTS users;
CREATE VIEW users AS
SELECT
  au.id AS user_id,
  tm.tenant_id AS org_id,
  au.email,
  COALESCE(usp.email_verified, au.email_confirmed_at IS NOT NULL, FALSE) AS email_verified,
  usp.password_hash,
  CASE
    WHEN tm.role_code = 'OWNER_ADMIN' THEN 'SYSTEM'
    WHEN COALESCE(usp.user_status, 'ACTIVE') = 'PENDING_INVITE' THEN 'CLIENT'
    ELSE 'EMPLOYEE'
  END::TEXT AS user_type,
  tm.role_code AS role,
  s.first_name,
  s.last_name,
  COALESCE(s.mobile_phone, s.phone) AS phone,
  s.languages,
  s.address,
  s.date_of_birth,
  s.hire_date,
  s.employment_type,
  s.pay_rate,
  s.certifications,
  usp.reset_token,
  usp.preferred_language,
  usp.notification_channels,
  s.assigned_site_ids AS assigned_sites,
  s.supervisor_id,
  s.integration_ids,
  s.id AS employee_id,
  NULL::UUID AS client_contact_id,
  COALESCE(usp.user_status, 'ACTIVE') AS status,
  COALESCE(usp.last_login_at, au.last_sign_in_at) AS last_login_at,
  COALESCE(usp.mfa_enabled, (au.raw_user_meta_data ? 'mfa_enabled'), FALSE) AS mfa_enabled,
  au.created_at,
  COALESCE(usp.updated_at, au.updated_at, au.created_at) AS updated_at,
  usp.archived_at AS deleted_at
FROM tenant_memberships tm
JOIN auth.users au ON au.id = tm.user_id
LEFT JOIN user_security_profiles usp ON usp.tenant_id = tm.tenant_id AND usp.user_id = tm.user_id
LEFT JOIN staff s ON s.user_id = tm.user_id AND s.tenant_id = tm.tenant_id;

-- --------------------------------------------------------------------------
-- RLS + triggers for new tables with tenant_id
-- --------------------------------------------------------------------------
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tenant_org_profiles','user_security_profiles',
    'vendors','inventory_locations','items','stock_levels','stock_movements','purchase_orders','purchase_order_lines','supply_requests','supply_request_lines',
    'asset_transfers','asset_maintenance_logs',
    'invoices','invoice_line_items','invoice_jobs','payments',
    'pay_periods','payroll_runs','earning_codes','payroll_line_items',
    'conversations','conversation_participants','notification_preferences',
    'file_links','tags','tag_assignments','custom_fields','custom_field_options','custom_field_values',
    'integration_connections','integration_sync_logs','webhooks','external_id_map',
    'real_estate_properties'
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
