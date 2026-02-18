BEGIN;

CREATE OR REPLACE FUNCTION public.fn_notify_schedule_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND COALESCE(OLD.status, '') <> 'PUBLISHED' THEN
    PERFORM public.write_audit_event(
      NEW.tenant_id,
      'schedule_periods',
      NEW.id,
      NULL,
      'SCHEDULE_PUBLISHED',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'period_start', NEW.period_start,
        'period_end', NEW.period_end
      ),
      auth.uid()
    );

    INSERT INTO public.notifications (tenant_id, user_id, title, body, link)
    SELECT DISTINCT
      NEW.tenant_id,
      s.user_id,
      'Schedule Published',
      format(
        'Your schedule was published for %s to %s.',
        to_char(NEW.period_start, 'Mon DD, YYYY'),
        to_char(NEW.period_end, 'Mon DD, YYYY')
      ),
      format('/operations?tab=planning&period=%s', NEW.id)
    FROM public.work_tickets wt
    JOIN public.ticket_assignments ta
      ON ta.ticket_id = wt.id
      AND ta.tenant_id = NEW.tenant_id
      AND ta.archived_at IS NULL
      AND COALESCE(ta.assignment_status, 'ASSIGNED') = 'ASSIGNED'
    JOIN public.staff s
      ON s.id = ta.staff_id
      AND s.tenant_id = NEW.tenant_id
      AND s.user_id IS NOT NULL
      AND s.archived_at IS NULL
    WHERE wt.tenant_id = NEW.tenant_id
      AND wt.archived_at IS NULL
      AND wt.scheduled_date BETWEEN NEW.period_start AND NEW.period_end
      AND (NEW.site_id IS NULL OR wt.site_id = NEW.site_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_periods_notify_publish ON public.schedule_periods;
CREATE TRIGGER trg_schedule_periods_notify_publish
  AFTER UPDATE ON public.schedule_periods
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_schedule_publish();

CREATE OR REPLACE FUNCTION public.fn_notify_trade_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_initiator_user UUID;
  v_target_user UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.write_audit_event(
      NEW.tenant_id,
      'shift_trade_requests',
      NEW.id,
      NULL,
      'SHIFT_TRADE_STATUS_CHANGED',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );

    SELECT s.user_id INTO v_initiator_user
    FROM public.staff s
    WHERE s.id = NEW.initiator_staff_id
      AND s.tenant_id = NEW.tenant_id
      AND s.archived_at IS NULL
    LIMIT 1;

    SELECT s.user_id INTO v_target_user
    FROM public.staff s
    WHERE s.id = NEW.target_staff_id
      AND s.tenant_id = NEW.tenant_id
      AND s.archived_at IS NULL
    LIMIT 1;

    IF v_initiator_user IS NOT NULL THEN
      INSERT INTO public.notifications (tenant_id, user_id, title, body, link)
      VALUES (
        NEW.tenant_id,
        v_initiator_user,
        'Shift Trade Updated',
        format('Your shift trade request is now %s.', NEW.status),
        format('/operations?tab=planning&trade=%s', NEW.id)
      );
    END IF;

    IF v_target_user IS NOT NULL AND v_target_user <> v_initiator_user THEN
      INSERT INTO public.notifications (tenant_id, user_id, title, body, link)
      VALUES (
        NEW.tenant_id,
        v_target_user,
        'Shift Trade Updated',
        format('A shift trade request involving you is now %s.', NEW.status),
        format('/operations?tab=planning&trade=%s', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shift_trade_requests_notify ON public.shift_trade_requests;
CREATE TRIGGER trg_shift_trade_requests_notify
  AFTER UPDATE ON public.shift_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_trade_transition();

COMMIT;
