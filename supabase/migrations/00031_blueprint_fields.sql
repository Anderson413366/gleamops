-- Migration: Add blueprint-specified fields to core tables
-- Aligns with the Anderson Cleaning Ops App Blueprint

-- =====================================================================
-- CLIENT: Add billing, contract, classification fields
-- =====================================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_changed_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_since DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES contacts(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bill_to_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS po_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS invoice_frequency TEXT;

-- =====================================================================
-- SITE: Add service window, facility, compliance, oversight fields
-- =====================================================================
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_date DATE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS earliest_start_time TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS latest_start_time TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_hours_start TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_hours_end TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS weekend_access BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS entry_instructions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS parking_instructions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS alarm_system TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS alarm_company TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS security_protocol TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS number_of_floors INTEGER;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS employees_on_site INTEGER;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS janitorial_closet_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS supply_storage_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS water_source_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS dumpster_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS emergency_contact_id UUID REFERENCES contacts(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES staff(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS priority_level TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS osha_compliance_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS background_check_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_inspection_date DATE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS next_inspection_date DATE;

-- =====================================================================
-- CONTACT: Add name parts, type, method, language fields
-- =====================================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_language TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- =====================================================================
-- STAFF: Add employment, personal, emergency, HR fields
-- =====================================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pay_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS schedule_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES staff(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS background_check_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS performance_rating NUMERIC(3,1);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================================
-- SITE_JOBS: Add job name, type, operations, billing fields
-- =====================================================================
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS job_name TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS priority_level TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS schedule_days TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS staff_needed INTEGER;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS estimated_hours_per_service NUMERIC(6,2);
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS estimated_hours_per_month NUMERIC(6,2);
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2);
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS billing_uom TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS job_assigned_to TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES subcontractors(id);
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS invoice_description TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE site_jobs ADD COLUMN IF NOT EXISTS special_requirements TEXT;

-- =====================================================================
-- TASKS: Add subcategory, area, floor, priority, descriptions
-- =====================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS area_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS floor_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_level TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spec_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tools_materials TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================================
-- SERVICE_TASKS: Add sequence, priority, required, weight fields
-- =====================================================================
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS sequence_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS priority_level TEXT;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS quality_weight NUMERIC(3,1) NOT NULL DEFAULT 1;
ALTER TABLE service_tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================================
-- SUPPLY_CATALOG: Add vendor, safety, stock fields
-- =====================================================================
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS supply_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS pack_size TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,2);
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS billing_rate NUMERIC(10,2);
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS min_stock_level INTEGER;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS model_number TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS preferred_vendor TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS vendor_sku TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS eco_rating TEXT;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS ppe_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS image_url TEXT;

-- =====================================================================
-- EQUIPMENT: Add category, maintenance, purchase fields
-- =====================================================================
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS paired_with UUID REFERENCES equipment(id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_category TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS model_number TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS maintenance_specs TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_maintenance_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- =====================================================================
-- SUBCONTRACTOR: Add contact, insurance, compliance fields
-- =====================================================================
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS w9_on_file BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================================
-- Add Job Log table (per blueprint, required for Operations module)
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  job_id UUID REFERENCES site_jobs(id),
  log_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL, -- Lookups "Log Event Type"
  message TEXT,
  severity TEXT NOT NULL DEFAULT 'MINOR', -- Lookups "Severity Level"
  description TEXT,
  photos_link TEXT,
  corrective_action TEXT,
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'OPEN', -- Lookups "Log Status"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Enable RLS
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_logs USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- =====================================================================
-- Add Job Task table (per blueprint, auto-generated from Service Tasks)
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES site_jobs(id),
  task_id UUID REFERENCES tasks(id),
  task_code TEXT,
  task_name TEXT,
  planned_minutes INTEGER,
  qc_weight NUMERIC(3,1) DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_tasks USING (tenant_id = current_setting('app.tenant_id')::UUID);
