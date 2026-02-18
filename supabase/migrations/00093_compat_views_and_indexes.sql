BEGIN;

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS pay_code TEXT,
  ADD COLUMN IF NOT EXISTS cost_center_code TEXT,
  ADD COLUMN IF NOT EXISTS job_code TEXT;

CREATE INDEX IF NOT EXISTS idx_time_entries_pay_code
  ON public.time_entries(tenant_id, pay_code)
  WHERE archived_at IS NULL AND pay_code IS NOT NULL;

CREATE OR REPLACE VIEW public.v_planning_board_ticket_lens AS
SELECT
  bi.tenant_id,
  bi.id AS board_item_id,
  bi.board_id,
  bi.item_kind,
  bi.ticket_id,
  wt.ticket_code,
  wt.scheduled_date,
  wt.start_time,
  wt.end_time,
  bi.sync_state,
  bi.current_assignee_staff_id,
  bi.current_assignee_subcontractor_id,
  bi.sort_order,
  bi.version_etag
FROM public.planning_board_items bi
LEFT JOIN public.work_tickets wt ON wt.id = bi.ticket_id
WHERE bi.archived_at IS NULL;

GRANT SELECT ON public.v_planning_board_ticket_lens TO authenticated;

CREATE INDEX IF NOT EXISTS idx_planning_board_items_sync_state
  ON public.planning_board_items(tenant_id, board_id, sync_state)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planning_item_proposals_state
  ON public.planning_item_proposals(tenant_id, apply_state)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_exports_period
  ON public.payroll_exports(tenant_id, pay_period_start, pay_period_end)
  WHERE archived_at IS NULL;

COMMIT;
