-- Epic 3.4: Add planning_status column to work_tickets for evening planning board
-- This is a UI-workflow column. It does NOT affect the ticket's operational status.

ALTER TABLE work_tickets
  ADD COLUMN IF NOT EXISTS planning_status TEXT NOT NULL DEFAULT 'NOT_STARTED'
  CHECK (planning_status IN ('NOT_STARTED', 'IN_PROGRESS', 'READY'));

COMMENT ON COLUMN work_tickets.planning_status IS
  'Evening planning board status: NOT_STARTED | IN_PROGRESS | READY. Independent of operational status.';

-- Index for board queries (filter by date + planning_status)
CREATE INDEX IF NOT EXISTS idx_tickets_planning
  ON work_tickets(scheduled_date, planning_status)
  WHERE archived_at IS NULL;
