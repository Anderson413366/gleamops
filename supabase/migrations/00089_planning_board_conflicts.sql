BEGIN;

CREATE TABLE IF NOT EXISTS public.planning_board_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  board_id UUID NOT NULL REFERENCES public.planning_boards(id),
  card_id UUID NOT NULL REFERENCES public.planning_board_items(id),
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  affected_staff_id UUID REFERENCES public.staff(id),
  affected_ticket_id UUID REFERENCES public.work_tickets(id),
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_planning_board_conflicts_type CHECK (conflict_type IN (
    'double_booking','in_progress_change','availability_violation',
    'locked_period','external_drift','missing_required_skill',
    'rest_window_violation','max_weekly_hours_violation'
  )),
  CONSTRAINT chk_planning_board_conflicts_severity CHECK (severity IN ('blocking','warning')),
  CONSTRAINT chk_planning_board_conflicts_resolution CHECK (resolution IN (
    'applied_anyway','reverted','dismissed','auto_resolved','applied',
    'rejected','override_applied'
  ))
);

CREATE INDEX IF NOT EXISTS idx_planning_board_conflicts_tenant_board_severity
  ON public.planning_board_conflicts(tenant_id, board_id, severity, resolved_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planning_board_conflicts_card_open
  ON public.planning_board_conflicts(card_id, created_at DESC)
  WHERE archived_at IS NULL AND resolved_at IS NULL;

DROP TRIGGER IF EXISTS trg_planning_board_conflicts_updated_at ON public.planning_board_conflicts;
CREATE TRIGGER trg_planning_board_conflicts_updated_at
  BEFORE UPDATE ON public.planning_board_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_planning_board_conflicts_etag ON public.planning_board_conflicts;
CREATE TRIGGER trg_planning_board_conflicts_etag
  BEFORE UPDATE ON public.planning_board_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

ALTER TABLE public.planning_board_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planning_board_conflicts_select ON public.planning_board_conflicts;
CREATE POLICY planning_board_conflicts_select ON public.planning_board_conflicts
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_board_conflicts_insert ON public.planning_board_conflicts;
CREATE POLICY planning_board_conflicts_insert ON public.planning_board_conflicts
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_board_conflicts_update ON public.planning_board_conflicts;
CREATE POLICY planning_board_conflicts_update ON public.planning_board_conflicts
  FOR UPDATE USING (tenant_id = current_tenant_id());

COMMIT;
