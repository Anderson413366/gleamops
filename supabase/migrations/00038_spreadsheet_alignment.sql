-- 00038_spreadsheet_alignment.sql
-- Milestone 8: Spreadsheet Delta Alignment
-- A. CANCELLED → CANCELED (US English)
-- B. Add DRAFT + LOST statuses
-- C. Frequency expansion
-- D. Job code formula function

BEGIN;

-- =========================================================================
-- A. CANCELLED → CANCELED (US English spelling)
-- =========================================================================

-- A1. Update lookup rows
UPDATE lookups SET code = 'CANCELED', label = 'Canceled'
  WHERE code = 'CANCELLED';

-- A2. Update entity data columns
UPDATE site_jobs    SET status = 'CANCELED' WHERE status = 'CANCELLED';
UPDATE clients      SET status = 'CANCELED' WHERE status = 'CANCELLED';
UPDATE supply_orders SET status = 'CANCELED' WHERE status = 'CANCELLED';
UPDATE work_tickets SET status = 'CANCELED' WHERE status = 'CANCELLED';

-- A3. Update status_transitions
UPDATE status_transitions SET from_status = 'CANCELED' WHERE from_status = 'CANCELLED';
UPDATE status_transitions SET to_status   = 'CANCELED' WHERE to_status   = 'CANCELLED';

-- A4. Update supply_orders CHECK constraint
-- Drop old constraint, add new one
ALTER TABLE supply_orders DROP CONSTRAINT IF EXISTS supply_orders_status_check;
ALTER TABLE supply_orders ADD CONSTRAINT supply_orders_status_check
  CHECK (status IN ('DRAFT','ORDERED','SHIPPED','RECEIVED','CANCELED'));

-- =========================================================================
-- B. Add DRAFT + LOST statuses, PAUSED → ON_HOLD
-- =========================================================================

-- B1. client_status: add DRAFT (sort 0), LOST (sort 6)
INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  (NULL, 'client_status', 'DRAFT', 'Draft', 0),
  (NULL, 'client_status', 'LOST', 'Lost', 6)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- B2. site_status: add DRAFT (sort 0), CANCELED (sort 4)
INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  (NULL, 'site_status', 'DRAFT', 'Draft', 0),
  (NULL, 'site_status', 'CANCELED', 'Canceled', 4)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- B3. job_status: rename PAUSED → ON_HOLD, add DRAFT (sort 0)
UPDATE lookups SET code = 'ON_HOLD', label = 'On Hold'
  WHERE category = 'job_status' AND code = 'PAUSED';
UPDATE site_jobs SET status = 'ON_HOLD' WHERE status = 'PAUSED';
UPDATE status_transitions SET from_status = 'ON_HOLD' WHERE from_status = 'PAUSED' AND entity_type = 'job';
UPDATE status_transitions SET to_status   = 'ON_HOLD' WHERE to_status   = 'PAUSED' AND entity_type = 'job';

INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  (NULL, 'job_status', 'DRAFT', 'Draft', 0)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- B4. staff_status: add DRAFT (sort 0)
INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  (NULL, 'staff_status', 'DRAFT', 'Draft', 0)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- B5. Add DRAFT transitions for jobs
INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles)
VALUES
  (NULL, 'job', 'DRAFT', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'client', 'DRAFT', 'PROSPECT', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'client', 'DRAFT', 'ACTIVE', '{OWNER_ADMIN,MANAGER}')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- C. Frequency expansion
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  (NULL, 'frequency', '2X_WEEK', '2x per Week', 15),
  (NULL, 'frequency', '3X_WEEK', '3x per Week', 16),
  (NULL, 'frequency', '5X_WEEK', '5x per Week', 17),
  (NULL, 'frequency', 'AS_NEEDED', 'As Needed', 99)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- Normalize existing site_jobs data
UPDATE site_jobs SET frequency = '2X_WEEK'   WHERE frequency IN ('2x Weekly', '2x_weekly', '2X_WEEKLY');
UPDATE site_jobs SET frequency = '3X_WEEK'   WHERE frequency IN ('3x Weekly', '3x_weekly', '3X_WEEKLY');
UPDATE site_jobs SET frequency = '5X_WEEK'   WHERE frequency IN ('5x Weekly', '5x_weekly', '5X_WEEKLY');
UPDATE site_jobs SET frequency = 'AS_NEEDED' WHERE frequency IN ('One-Time', 'one_time', 'ONE_TIME');
UPDATE site_jobs SET frequency = 'MONTHLY'   WHERE frequency IN ('Bi-Monthly', 'bi_monthly', 'BI_MONTHLY');

-- =========================================================================
-- D. Job code formula function
-- =========================================================================
CREATE OR REPLACE FUNCTION generate_job_code(
  p_tenant_id UUID,
  p_site_code TEXT,
  p_service_code TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_site_suffix TEXT;
  v_svc_prefix  TEXT;
  v_svc_name    TEXT;
BEGIN
  -- Extract last 4 chars of site_code
  IF p_site_code IS NOT NULL AND length(p_site_code) >= 4 THEN
    v_site_suffix := right(p_site_code, 4);
  ELSE
    -- Fallback to sequential
    RETURN next_code(p_tenant_id, 'JOB');
  END IF;

  -- Get first 3 chars of service short name
  IF p_service_code IS NOT NULL THEN
    SELECT left(upper(s.name), 3) INTO v_svc_prefix
    FROM services s
    WHERE s.service_code = p_service_code
      AND (s.tenant_id = p_tenant_id OR s.tenant_id IS NULL)
    LIMIT 1;
  END IF;

  IF v_svc_prefix IS NULL OR v_svc_prefix = '' THEN
    -- Fallback to sequential
    RETURN next_code(p_tenant_id, 'JOB');
  END IF;

  RETURN 'JOB-' || v_site_suffix || '-' || v_svc_prefix;
END;
$$;

COMMIT;
