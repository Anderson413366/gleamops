BEGIN;

CREATE TABLE IF NOT EXISTS public.complaint_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  complaint_code TEXT NOT NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  client_id UUID REFERENCES public.clients(id),
  reported_by_type TEXT NOT NULL,
  reported_by_staff_id UUID REFERENCES public.staff(id),
  reported_by_name TEXT,
  source TEXT NOT NULL,
  customer_original_message TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  status TEXT NOT NULL DEFAULT 'OPEN',
  assigned_to_staff_id UUID REFERENCES public.staff(id),
  linked_route_task_id UUID REFERENCES public.route_stop_tasks(id),
  photos_before JSONB,
  photos_after JSONB,
  resolution_description TEXT,
  resolution_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_email_sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_complaint_records_code UNIQUE (tenant_id, complaint_code),
  CONSTRAINT chk_complaint_reported_by_type CHECK (
    reported_by_type IN ('CUSTOMER', 'SPECIALIST', 'FLOATER', 'MANAGER', 'SYSTEM')
  ),
  CONSTRAINT chk_complaint_source CHECK (
    source IN ('EMAIL', 'PHONE', 'APP', 'PORTAL', 'IN_PERSON')
  ),
  CONSTRAINT chk_complaint_category CHECK (
    category IN ('CLEANING_QUALITY', 'MISSED_SERVICE', 'SUPPLY_ISSUE', 'DAMAGE', 'BEHAVIOR', 'SAFETY', 'OTHER')
  ),
  CONSTRAINT chk_complaint_priority CHECK (
    priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT_SAME_NIGHT')
  ),
  CONSTRAINT chk_complaint_status CHECK (
    status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED')
  )
);

CREATE INDEX IF NOT EXISTS idx_complaints_tenant
  ON public.complaint_records (tenant_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_site
  ON public.complaint_records (site_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_status
  ON public.complaint_records (tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_priority
  ON public.complaint_records (tenant_id, priority)
  WHERE archived_at IS NULL AND status != 'CLOSED';

CREATE INDEX IF NOT EXISTS idx_route_stop_tasks_source_complaint
  ON public.route_stop_tasks (source_complaint_id)
  WHERE archived_at IS NULL AND source_complaint_id IS NOT NULL;

ALTER TABLE public.route_stop_tasks
  DROP CONSTRAINT IF EXISTS fk_route_stop_tasks_source_complaint;

ALTER TABLE public.route_stop_tasks
  ADD CONSTRAINT fk_route_stop_tasks_source_complaint
  FOREIGN KEY (source_complaint_id) REFERENCES public.complaint_records(id);

ALTER TABLE public.complaint_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS complaint_records_select ON public.complaint_records;
CREATE POLICY complaint_records_select
  ON public.complaint_records
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'])
  );

DROP POLICY IF EXISTS complaint_records_insert ON public.complaint_records;
CREATE POLICY complaint_records_insert
  ON public.complaint_records
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
  );

DROP POLICY IF EXISTS complaint_records_update ON public.complaint_records;
CREATE POLICY complaint_records_update
  ON public.complaint_records
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'])
  );

DROP TRIGGER IF EXISTS trg_complaint_records_updated_at ON public.complaint_records;
CREATE TRIGGER trg_complaint_records_updated_at
  BEFORE UPDATE ON public.complaint_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_complaint_records_etag ON public.complaint_records;
CREATE TRIGGER trg_complaint_records_etag
  BEFORE UPDATE ON public.complaint_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.complaint_records;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.complaint_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

NOTIFY pgrst, 'reload schema';

COMMIT;
