BEGIN;

CREATE TABLE IF NOT EXISTS public.sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID REFERENCES public.staff(id),
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB,
  result TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT chk_sync_events_result CHECK (result IN ('accepted','duplicate','conflict','error','failed_dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_sync_events_tenant_processed
  ON public.sync_events(tenant_id, processed_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sync_events_staff
  ON public.sync_events(tenant_id, staff_id, processed_at DESC)
  WHERE archived_at IS NULL AND staff_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_events_updated_at ON public.sync_events;
CREATE TRIGGER trg_sync_events_updated_at
  BEFORE UPDATE ON public.sync_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sync_events_etag ON public.sync_events;
CREATE TRIGGER trg_sync_events_etag
  BEFORE UPDATE ON public.sync_events
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_events_select ON public.sync_events;
CREATE POLICY sync_events_select ON public.sync_events
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS sync_events_insert ON public.sync_events;
CREATE POLICY sync_events_insert ON public.sync_events
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS sync_events_update ON public.sync_events;
CREATE POLICY sync_events_update ON public.sync_events
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

COMMIT;
