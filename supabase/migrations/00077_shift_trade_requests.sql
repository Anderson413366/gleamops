BEGIN;

CREATE TABLE IF NOT EXISTS public.shift_trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  ticket_id UUID NOT NULL REFERENCES public.work_tickets(id),
  period_id UUID REFERENCES public.schedule_periods(id),
  initiator_staff_id UUID NOT NULL REFERENCES public.staff(id),
  target_staff_id UUID REFERENCES public.staff(id),
  request_type TEXT NOT NULL DEFAULT 'SWAP',
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  manager_user_id UUID,
  initiator_note TEXT,
  manager_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_shift_trade_requests_type CHECK (request_type IN ('SWAP','RELEASE')),
  CONSTRAINT chk_shift_trade_requests_status CHECK (status IN ('PENDING','ACCEPTED','MANAGER_APPROVED','APPLIED','DENIED','CANCELED'))
);

CREATE INDEX IF NOT EXISTS idx_shift_trade_requests_tenant_status
  ON public.shift_trade_requests(tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shift_trade_requests_ticket
  ON public.shift_trade_requests(ticket_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shift_trade_requests_initiator
  ON public.shift_trade_requests(tenant_id, initiator_staff_id)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_shift_trade_requests_updated_at ON public.shift_trade_requests;
CREATE TRIGGER trg_shift_trade_requests_updated_at
  BEFORE UPDATE ON public.shift_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_shift_trade_requests_etag ON public.shift_trade_requests;
CREATE TRIGGER trg_shift_trade_requests_etag
  BEFORE UPDATE ON public.shift_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.shift_trade_requests;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.shift_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMIT;
