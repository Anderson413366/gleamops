-- =============================================================================
-- Migration 00120: Sprint 4 — Reference Table Linkage
-- =============================================================================
-- S4-T1: Backfill sites.site_type_id from client_type heuristic
-- S4-T2: Backfill site_jobs.service_id from frequency heuristic
-- S4-T3: Backfill services.service_type + billing_model + CHECK constraints
-- S4-T4: Insert POS-015 "Full Cleaning Specialist" + staff.role CHECK
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S4-T1: Backfill sites.site_type_id
-- Insert standard site types if they don't exist, then backfill from client_type.
-- ---------------------------------------------------------------------------
INSERT INTO site_types (tenant_id, code, name, sort_order)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'OFFICE', 'Office Building', 1),
  ('a0000000-0000-0000-0000-000000000001', 'MEDICAL', 'Medical / Healthcare', 2),
  ('a0000000-0000-0000-0000-000000000001', 'RETAIL', 'Retail Store', 3),
  ('a0000000-0000-0000-0000-000000000001', 'INDUSTRIAL', 'Industrial / Warehouse', 4),
  ('a0000000-0000-0000-0000-000000000001', 'EDUCATIONAL', 'Educational Facility', 5),
  ('a0000000-0000-0000-0000-000000000001', 'RESTAURANT', 'Restaurant / Food Service', 6),
  ('a0000000-0000-0000-0000-000000000001', 'RELIGIOUS', 'Religious Facility', 7),
  ('a0000000-0000-0000-0000-000000000001', 'RESIDENTIAL', 'Residential', 8),
  ('a0000000-0000-0000-0000-000000000001', 'GOVERNMENT', 'Government Building', 9),
  ('a0000000-0000-0000-0000-000000000001', 'FITNESS', 'Gym / Fitness Center', 10),
  ('a0000000-0000-0000-0000-000000000001', 'OTHER', 'Other', 99)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Backfill site_type_id based on client's client_type heuristic
UPDATE sites s
SET site_type_id = st.id
FROM site_types st
WHERE s.site_type_id IS NULL
  AND s.tenant_id = st.tenant_id
  AND st.code = CASE
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%medical%'
    ) THEN 'MEDICAL'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%office%'
    ) THEN 'OFFICE'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%retail%'
    ) THEN 'RETAIL'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%industrial%'
    ) THEN 'INDUSTRIAL'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%school%'
    ) THEN 'EDUCATIONAL'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%restaurant%'
    ) THEN 'RESTAURANT'
    WHEN EXISTS (
      SELECT 1 FROM clients c WHERE c.id = s.client_id
        AND lower(COALESCE(c.client_type, '')) LIKE '%church%'
    ) THEN 'RELIGIOUS'
    ELSE 'OFFICE'  -- Default to OFFICE for unmatched
  END;

-- ---------------------------------------------------------------------------
-- S4-T2: Backfill site_jobs.service_id from frequency heuristic
-- Map frequency to the appropriate service type.
-- ---------------------------------------------------------------------------
-- First ensure standard services exist
INSERT INTO services (tenant_id, service_code, name, description)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SER-0001', 'Daily Janitorial', 'Standard daily cleaning service'),
  ('a0000000-0000-0000-0000-000000000001', 'SER-0002', 'Weekly Cleaning', 'Standard weekly cleaning service'),
  ('a0000000-0000-0000-0000-000000000001', 'SER-0003', 'Bi-Weekly Cleaning', 'Bi-weekly cleaning service'),
  ('a0000000-0000-0000-0000-000000000001', 'SER-0004', 'Monthly Deep Clean', 'Monthly deep cleaning service'),
  ('a0000000-0000-0000-0000-000000000001', 'SER-0005', 'One-Time Service', 'One-time or on-demand service')
ON CONFLICT (service_code) DO NOTHING;

-- Backfill service_id based on frequency
UPDATE site_jobs sj
SET service_id = s.id
FROM services s
WHERE sj.service_id IS NULL
  AND sj.tenant_id = s.tenant_id
  AND s.service_code = CASE
    WHEN upper(COALESCE(sj.frequency, '')) IN ('DAILY', '5X_WEEK', '6X_WEEK', '7X_WEEK') THEN 'SER-0001'
    WHEN upper(COALESCE(sj.frequency, '')) IN ('WEEKLY', '2X_WEEK', '3X_WEEK', '4X_WEEK') THEN 'SER-0002'
    WHEN upper(COALESCE(sj.frequency, '')) IN ('BIWEEKLY', 'BI_WEEKLY') THEN 'SER-0003'
    WHEN upper(COALESCE(sj.frequency, '')) IN ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL') THEN 'SER-0004'
    ELSE 'SER-0005'
  END;

-- ---------------------------------------------------------------------------
-- S4-T3: Backfill services.service_type + billing_model + CHECK constraints
-- ---------------------------------------------------------------------------
UPDATE services
SET service_type = CASE
    WHEN lower(name) LIKE '%daily%' OR lower(name) LIKE '%janitorial%' THEN 'JANITORIAL'
    WHEN lower(name) LIKE '%deep%' OR lower(name) LIKE '%strip%' THEN 'DEEP_CLEAN'
    WHEN lower(name) LIKE '%window%' THEN 'SPECIALTY'
    WHEN lower(name) LIKE '%carpet%' THEN 'SPECIALTY'
    WHEN lower(name) LIKE '%floor%' THEN 'FLOOR_CARE'
    ELSE 'GENERAL'
  END
WHERE service_type IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE services
SET billing_model = CASE
    WHEN lower(name) LIKE '%one%time%' OR lower(name) LIKE '%on%demand%' THEN 'PER_VISIT'
    ELSE 'MONTHLY_FLAT'
  END
WHERE billing_model IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

ALTER TABLE services
  ADD CONSTRAINT chk_services_service_type
  CHECK (service_type IS NULL OR service_type IN (
    'JANITORIAL', 'DEEP_CLEAN', 'FLOOR_CARE', 'SPECIALTY', 'GENERAL', 'POST_CONSTRUCTION', 'DISINFECTION'
  ));

ALTER TABLE services
  ADD CONSTRAINT chk_services_billing_model
  CHECK (billing_model IS NULL OR billing_model IN (
    'MONTHLY_FLAT', 'PER_VISIT', 'PER_SQFT', 'HOURLY', 'FIXED_BID'
  ));

-- ---------------------------------------------------------------------------
-- S4-T4: Insert POS-015 "Full Cleaning Specialist" position
-- ---------------------------------------------------------------------------
INSERT INTO staff_positions (tenant_id, position_code, title, department, notes)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'POS-015',
  'Full Cleaning Specialist',
  'Operations',
  'Versatile cleaner qualified across all service types including janitorial, deep clean, floor care, and specialty.'
)
ON CONFLICT (tenant_id, position_code) DO NOTHING;

-- Add CHECK constraint on staff.role
ALTER TABLE staff
  ADD CONSTRAINT chk_staff_role
  CHECK (role IN (
    'OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR', 'SALES',
    'DRIVER', 'WAREHOUSE', 'TRAINER', 'LEAD'
  ));

COMMIT;
