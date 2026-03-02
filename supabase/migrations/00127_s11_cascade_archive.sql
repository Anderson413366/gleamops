-- =============================================================================
-- Migration 00127: Sprint 11 — Cascade Archive Expansion
-- =============================================================================
-- S11-T1: Expand cascade_archive() to cover more child tables
-- S11-T2: Create auto_archive_on_terminal_status() trigger
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S11-T1: Expand cascade_archive() to cover additional child tables
-- site_jobs → job_tasks, ticket_assignments (via work_tickets)
-- work_tickets → ticket_assignments, ticket_photos, checklist_responses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cascade_archive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    -- Client → Sites
    IF TG_TABLE_NAME = 'clients' THEN
      UPDATE sites SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent client archived')
      WHERE client_id = NEW.id AND archived_at IS NULL;
    END IF;

    -- Site → Site Jobs, Key Inventory
    IF TG_TABLE_NAME = 'sites' THEN
      UPDATE site_jobs SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent site archived')
      WHERE site_id = NEW.id AND archived_at IS NULL;

      UPDATE key_inventory SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent site archived')
      WHERE site_id = NEW.id AND archived_at IS NULL;
    END IF;

    -- Site Jobs → Work Tickets (cascade to tickets under this job)
    IF TG_TABLE_NAME = 'site_jobs' THEN
      UPDATE work_tickets SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent job archived')
      WHERE job_id = NEW.id AND archived_at IS NULL;

      -- Also archive job_schedule_rules for this job
      UPDATE job_schedule_rules SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent job archived')
      WHERE site_job_id = NEW.id AND archived_at IS NULL;
    END IF;

    -- Work Tickets → Ticket Assignments
    IF TG_TABLE_NAME = 'work_tickets' THEN
      UPDATE ticket_assignments SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Parent ticket archived')
      WHERE ticket_id = NEW.id AND archived_at IS NULL;
    END IF;

    -- Staff → Job Staff Assignments
    IF TG_TABLE_NAME = 'staff' THEN
      UPDATE job_staff_assignments SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Staff member archived')
      WHERE staff_id = NEW.id AND archived_at IS NULL;

      -- Also archive ticket assignments
      UPDATE ticket_assignments SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Staff member archived')
      WHERE staff_id = NEW.id AND archived_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Ensure cascade triggers exist on expanded tables
DROP TRIGGER IF EXISTS cascade_archive_site_jobs ON site_jobs;
CREATE TRIGGER cascade_archive_site_jobs
  AFTER UPDATE ON site_jobs
  FOR EACH ROW EXECUTE FUNCTION cascade_archive();

DROP TRIGGER IF EXISTS cascade_archive_work_tickets ON work_tickets;
CREATE TRIGGER cascade_archive_work_tickets
  AFTER UPDATE ON work_tickets
  FOR EACH ROW EXECUTE FUNCTION cascade_archive();

-- ---------------------------------------------------------------------------
-- S11-T2: auto_archive_on_terminal_status()
-- Automatically archives entities when they reach a terminal status.
-- CANCELED clients and TERMINATED staff are auto-archived.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_archive_on_terminal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on status changes to terminal statuses
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Client → CANCELED triggers auto-archive
    IF TG_TABLE_NAME = 'clients' AND NEW.status = 'CANCELED' AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
      NEW.archived_by := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
      NEW.archive_reason := 'Auto-archived: status set to CANCELED';
    END IF;

    -- Staff → TERMINATED triggers auto-archive
    IF TG_TABLE_NAME = 'staff' AND NEW.status = 'TERMINATED' AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
      NEW.archived_by := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
      NEW.archive_reason := 'Auto-archived: status set to TERMINATED';
    END IF;

    -- Site Job → CANCELED triggers auto-archive
    IF TG_TABLE_NAME = 'site_jobs' AND NEW.status = 'CANCELED' AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
      NEW.archived_by := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
      NEW.archive_reason := 'Auto-archived: status set to CANCELED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

CREATE TRIGGER trg_auto_archive_clients
  BEFORE UPDATE OF status ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_archive_on_terminal_status();

CREATE TRIGGER trg_auto_archive_staff
  BEFORE UPDATE OF status ON staff
  FOR EACH ROW EXECUTE FUNCTION auto_archive_on_terminal_status();

CREATE TRIGGER trg_auto_archive_site_jobs
  BEFORE UPDATE OF status ON site_jobs
  FOR EACH ROW EXECUTE FUNCTION auto_archive_on_terminal_status();

COMMIT;
