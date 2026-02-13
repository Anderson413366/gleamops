-- ============================================================================
-- Migration 00035: Archive Cascade
-- Automatically cascades archive status to related entities.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. cascade_archive() trigger function
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

    -- Staff → Job Staff Assignments
    IF TG_TABLE_NAME = 'staff' THEN
      UPDATE job_staff_assignments SET
        archived_at = NEW.archived_at,
        archived_by = NEW.archived_by,
        archive_reason = COALESCE(NEW.archive_reason, 'Staff member archived')
      WHERE staff_id = NEW.id AND archived_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- B. Attach triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS cascade_archive_clients ON clients;
CREATE TRIGGER cascade_archive_clients
  AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION cascade_archive();

DROP TRIGGER IF EXISTS cascade_archive_sites ON sites;
CREATE TRIGGER cascade_archive_sites
  AFTER UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION cascade_archive();

DROP TRIGGER IF EXISTS cascade_archive_staff ON staff;
CREATE TRIGGER cascade_archive_staff
  AFTER UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION cascade_archive();
