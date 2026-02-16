-- ============================================================================
-- 00059_schema_alignment.sql
-- Schema alignment for core entity fields referenced by app types/UI.
-- NOTE: 00050_* already exists in this repo; this migration uses the next slot.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES contacts(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bill_to_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS po_required BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS invoice_frequency TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_since DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_changed_date TIMESTAMPTZ;

ALTER TABLE clients ALTER COLUMN payment_terms SET DEFAULT '30_NET';
ALTER TABLE clients ALTER COLUMN po_required SET DEFAULT FALSE;
ALTER TABLE clients ALTER COLUMN insurance_required SET DEFAULT FALSE;
ALTER TABLE clients ALTER COLUMN auto_renewal SET DEFAULT FALSE;
ALTER TABLE clients ALTER COLUMN invoice_frequency SET DEFAULT 'MONTHLY';

-- ----------------------------------------------------------------------------
-- SITES
-- ----------------------------------------------------------------------------
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_date TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS earliest_start_time TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS latest_start_time TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_hours_start TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_hours_end TIME;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS weekend_access BOOLEAN DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS entry_instructions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS parking_instructions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS alarm_system TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS alarm_company TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS security_protocol TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS number_of_floors INTEGER DEFAULT 1;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS employees_on_site INTEGER;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS janitorial_closet_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS supply_storage_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS water_source_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS dumpster_location TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS emergency_contact_id UUID REFERENCES contacts(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES staff(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'NORMAL';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS osha_compliance_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS background_check_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_inspection_date DATE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS next_inspection_date DATE;

ALTER TABLE sites ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE sites ALTER COLUMN weekend_access SET DEFAULT FALSE;
ALTER TABLE sites ALTER COLUMN number_of_floors SET DEFAULT 1;
ALTER TABLE sites ALTER COLUMN risk_level SET DEFAULT 'LOW';
ALTER TABLE sites ALTER COLUMN priority_level SET DEFAULT 'NORMAL';
ALTER TABLE sites ALTER COLUMN osha_compliance_required SET DEFAULT FALSE;
ALTER TABLE sites ALTER COLUMN background_check_required SET DEFAULT FALSE;

-- ----------------------------------------------------------------------------
-- STAFF
-- ----------------------------------------------------------------------------
ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'FULL_TIME';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'HOURLY';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS schedule_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES staff(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications JSONB;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS background_check_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS performance_rating NUMERIC(3,1);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE staff ALTER COLUMN staff_status SET DEFAULT 'ACTIVE';
ALTER TABLE staff ALTER COLUMN employment_type SET DEFAULT 'FULL_TIME';
ALTER TABLE staff ALTER COLUMN pay_type SET DEFAULT 'HOURLY';

-- ----------------------------------------------------------------------------
-- CONTACTS
-- ----------------------------------------------------------------------------
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'EMAIL';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE contacts ALTER COLUMN preferred_contact_method SET DEFAULT 'EMAIL';
ALTER TABLE contacts ALTER COLUMN preferred_language SET DEFAULT 'en';

-- ----------------------------------------------------------------------------
-- EQUIPMENT
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- SUBCONTRACTORS
-- ----------------------------------------------------------------------------
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
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS w9_on_file BOOLEAN DEFAULT FALSE;

ALTER TABLE subcontractors ALTER COLUMN w9_on_file SET DEFAULT FALSE;

-- ----------------------------------------------------------------------------
-- TASKS
-- ----------------------------------------------------------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS area_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS floor_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_level TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spec_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tools_materials TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE tasks ALTER COLUMN is_active SET DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- RLS SAFETY: these tables should already be protected by tenant policies.
-- If a table has no policies at all, create baseline tenant isolation policies.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  has_any_policy BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clients', 'sites', 'staff', 'contacts', 'equipment', 'subcontractors', 'tasks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    ) INTO has_any_policy;

    IF NOT has_any_policy THEN
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
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
