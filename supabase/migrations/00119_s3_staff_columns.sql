-- =============================================================================
-- Migration 00119: Sprint 3 — Staff Column Consolidation + Deprecated Drops
-- =============================================================================
-- S3-T1: Rename staff.staff_type → staff_type_deprecated
-- S3-T2: Rename staff.staff_status → status
-- S3-T3: Drop 4 deprecated columns from clients (00066 duplicates)
-- S3-T4: Drop 7 deprecated columns from sites (00066 unused enterprise parity)
-- S3-T5: Drop 8 deprecated columns from tasks (00065/00066 unused)
-- S3-T6: Drop 4 deprecated columns from services (00066 unused)
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S3-T1: Rename staff.staff_type → staff_type_deprecated
-- employment_type is the authoritative field (aligned in S1-T2).
-- ---------------------------------------------------------------------------
ALTER TABLE staff RENAME COLUMN staff_type TO staff_type_deprecated;

-- ---------------------------------------------------------------------------
-- S3-T2: Rename staff.staff_status → status
-- Aligns with naming convention used by clients, sites, site_jobs, work_tickets.
-- ---------------------------------------------------------------------------
ALTER TABLE staff RENAME COLUMN staff_status TO status;

-- Update the default on the renamed column
ALTER TABLE staff ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Recreate the performance index on the renamed column
DROP INDEX IF EXISTS idx_staff_status;
CREATE INDEX idx_staff_status ON staff(status) WHERE archived_at IS NULL;

-- Recreate the mv_staff_performance materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_staff_performance;
CREATE MATERIALIZED VIEW mv_staff_performance AS
SELECT
  st.id AS staff_id,
  st.tenant_id,
  st.staff_code,
  st.full_name,
  st.role,
  st.status,
  COALESCE(te_agg.total_hours, 0) AS hours_last_30d,
  COALESCE(te_agg.entry_count, 0) AS entries_last_30d,
  COALESCE(ex.exception_count, 0) AS exceptions_last_30d
FROM staff st
LEFT JOIN LATERAL (
  SELECT
    ROUND(SUM(COALESCE(te.duration_minutes, 0)) / 60.0, 2) AS total_hours,
    COUNT(*) AS entry_count
  FROM time_entries te
  WHERE te.staff_id = st.id
    AND te.start_at >= NOW() - INTERVAL '30 days'
) te_agg ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS exception_count
  FROM time_exceptions tex
  WHERE tex.staff_id = st.id
    AND tex.created_at >= NOW() - INTERVAL '30 days'
) ex ON true
WHERE st.archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mv_staff_performance_staff_id
  ON mv_staff_performance(staff_id);

-- Recreate the employees view with renamed column
CREATE OR REPLACE VIEW employees AS
SELECT
  s.id AS employee_id,
  s.tenant_id AS org_id,
  s.staff_code AS employee_number,
  COALESCE(s.first_name, split_part(COALESCE(s.full_name, ''), ' ', 1)) AS first_name,
  COALESCE(s.last_name, NULLIF(trim(replace(COALESCE(s.full_name, ''), split_part(COALESCE(s.full_name, ''), ' ', 1), '')), '')) AS last_name,
  s.full_name,
  s.status,
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

-- ---------------------------------------------------------------------------
-- S3-T3: Drop 4 deprecated columns from clients
-- These were added in 00066_enterprise_parity_extended and duplicate 00031 fields.
-- ---------------------------------------------------------------------------
ALTER TABLE clients DROP COLUMN IF EXISTS type;           -- duplicates client_type
ALTER TABLE clients DROP COLUMN IF EXISTS contract_start; -- duplicates contract_start_date
ALTER TABLE clients DROP COLUMN IF EXISTS contract_end;   -- duplicates contract_end_date
ALTER TABLE clients DROP COLUMN IF EXISTS terms;          -- duplicates payment_terms

-- ---------------------------------------------------------------------------
-- S3-T4: Drop 7 deprecated columns from sites
-- These were added in 00066_enterprise_parity_extended and are unused by the app.
-- ---------------------------------------------------------------------------
ALTER TABLE sites DROP COLUMN IF EXISTS qr_closet_id;
ALTER TABLE sites DROP COLUMN IF EXISTS supply_closet_items;
ALTER TABLE sites DROP COLUMN IF EXISTS occupancy_level;
ALTER TABLE sites DROP COLUMN IF EXISTS traffic_level;
ALTER TABLE sites DROP COLUMN IF EXISTS security_level;
ALTER TABLE sites DROP COLUMN IF EXISTS default_service_frequency;
ALTER TABLE sites DROP COLUMN IF EXISTS service_schedule;

-- ---------------------------------------------------------------------------
-- S3-T5: Drop 8 deprecated columns from tasks
-- These were added in 00065/00066 enterprise parity and are unused by the app.
-- ---------------------------------------------------------------------------
ALTER TABLE tasks DROP COLUMN IF EXISTS task_category_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS task_description;
ALTER TABLE tasks DROP COLUMN IF EXISTS default_minutes_per_unit;
ALTER TABLE tasks DROP COLUMN IF EXISTS default_units_per_hour;
ALTER TABLE tasks DROP COLUMN IF EXISTS compliance_standard;
ALTER TABLE tasks DROP COLUMN IF EXISTS requires_chemical;
ALTER TABLE tasks DROP COLUMN IF EXISTS qc_weight;
ALTER TABLE tasks DROP COLUMN IF EXISTS requires_ppe;

-- ---------------------------------------------------------------------------
-- S3-T6: Drop 4 deprecated columns from services
-- These were added in 00066_enterprise_parity_extended and are unused by the app.
-- ---------------------------------------------------------------------------
ALTER TABLE services DROP COLUMN IF EXISTS service_name;
ALTER TABLE services DROP COLUMN IF EXISTS default_rate;
ALTER TABLE services DROP COLUMN IF EXISTS supplies_required;
ALTER TABLE services DROP COLUMN IF EXISTS equipment_required;

COMMIT;
