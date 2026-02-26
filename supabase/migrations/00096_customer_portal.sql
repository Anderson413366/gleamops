BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  session_code TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_customer_portal_sessions_code UNIQUE (tenant_id, session_code),
  CONSTRAINT chk_customer_portal_sessions_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_tenant_client
  ON public.customer_portal_sessions (tenant_id, client_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_active
  ON public.customer_portal_sessions (tenant_id, is_active, expires_at)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  feedback_code TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  site_id UUID REFERENCES public.sites(id),
  feedback_type TEXT NOT NULL,
  submitted_via TEXT NOT NULL DEFAULT 'PORTAL',
  category TEXT,
  contact_name TEXT,
  contact_email TEXT,
  message TEXT NOT NULL,
  photos JSONB,
  linked_complaint_id UUID REFERENCES public.complaint_records(id),
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT uq_customer_feedback_code UNIQUE (tenant_id, feedback_code),
  CONSTRAINT chk_customer_feedback_type CHECK (
    feedback_type IN ('COMPLAINT', 'KUDOS', 'SUGGESTION', 'QUESTION')
  ),
  CONSTRAINT chk_customer_feedback_via CHECK (
    submitted_via IN ('PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON')
  ),
  CONSTRAINT chk_customer_feedback_status CHECK (
    status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
  ),
  CONSTRAINT chk_customer_feedback_category CHECK (
    category IS NULL
    OR category IN (
      'CLEANING_QUALITY',
      'MISSED_SERVICE',
      'SUPPLY_ISSUE',
      'DAMAGE',
      'BEHAVIOR',
      'SAFETY',
      'OTHER'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant_client
  ON public.customer_feedback (tenant_id, client_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_feedback_status
  ON public.customer_feedback (tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_feedback_type
  ON public.customer_feedback (tenant_id, feedback_type)
  WHERE archived_at IS NULL;

ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_portal_sessions_select ON public.customer_portal_sessions;
CREATE POLICY customer_portal_sessions_select
  ON public.customer_portal_sessions
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

DROP POLICY IF EXISTS customer_portal_sessions_insert ON public.customer_portal_sessions;
CREATE POLICY customer_portal_sessions_insert
  ON public.customer_portal_sessions
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

DROP POLICY IF EXISTS customer_portal_sessions_update ON public.customer_portal_sessions;
CREATE POLICY customer_portal_sessions_update
  ON public.customer_portal_sessions
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_feedback_select ON public.customer_feedback;
CREATE POLICY customer_feedback_select
  ON public.customer_feedback
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

DROP POLICY IF EXISTS customer_feedback_insert ON public.customer_feedback;
CREATE POLICY customer_feedback_insert
  ON public.customer_feedback
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

DROP POLICY IF EXISTS customer_feedback_update ON public.customer_feedback;
CREATE POLICY customer_feedback_update
  ON public.customer_feedback
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'])
  );

DROP TRIGGER IF EXISTS trg_customer_portal_sessions_updated_at ON public.customer_portal_sessions;
CREATE TRIGGER trg_customer_portal_sessions_updated_at
  BEFORE UPDATE ON public.customer_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_portal_sessions_etag ON public.customer_portal_sessions;
CREATE TRIGGER trg_customer_portal_sessions_etag
  BEFORE UPDATE ON public.customer_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_customer_portal_sessions_no_hard_delete ON public.customer_portal_sessions;
CREATE TRIGGER trg_customer_portal_sessions_no_hard_delete
  BEFORE DELETE ON public.customer_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_customer_feedback_updated_at ON public.customer_feedback;
CREATE TRIGGER trg_customer_feedback_updated_at
  BEFORE UPDATE ON public.customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_feedback_etag ON public.customer_feedback;
CREATE TRIGGER trg_customer_feedback_etag
  BEFORE UPDATE ON public.customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_customer_feedback_no_hard_delete ON public.customer_feedback;
CREATE TRIGGER trg_customer_feedback_no_hard_delete
  BEFORE DELETE ON public.customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hard_delete();

CREATE OR REPLACE FUNCTION public.create_inspection_followup_ticket(
  p_issue_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issue public.inspection_issues%ROWTYPE;
  v_inspection public.inspections%ROWTYPE;
  v_parent_ticket public.work_tickets%ROWTYPE;
  v_site_job_id UUID;
  v_site_id UUID;
  v_target_date DATE;
  v_ticket_id UUID;
  v_ticket_code TEXT;
  v_priority TEXT;
  v_ticket_title TEXT;
  v_line_item TEXT;
  v_existing_description TEXT;
  v_offset INTEGER := 0;
BEGIN
  IF p_issue_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_issue
  FROM public.inspection_issues
  WHERE id = p_issue_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_issue.followup_ticket_id IS NOT NULL THEN
    RETURN v_issue.followup_ticket_id;
  END IF;

  IF v_issue.resolved_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  IF v_issue.severity NOT IN ('MAJOR', 'CRITICAL') THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_inspection
  FROM public.inspections
  WHERE id = v_issue.inspection_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_inspection.status NOT IN ('COMPLETED', 'SUBMITTED') THEN
    RETURN NULL;
  END IF;

  IF v_inspection.ticket_id IS NOT NULL THEN
    SELECT *
    INTO v_parent_ticket
    FROM public.work_tickets
    WHERE id = v_inspection.ticket_id
      AND archived_at IS NULL
    LIMIT 1;
  END IF;

  v_site_job_id := v_parent_ticket.job_id;
  v_site_id := COALESCE(v_parent_ticket.site_id, v_inspection.site_id);

  IF v_site_job_id IS NULL AND v_inspection.site_id IS NOT NULL THEN
    SELECT sj.id, sj.site_id
    INTO v_site_job_id, v_site_id
    FROM public.site_jobs sj
    WHERE sj.tenant_id = v_inspection.tenant_id
      AND sj.site_id = v_inspection.site_id
      AND sj.archived_at IS NULL
      AND sj.status = 'ACTIVE'
    ORDER BY sj.updated_at DESC, sj.created_at DESC
    LIMIT 1;
  END IF;

  IF v_site_job_id IS NULL OR v_site_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_line_item := format(
    '- [%s] %s',
    v_issue.severity,
    COALESCE(NULLIF(BTRIM(v_issue.description), ''), 'Inspection deficiency follow-up required.')
  );

  SELECT wt.id, wt.description
  INTO v_ticket_id, v_existing_description
  FROM public.work_tickets wt
  WHERE wt.tenant_id = v_inspection.tenant_id
    AND wt.job_id = v_site_job_id
    AND wt.site_id = v_site_id
    AND wt.archived_at IS NULL
    AND wt.type = 'INSPECTION_FOLLOWUP'
    AND wt.status IN ('SCHEDULED', 'IN_PROGRESS')
  ORDER BY wt.scheduled_date ASC, wt.created_at ASC
  LIMIT 1;

  IF v_ticket_id IS NOT NULL THEN
    IF v_existing_description IS NULL OR POSITION(v_line_item IN v_existing_description) = 0 THEN
      UPDATE public.work_tickets
      SET
        description = CASE
          WHEN COALESCE(BTRIM(v_existing_description), '') = '' THEN v_line_item
          ELSE v_existing_description || E'\n' || v_line_item
        END
      WHERE id = v_ticket_id;
    END IF;

    UPDATE public.inspection_issues
    SET followup_ticket_id = v_ticket_id
    WHERE id = v_issue.id
      AND followup_ticket_id IS NULL;

    RETURN v_ticket_id;
  END IF;

  v_target_date := COALESCE(v_inspection.completed_at::DATE, v_inspection.inspection_date, CURRENT_DATE) + 1;

  WHILE EXISTS (
    SELECT 1
    FROM public.work_tickets wt
    WHERE wt.job_id = v_site_job_id
      AND wt.scheduled_date = v_target_date
      AND wt.archived_at IS NULL
  ) LOOP
    v_target_date := v_target_date + 1;
    v_offset := v_offset + 1;
    EXIT WHEN v_offset > 30;
  END LOOP;

  v_ticket_code := public.next_code(v_inspection.tenant_id, 'TKT', 4);
  v_priority := CASE v_issue.severity
    WHEN 'CRITICAL' THEN 'HIGH'
    ELSE 'MEDIUM'
  END;
  v_ticket_title := 'Inspection Follow-up';

  INSERT INTO public.work_tickets (
    tenant_id,
    ticket_code,
    job_id,
    site_id,
    scheduled_date,
    status,
    type,
    title,
    description,
    priority,
    notes
  )
  VALUES (
    v_inspection.tenant_id,
    v_ticket_code,
    v_site_job_id,
    v_site_id,
    v_target_date,
    'SCHEDULED',
    'INSPECTION_FOLLOWUP',
    v_ticket_title,
    format(
      'Auto-created from inspection %s.%s%s',
      COALESCE(v_inspection.inspection_code, 'UNKNOWN'),
      E'\n',
      v_line_item
    ),
    v_priority,
    'Generated from MAJOR/CRITICAL inspection deficiency.'
  )
  RETURNING id INTO v_ticket_id;

  UPDATE public.inspection_issues
  SET followup_ticket_id = v_ticket_id
  WHERE id = v_issue.id
    AND followup_ticket_id IS NULL;

  RETURN v_ticket_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT wt.id
    INTO v_ticket_id
    FROM public.work_tickets wt
    WHERE wt.tenant_id = v_inspection.tenant_id
      AND wt.job_id = v_site_job_id
      AND wt.scheduled_date = v_target_date
      AND wt.archived_at IS NULL
    ORDER BY wt.created_at DESC
    LIMIT 1;

    IF v_ticket_id IS NOT NULL THEN
      UPDATE public.inspection_issues
      SET followup_ticket_id = v_ticket_id
      WHERE id = v_issue.id
        AND followup_ticket_id IS NULL;
    END IF;

    RETURN v_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_create_followup_for_inspection_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.create_inspection_followup_ticket(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inspection_issue_followup_ticket ON public.inspection_issues;
CREATE TRIGGER trg_inspection_issue_followup_ticket
  AFTER INSERT OR UPDATE OF severity, resolved_at, followup_ticket_id
  ON public.inspection_issues
  FOR EACH ROW
  WHEN (
    NEW.archived_at IS NULL
    AND NEW.resolved_at IS NULL
    AND NEW.followup_ticket_id IS NULL
    AND NEW.severity IN ('MAJOR', 'CRITICAL')
  )
  EXECUTE FUNCTION public.trg_create_followup_for_inspection_issue();

CREATE OR REPLACE FUNCTION public.trg_create_followups_on_inspection_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_issue RECORD;
BEGIN
  IF NEW.status IN ('COMPLETED', 'SUBMITTED')
     AND COALESCE(OLD.status, '') NOT IN ('COMPLETED', 'SUBMITTED') THEN
    FOR v_issue IN
      SELECT ii.id
      FROM public.inspection_issues ii
      WHERE ii.inspection_id = NEW.id
        AND ii.archived_at IS NULL
        AND ii.resolved_at IS NULL
        AND ii.followup_ticket_id IS NULL
        AND ii.severity IN ('MAJOR', 'CRITICAL')
    LOOP
      PERFORM public.create_inspection_followup_ticket(v_issue.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inspections_create_followups ON public.inspections;
CREATE TRIGGER trg_inspections_create_followups
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW
  WHEN (NEW.status IN ('COMPLETED', 'SUBMITTED'))
  EXECUTE FUNCTION public.trg_create_followups_on_inspection_completion();

NOTIFY pgrst, 'reload schema';

COMMIT;
