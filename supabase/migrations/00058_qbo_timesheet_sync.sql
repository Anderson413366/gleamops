-- =================================================================
-- QBO Timesheet Sync: columns + poll RPC
-- =================================================================

-- Add sync tracking columns to existing timesheets table
ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS qbo_sync_status TEXT CHECK (qbo_sync_status IN ('PENDING','SYNCING','SYNCED','FAILED','SKIPPED')),
  ADD COLUMN IF NOT EXISTS qbo_sync_id TEXT,          -- QBO TimeActivity ID
  ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qbo_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS qbo_sync_attempts INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_timesheets_qbo_pending
  ON timesheets(tenant_id, qbo_sync_status)
  WHERE qbo_sync_status IN ('PENDING','FAILED');

-- Poll RPC: atomically grab approved timesheets pending QBO sync
-- Returns rows and transitions them to SYNCING
CREATE OR REPLACE FUNCTION poll_qbo_pending_timesheets(p_batch_size INT DEFAULT 5)
RETURNS SETOF timesheets
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH batch AS (
    SELECT t.id
    FROM timesheets t
    WHERE t.status = 'APPROVED'
      AND (t.qbo_sync_status = 'PENDING' OR (t.qbo_sync_status = 'FAILED' AND t.qbo_sync_attempts < 5))
      AND t.archived_at IS NULL
    ORDER BY t.week_start ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE timesheets
  SET qbo_sync_status = 'SYNCING',
      qbo_sync_attempts = qbo_sync_attempts + 1,
      updated_at = now()
  FROM batch
  WHERE timesheets.id = batch.id
  RETURNING timesheets.*;
END;
$$;

-- Trigger: auto-set qbo_sync_status to PENDING when timesheet is approved
CREATE OR REPLACE FUNCTION fn_timesheet_approved_qbo_pending()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS DISTINCT FROM 'APPROVED') THEN
    NEW.qbo_sync_status := 'PENDING';
    NEW.qbo_sync_error := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_timesheet_approved_qbo
  BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION fn_timesheet_approved_qbo_pending();
