-- =============================================================================
-- Migration 00124: Sprint 8 — Status Transition Enforcement
-- =============================================================================
-- S8-T1: Populate status_transitions table (28 rows for 6 entity types)
-- S8-T2: Create enforce_status_transition() trigger on 5 tables
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S8-T1: Populate status_transitions (28 valid transitions for 6 entity types)
-- Using test tenant. allowed_roles defaults to all roles.
-- ---------------------------------------------------------------------------

-- Clear existing transitions for this tenant to avoid duplicates
DELETE FROM status_transitions
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles)
VALUES
  -- Clients: PROSPECT → ACTIVE → ON_HOLD → INACTIVE → CANCELED
  ('a0000000-0000-0000-0000-000000000001', 'client', 'PROSPECT', 'ACTIVE', '{OWNER_ADMIN,MANAGER,SALES}'),
  ('a0000000-0000-0000-0000-000000000001', 'client', 'ACTIVE', 'ON_HOLD', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'client', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'client', 'ACTIVE', 'CANCELED', '{OWNER_ADMIN}'),
  ('a0000000-0000-0000-0000-000000000001', 'client', 'ON_HOLD', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'client', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),

  -- Sites: ACTIVE → ON_HOLD → INACTIVE → CANCELED
  ('a0000000-0000-0000-0000-000000000001', 'site', 'ACTIVE', 'ON_HOLD', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'site', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'site', 'ACTIVE', 'CANCELED', '{OWNER_ADMIN}'),
  ('a0000000-0000-0000-0000-000000000001', 'site', 'ON_HOLD', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'site', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),

  -- Site Jobs: DRAFT → ACTIVE → ON_HOLD → COMPLETED → CANCELED
  ('a0000000-0000-0000-0000-000000000001', 'site_job', 'DRAFT', 'ACTIVE', '{OWNER_ADMIN,MANAGER,SALES}'),
  ('a0000000-0000-0000-0000-000000000001', 'site_job', 'ACTIVE', 'ON_HOLD', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'site_job', 'ACTIVE', 'COMPLETED', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'site_job', 'ACTIVE', 'CANCELED', '{OWNER_ADMIN}'),
  ('a0000000-0000-0000-0000-000000000001', 'site_job', 'ON_HOLD', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),

  -- Work Tickets: SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED; CANCELED
  ('a0000000-0000-0000-0000-000000000001', 'work_ticket', 'SCHEDULED', 'IN_PROGRESS', '{OWNER_ADMIN,MANAGER,SUPERVISOR,CLEANER}'),
  ('a0000000-0000-0000-0000-000000000001', 'work_ticket', 'SCHEDULED', 'CANCELED', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'work_ticket', 'IN_PROGRESS', 'COMPLETED', '{OWNER_ADMIN,MANAGER,SUPERVISOR,CLEANER}'),
  ('a0000000-0000-0000-0000-000000000001', 'work_ticket', 'COMPLETED', 'VERIFIED', '{OWNER_ADMIN,MANAGER,INSPECTOR}'),
  ('a0000000-0000-0000-0000-000000000001', 'work_ticket', 'COMPLETED', 'IN_PROGRESS', '{OWNER_ADMIN,MANAGER}'),

  -- Staff: DRAFT → ACTIVE → ON_LEAVE → INACTIVE → TERMINATED
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'DRAFT', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'ACTIVE', 'ON_LEAVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'ACTIVE', 'INACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'ACTIVE', 'TERMINATED', '{OWNER_ADMIN}'),
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'ON_LEAVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'staff', 'INACTIVE', 'ACTIVE', '{OWNER_ADMIN,MANAGER}'),

  -- Schedule Periods: DRAFT → PUBLISHED → LOCKED
  ('a0000000-0000-0000-0000-000000000001', 'schedule_period', 'DRAFT', 'PUBLISHED', '{OWNER_ADMIN,MANAGER}'),
  ('a0000000-0000-0000-0000-000000000001', 'schedule_period', 'PUBLISHED', 'LOCKED', '{OWNER_ADMIN}')
ON CONFLICT (tenant_id, entity_type, from_status, to_status) DO NOTHING;

-- ---------------------------------------------------------------------------
-- S8-T2: Create enforce_status_transition() trigger function
-- Validates status changes against the status_transitions table.
-- If no transition is defined, the update is rejected.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_tenant_id UUID;
  v_old_status TEXT;
  v_new_status TEXT;
  v_transition_exists BOOLEAN;
BEGIN
  -- Determine entity type from table name
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'clients' THEN 'client'
    WHEN 'sites' THEN 'site'
    WHEN 'site_jobs' THEN 'site_job'
    WHEN 'work_tickets' THEN 'work_ticket'
    WHEN 'staff' THEN 'staff'
    WHEN 'schedule_periods' THEN 'schedule_period'
    ELSE TG_TABLE_NAME
  END;

  v_tenant_id := NEW.tenant_id;
  v_old_status := OLD.status;
  v_new_status := NEW.status;

  -- Skip if status hasn't changed
  IF v_old_status IS NULL OR v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  -- Check if transition is allowed
  SELECT EXISTS(
    SELECT 1 FROM status_transitions
    WHERE tenant_id = v_tenant_id
      AND entity_type = v_entity_type
      AND from_status = v_old_status
      AND to_status = v_new_status
  ) INTO v_transition_exists;

  IF NOT v_transition_exists THEN
    RAISE EXCEPTION 'Invalid status transition: % → % for % (tenant %)',
      v_old_status, v_new_status, v_entity_type, v_tenant_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Apply trigger to 5 tables (clients already has a status column)
CREATE TRIGGER trg_enforce_status_clients
  BEFORE UPDATE OF status ON clients
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

CREATE TRIGGER trg_enforce_status_sites
  BEFORE UPDATE OF status ON sites
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

CREATE TRIGGER trg_enforce_status_site_jobs
  BEFORE UPDATE OF status ON site_jobs
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

CREATE TRIGGER trg_enforce_status_work_tickets
  BEFORE UPDATE OF status ON work_tickets
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

CREATE TRIGGER trg_enforce_status_staff
  BEFORE UPDATE OF status ON staff
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

CREATE TRIGGER trg_enforce_status_schedule_periods
  BEFORE UPDATE OF status ON schedule_periods
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

COMMIT;
