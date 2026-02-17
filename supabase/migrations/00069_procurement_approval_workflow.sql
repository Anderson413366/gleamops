BEGIN;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE public.supply_requests
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS chk_purchase_orders_status;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT chk_purchase_orders_status
  CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','PARTIALLY_RECEIVED','RECEIVED','REJECTED','CANCELLED'));

CREATE TABLE IF NOT EXISTS public.procurement_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 1,
  created_by_user_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, entity_type, entity_id),
  CONSTRAINT chk_procurement_approval_workflows_entity_type
    CHECK (entity_type IN ('PURCHASE_ORDER','SUPPLY_REQUEST')),
  CONSTRAINT chk_procurement_approval_workflows_status
    CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  CONSTRAINT chk_procurement_approval_workflows_steps
    CHECK (current_step >= 1 AND total_steps >= 1)
);

CREATE INDEX IF NOT EXISTS idx_procurement_approval_workflows_tenant_status
  ON public.procurement_approval_workflows(tenant_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_approval_workflows_entity
  ON public.procurement_approval_workflows(tenant_id, entity_type, entity_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.procurement_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  workflow_id UUID NOT NULL REFERENCES public.procurement_approval_workflows(id),
  step_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  acted_by_user_id UUID,
  acted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (workflow_id, step_order),
  CONSTRAINT chk_procurement_approval_steps_step_order CHECK (step_order >= 1),
  CONSTRAINT chk_procurement_approval_steps_role
    CHECK (approver_role IN ('ADMIN','OPERATIONS','SUPERVISOR','TECHNICIAN','WAREHOUSE','FINANCE')),
  CONSTRAINT chk_procurement_approval_steps_status
    CHECK (status IN ('PENDING','APPROVED','REJECTED','SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_procurement_approval_steps_workflow
  ON public.procurement_approval_steps(workflow_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_approval_steps_tenant_status
  ON public.procurement_approval_steps(tenant_id, status)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.procurement_approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  workflow_id UUID NOT NULL REFERENCES public.procurement_approval_workflows(id),
  step_id UUID REFERENCES public.procurement_approval_steps(id),
  action TEXT NOT NULL,
  actor_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_procurement_approval_actions_action
    CHECK (action IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED','COMMENTED'))
);

CREATE INDEX IF NOT EXISTS idx_procurement_approval_actions_workflow
  ON public.procurement_approval_actions(workflow_id, created_at DESC);

ALTER TABLE public.procurement_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procurement_approval_workflows_select ON public.procurement_approval_workflows;
CREATE POLICY procurement_approval_workflows_select ON public.procurement_approval_workflows
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_workflows_insert ON public.procurement_approval_workflows;
CREATE POLICY procurement_approval_workflows_insert ON public.procurement_approval_workflows
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_workflows_update ON public.procurement_approval_workflows;
CREATE POLICY procurement_approval_workflows_update ON public.procurement_approval_workflows
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_steps_select ON public.procurement_approval_steps;
CREATE POLICY procurement_approval_steps_select ON public.procurement_approval_steps
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_steps_insert ON public.procurement_approval_steps;
CREATE POLICY procurement_approval_steps_insert ON public.procurement_approval_steps
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_steps_update ON public.procurement_approval_steps;
CREATE POLICY procurement_approval_steps_update ON public.procurement_approval_steps
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_actions_select ON public.procurement_approval_actions;
CREATE POLICY procurement_approval_actions_select ON public.procurement_approval_actions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS procurement_approval_actions_insert ON public.procurement_approval_actions;
CREATE POLICY procurement_approval_actions_insert ON public.procurement_approval_actions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_procurement_approval_workflows_updated_at ON public.procurement_approval_workflows;
CREATE TRIGGER trg_procurement_approval_workflows_updated_at
  BEFORE UPDATE ON public.procurement_approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_procurement_approval_workflows_etag ON public.procurement_approval_workflows;
CREATE TRIGGER trg_procurement_approval_workflows_etag
  BEFORE UPDATE ON public.procurement_approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_procurement_approval_steps_updated_at ON public.procurement_approval_steps;
CREATE TRIGGER trg_procurement_approval_steps_updated_at
  BEFORE UPDATE ON public.procurement_approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_procurement_approval_steps_etag ON public.procurement_approval_steps;
CREATE TRIGGER trg_procurement_approval_steps_etag
  BEFORE UPDATE ON public.procurement_approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMIT;
