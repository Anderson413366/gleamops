BEGIN;

CREATE OR REPLACE FUNCTION public.fn_is_ticket_locked(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_tickets wt
    LEFT JOIN public.schedule_periods sp
      ON sp.id = wt.schedule_period_id
      AND sp.tenant_id = wt.tenant_id
      AND sp.archived_at IS NULL
    WHERE wt.id = p_ticket_id
      AND wt.tenant_id = current_tenant_id()
      AND wt.archived_at IS NULL
      AND (
        wt.locked_at IS NOT NULL
        OR COALESCE(sp.status, '') = 'LOCKED'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_work_ticket_locked_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_locked BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_is_locked := (
    OLD.locked_at IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.schedule_periods sp
      WHERE sp.id = OLD.schedule_period_id
        AND sp.tenant_id = OLD.tenant_id
        AND sp.archived_at IS NULL
        AND sp.status = 'LOCKED'
    )
  );

  IF v_is_locked THEN
    IF (
      NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
      OR NEW.start_time IS DISTINCT FROM OLD.start_time
      OR NEW.end_time IS DISTINCT FROM OLD.end_time
      OR NEW.site_id IS DISTINCT FROM OLD.site_id
      OR NEW.job_id IS DISTINCT FROM OLD.job_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.required_staff_count IS DISTINCT FROM OLD.required_staff_count
      OR NEW.position_code IS DISTINCT FROM OLD.position_code
      OR NEW.schedule_period_id IS DISTINCT FROM OLD.schedule_period_id
    ) THEN
      RAISE EXCEPTION 'Cannot modify locked ticket %', OLD.ticket_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_ticket_assignment_locked_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  v_ticket_id := COALESCE(NEW.ticket_id, OLD.ticket_id);

  IF public.fn_is_ticket_locked(v_ticket_id) THEN
    RAISE EXCEPTION 'Cannot modify assignments for locked ticket';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_work_tickets_lock_guard ON public.work_tickets;
CREATE TRIGGER trg_work_tickets_lock_guard
  BEFORE UPDATE ON public.work_tickets
  FOR EACH ROW EXECUTE FUNCTION public.guard_work_ticket_locked_mutation();

DROP TRIGGER IF EXISTS trg_ticket_assignments_lock_guard_ins ON public.ticket_assignments;
CREATE TRIGGER trg_ticket_assignments_lock_guard_ins
  BEFORE INSERT ON public.ticket_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_ticket_assignment_locked_mutation();

DROP TRIGGER IF EXISTS trg_ticket_assignments_lock_guard_upd ON public.ticket_assignments;
CREATE TRIGGER trg_ticket_assignments_lock_guard_upd
  BEFORE UPDATE ON public.ticket_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_ticket_assignment_locked_mutation();

DROP TRIGGER IF EXISTS trg_ticket_assignments_lock_guard_del ON public.ticket_assignments;
CREATE TRIGGER trg_ticket_assignments_lock_guard_del
  BEFORE DELETE ON public.ticket_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_ticket_assignment_locked_mutation();

GRANT EXECUTE ON FUNCTION public.fn_is_ticket_locked(UUID) TO authenticated;

COMMIT;
