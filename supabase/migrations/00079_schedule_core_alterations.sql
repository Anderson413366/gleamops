BEGIN;

ALTER TABLE public.work_tickets
  ADD COLUMN IF NOT EXISTS required_staff_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS position_code TEXT,
  ADD COLUMN IF NOT EXISTS schedule_period_id UUID REFERENCES public.schedule_periods(id),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID;

ALTER TABLE public.ticket_assignments
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'ASSIGNED',
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS overtime_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_by UUID;

ALTER TABLE public.ticket_assignments
  DROP CONSTRAINT IF EXISTS chk_ticket_assignments_assignment_status;
ALTER TABLE public.ticket_assignments
  ADD CONSTRAINT chk_ticket_assignments_assignment_status
  CHECK (assignment_status IN ('ASSIGNED','RELEASED','CANCELED'));

ALTER TABLE public.ticket_assignments
  DROP CONSTRAINT IF EXISTS chk_ticket_assignments_assignment_type;
ALTER TABLE public.ticket_assignments
  ADD CONSTRAINT chk_ticket_assignments_assignment_type
  CHECK (assignment_type IN ('DIRECT','SWAP','RELEASE','OPEN_PICKUP'));

CREATE INDEX IF NOT EXISTS idx_work_tickets_period
  ON public.work_tickets(tenant_id, schedule_period_id, scheduled_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_tickets_staffing
  ON public.work_tickets(tenant_id, site_id, scheduled_date, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_status
  ON public.ticket_assignments(tenant_id, staff_id, assignment_status)
  WHERE archived_at IS NULL;

COMMIT;
