-- ==========================================================================
-- Migration 00032: Sprint 0 — Data cleanup, RLS fixes, lookup/transition seeds
-- ==========================================================================

-- =====================================================================
-- A. Fix RLS policies on 10 tables
-- =====================================================================

-- -- 00030 tables: use raw JWT extraction instead of current_tenant_id() helper
-- -- 00031 tables: use current_setting('app.tenant_id')::UUID (wrong setting key)
-- Fix: DROP each tenant_isolation policy, CREATE granular SELECT/INSERT/UPDATE
-- policies using current_tenant_id() + has_any_role()

-- ---------------------------------------------------------------------------
-- A1. equipment (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.equipment;

CREATE POLICY equipment_select ON public.equipment
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY equipment_insert ON public.equipment
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY equipment_update ON public.equipment
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- A2. equipment_assignments (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.equipment_assignments;

CREATE POLICY equipment_assignments_select ON public.equipment_assignments
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY equipment_assignments_insert ON public.equipment_assignments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY equipment_assignments_update ON public.equipment_assignments
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- A3. vehicle_maintenance (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.vehicle_maintenance;

CREATE POLICY vehicle_maintenance_select ON public.vehicle_maintenance
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY vehicle_maintenance_insert ON public.vehicle_maintenance
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY vehicle_maintenance_update ON public.vehicle_maintenance
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

-- ---------------------------------------------------------------------------
-- A4. supply_orders (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.supply_orders;

CREATE POLICY supply_orders_select ON public.supply_orders
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY supply_orders_insert ON public.supply_orders
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY supply_orders_update ON public.supply_orders
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

-- ---------------------------------------------------------------------------
-- A5. inventory_counts (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.inventory_counts;

CREATE POLICY inventory_counts_select ON public.inventory_counts
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY inventory_counts_insert ON public.inventory_counts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER'])
  );

CREATE POLICY inventory_counts_update ON public.inventory_counts
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- A6. inventory_count_details (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.inventory_count_details;

CREATE POLICY inventory_count_details_select ON public.inventory_count_details
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY inventory_count_details_insert ON public.inventory_count_details
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER'])
  );

CREATE POLICY inventory_count_details_update ON public.inventory_count_details
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- A7. subcontractors (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.subcontractors;

CREATE POLICY subcontractors_select ON public.subcontractors
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY subcontractors_insert ON public.subcontractors
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

CREATE POLICY subcontractors_update ON public.subcontractors
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

-- ---------------------------------------------------------------------------
-- A8. staff_positions (from 00030)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.staff_positions;

CREATE POLICY staff_positions_select ON public.staff_positions
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY staff_positions_insert ON public.staff_positions
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

CREATE POLICY staff_positions_update ON public.staff_positions
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

-- ---------------------------------------------------------------------------
-- A9. job_logs (from 00031 — uses wrong setting key 'app.tenant_id')
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON public.job_logs;

CREATE POLICY job_logs_select ON public.job_logs
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY job_logs_insert ON public.job_logs
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR','CLEANER','INSPECTOR'])
  );

CREATE POLICY job_logs_update ON public.job_logs
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- ---------------------------------------------------------------------------
-- A10. job_tasks (from 00031 — uses wrong setting key 'app.tenant_id')
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON public.job_tasks;

CREATE POLICY job_tasks_select ON public.job_tasks
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY job_tasks_insert ON public.job_tasks
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

CREATE POLICY job_tasks_update ON public.job_tasks
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
  );

-- =====================================================================
-- B. Data Cleanup
-- =====================================================================

-- B1. Staff code dedup — keep lowest id per (tenant_id, staff_code)
DELETE FROM public.staff a
USING public.staff b
WHERE a.tenant_id = b.tenant_id
  AND a.staff_code = b.staff_code
  AND a.id > b.id;

-- B2. Sentinel dates to NULL (1900-01-01, 9999-12-31 are placeholder dates)
UPDATE public.clients SET contract_start_date = NULL
  WHERE contract_start_date IN ('1900-01-01', '9999-12-31');
UPDATE public.clients SET contract_end_date = NULL
  WHERE contract_end_date IN ('1900-01-01', '9999-12-31');
UPDATE public.clients SET insurance_expiry = NULL
  WHERE insurance_expiry IN ('1900-01-01', '9999-12-31');
UPDATE public.clients SET client_since = NULL
  WHERE client_since IN ('1900-01-01', '9999-12-31');

UPDATE public.staff SET hire_date = NULL
  WHERE hire_date IN ('1900-01-01', '9999-12-31');
UPDATE public.staff SET termination_date = NULL
  WHERE termination_date IN ('1900-01-01', '9999-12-31');
UPDATE public.staff SET background_check_date = NULL
  WHERE background_check_date IN ('1900-01-01', '9999-12-31');

UPDATE public.sites SET service_start_date = NULL
  WHERE service_start_date IN ('1900-01-01', '9999-12-31');
UPDATE public.sites SET last_inspection_date = NULL
  WHERE last_inspection_date IN ('1900-01-01', '9999-12-31');
UPDATE public.sites SET next_inspection_date = NULL
  WHERE next_inspection_date IN ('1900-01-01', '9999-12-31');

UPDATE public.equipment SET purchase_date = NULL
  WHERE purchase_date IN ('1900-01-01', '9999-12-31');
UPDATE public.equipment SET last_maintenance_date = NULL
  WHERE last_maintenance_date IN ('1900-01-01', '9999-12-31');
UPDATE public.equipment SET next_maintenance_date = NULL
  WHERE next_maintenance_date IN ('1900-01-01', '9999-12-31');

-- B3. Frequency normalization on site_jobs
UPDATE public.site_jobs SET frequency = UPPER(TRIM(frequency))
  WHERE frequency IS NOT NULL;
UPDATE public.site_jobs SET frequency = 'BIWEEKLY'
  WHERE frequency IN ('BI-WEEKLY', 'FORTNIGHTLY', 'BI_WEEKLY', 'EVERY_TWO_WEEKS');

-- B4. Orphaned contacts: delete contacts with no client_id AND no site_id
DELETE FROM public.contacts
  WHERE client_id IS NULL AND site_id IS NULL;

-- B5. Blank lookup rows: delete lookups with empty code or label
DELETE FROM public.lookups
  WHERE TRIM(COALESCE(code, '')) = '' OR TRIM(COALESCE(label, '')) = '';

-- =====================================================================
-- C. Seed missing lookup categories
-- =====================================================================

-- Client status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'client_status', 'PROSPECT', 'Prospect', 1),
  (NULL, 'client_status', 'ACTIVE', 'Active', 2),
  (NULL, 'client_status', 'ON_HOLD', 'On Hold', 3),
  (NULL, 'client_status', 'INACTIVE', 'Inactive', 4),
  (NULL, 'client_status', 'CANCELLED', 'Cancelled', 5)
ON CONFLICT DO NOTHING;

-- Site status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'site_status', 'ACTIVE', 'Active', 1),
  (NULL, 'site_status', 'ON_HOLD', 'On Hold', 2),
  (NULL, 'site_status', 'INACTIVE', 'Inactive', 3)
ON CONFLICT DO NOTHING;

-- Job status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'job_status', 'ACTIVE', 'Active', 1),
  (NULL, 'job_status', 'PAUSED', 'Paused', 2),
  (NULL, 'job_status', 'CANCELLED', 'Cancelled', 3),
  (NULL, 'job_status', 'COMPLETED', 'Completed', 4)
ON CONFLICT DO NOTHING;

-- Staff status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'staff_status', 'ACTIVE', 'Active', 1),
  (NULL, 'staff_status', 'ON_LEAVE', 'On Leave', 2),
  (NULL, 'staff_status', 'INACTIVE', 'Inactive', 3),
  (NULL, 'staff_status', 'TERMINATED', 'Terminated', 4)
ON CONFLICT DO NOTHING;

-- Equipment condition
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'equipment_condition', 'AVAILABLE', 'Available', 1),
  (NULL, 'equipment_condition', 'IN_USE', 'In Use', 2),
  (NULL, 'equipment_condition', 'MAINTENANCE', 'Maintenance', 3),
  (NULL, 'equipment_condition', 'RETIRED', 'Retired', 4)
ON CONFLICT DO NOTHING;

-- Supply status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'supply_status', 'ACTIVE', 'Active', 1),
  (NULL, 'supply_status', 'DISCONTINUED', 'Discontinued', 2),
  (NULL, 'supply_status', 'OUT_OF_STOCK', 'Out of Stock', 3)
ON CONFLICT DO NOTHING;

-- Vehicle status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'vehicle_status', 'ACTIVE', 'Active', 1),
  (NULL, 'vehicle_status', 'IN_SHOP', 'In Shop', 2),
  (NULL, 'vehicle_status', 'RETIRED', 'Retired', 3)
ON CONFLICT DO NOTHING;

-- Key status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'key_status', 'AVAILABLE', 'Available', 1),
  (NULL, 'key_status', 'ASSIGNED', 'Assigned', 2),
  (NULL, 'key_status', 'LOST', 'Lost', 3),
  (NULL, 'key_status', 'RETURNED', 'Returned', 4)
ON CONFLICT DO NOTHING;

-- Subcontractor status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'subcontractor_status', 'ACTIVE', 'Active', 1),
  (NULL, 'subcontractor_status', 'INACTIVE', 'Inactive', 2),
  (NULL, 'subcontractor_status', 'PENDING', 'Pending', 3)
ON CONFLICT DO NOTHING;

-- Log event type
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'log_event_type', 'COMPLAINT', 'Complaint', 1),
  (NULL, 'log_event_type', 'INCIDENT', 'Incident', 2),
  (NULL, 'log_event_type', 'DAMAGE', 'Damage', 3),
  (NULL, 'log_event_type', 'SAFETY', 'Safety', 4),
  (NULL, 'log_event_type', 'NOTE', 'Note', 5),
  (NULL, 'log_event_type', 'INSPECTION', 'Inspection', 6)
ON CONFLICT DO NOTHING;

-- Severity level
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'severity_level', 'MINOR', 'Minor', 1),
  (NULL, 'severity_level', 'MAJOR', 'Major', 2),
  (NULL, 'severity_level', 'CRITICAL', 'Critical', 3)
ON CONFLICT DO NOTHING;

-- Log status
INSERT INTO public.lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'log_status', 'OPEN', 'Open', 1),
  (NULL, 'log_status', 'IN_PROGRESS', 'In Progress', 2),
  (NULL, 'log_status', 'RESOLVED', 'Resolved', 3),
  (NULL, 'log_status', 'CLOSED', 'Closed', 4)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- D. Seed status transitions for core entities
-- =====================================================================

-- Client transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'client', 'PROSPECT', 'ACTIVE', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'client', 'ACTIVE', 'ON_HOLD', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'client', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'client', 'ACTIVE', 'CANCELLED', '{OWNER_ADMIN}'),
  (NULL, 'client', 'ON_HOLD', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'client', 'ON_HOLD', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'client', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}')
ON CONFLICT DO NOTHING;

-- Site transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'site', 'ACTIVE', 'ON_HOLD', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'site', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'site', 'ON_HOLD', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'site', 'ON_HOLD', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'site', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}')
ON CONFLICT DO NOTHING;

-- Job transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'job', 'ACTIVE', 'PAUSED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'job', 'ACTIVE', 'CANCELLED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'job', 'ACTIVE', 'COMPLETED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'job', 'PAUSED', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'job', 'PAUSED', 'CANCELLED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'job', 'COMPLETED', 'ACTIVE', '{OWNER_ADMIN}')
ON CONFLICT DO NOTHING;

-- Staff transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'staff', 'ACTIVE', 'ON_LEAVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'staff', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'staff', 'ACTIVE', 'TERMINATED', '{OWNER_ADMIN}'),
  (NULL, 'staff', 'ON_LEAVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'staff', 'ON_LEAVE', 'TERMINATED', '{OWNER_ADMIN}'),
  (NULL, 'staff', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'staff', 'INACTIVE', 'TERMINATED', '{OWNER_ADMIN}')
ON CONFLICT DO NOTHING;

-- Equipment transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'equipment', 'AVAILABLE', 'IN_USE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'equipment', 'AVAILABLE', 'MAINTENANCE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'equipment', 'AVAILABLE', 'RETIRED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'equipment', 'IN_USE', 'AVAILABLE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'equipment', 'IN_USE', 'MAINTENANCE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'equipment', 'MAINTENANCE', 'AVAILABLE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'equipment', 'MAINTENANCE', 'RETIRED', '{OWNER_ADMIN,MANAGER}')
ON CONFLICT DO NOTHING;

-- Supply transitions
INSERT INTO public.status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'supply', 'ACTIVE', 'DISCONTINUED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'supply', 'ACTIVE', 'OUT_OF_STOCK', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'supply', 'DISCONTINUED', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'supply', 'OUT_OF_STOCK', 'ACTIVE', '{OWNER_ADMIN,MANAGER,SUPERVISOR}')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- E. Ensure all entity prefixes exist in system_sequences
-- =====================================================================
INSERT INTO public.system_sequences (id, tenant_id, prefix, current_value)
SELECT gen_random_uuid(), t.id, p.prefix, 0
FROM public.tenants t
CROSS JOIN (VALUES ('CLI'), ('SIT'), ('CON'), ('TSK'), ('SER'),
                   ('PRO'), ('OPP'), ('BID'), ('PRP'), ('JOB'),
                   ('TKT'), ('STF'), ('FIL'), ('EQP'), ('SUB'),
                   ('POS'), ('VEH'), ('ORD'), ('CNT'), ('LOG')) AS p(prefix)
ON CONFLICT DO NOTHING;

-- Add triggers for job_logs and job_tasks (missing from 00031)
DROP TRIGGER IF EXISTS set_updated_at ON public.job_logs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.job_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_version_etag ON public.job_logs;
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.job_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS set_updated_at ON public.job_tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_version_etag ON public.job_tasks;
CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();
