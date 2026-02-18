BEGIN;

CREATE TABLE IF NOT EXISTS public.planning_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  board_date DATE NOT NULL,
  supervisor_staff_id UUID NOT NULL REFERENCES public.staff(id),
  workspace_scope TEXT NOT NULL DEFAULT 'SUPERVISOR',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_planning_boards_scope CHECK (workspace_scope IN ('SUPERVISOR','REGION','GLOBAL')),
  CONSTRAINT chk_planning_boards_status CHECK (status IN ('DRAFT','ACTIVE','COMPLETE','ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_planning_boards_tenant_date
  ON public.planning_boards(tenant_id, board_date)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.planning_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  board_id UUID NOT NULL REFERENCES public.planning_boards(id),
  item_kind TEXT NOT NULL DEFAULT 'TICKET',
  ticket_id UUID REFERENCES public.work_tickets(id),
  title TEXT,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  current_assignee_staff_id UUID REFERENCES public.staff(id),
  current_assignee_subcontractor_id UUID REFERENCES public.subcontractors(id),
  schedule_version_etag UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_planning_board_items_kind CHECK (item_kind IN ('TICKET','NOTE','TASK')),
  CONSTRAINT chk_planning_board_items_state CHECK (sync_state IN ('synced','draft_change','applied','conflict','dismissed')),
  CONSTRAINT chk_planning_board_items_assignee_xor CHECK (
    (current_assignee_staff_id IS NOT NULL AND current_assignee_subcontractor_id IS NULL)
    OR
    (current_assignee_staff_id IS NULL AND current_assignee_subcontractor_id IS NOT NULL)
    OR
    (current_assignee_staff_id IS NULL AND current_assignee_subcontractor_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_planning_board_items_ticket_per_board
  ON public.planning_board_items(board_id, ticket_id)
  WHERE archived_at IS NULL AND item_kind = 'TICKET' AND ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planning_board_items_board_sort
  ON public.planning_board_items(board_id, sort_order)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.planning_item_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  board_item_id UUID NOT NULL REFERENCES public.planning_board_items(id),
  proposed_staff_id UUID REFERENCES public.staff(id),
  proposed_subcontractor_id UUID REFERENCES public.subcontractors(id),
  proposal_reason TEXT,
  apply_state TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_planning_item_proposals_assignee_xor CHECK (
    (proposed_staff_id IS NOT NULL AND proposed_subcontractor_id IS NULL)
    OR
    (proposed_staff_id IS NULL AND proposed_subcontractor_id IS NOT NULL)
  ),
  CONSTRAINT chk_planning_item_proposals_state CHECK (apply_state IN ('draft','validated','applied','rejected','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_planning_item_proposals_item_state
  ON public.planning_item_proposals(tenant_id, board_item_id, apply_state)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.planning_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  board_item_id UUID NOT NULL REFERENCES public.planning_board_items(id),
  link_type TEXT NOT NULL,
  linked_entity_id UUID NOT NULL,
  linked_entity_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_planning_item_links_type CHECK (link_type IN ('TICKET','SCHEDULE_PERIOD','SITE','JOB','ASSIGNMENT')),
  UNIQUE (board_item_id, link_type, linked_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_item_links_tenant_board
  ON public.planning_item_links(tenant_id, board_item_id)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_planning_boards_updated_at ON public.planning_boards;
CREATE TRIGGER trg_planning_boards_updated_at
  BEFORE UPDATE ON public.planning_boards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_planning_boards_etag ON public.planning_boards;
CREATE TRIGGER trg_planning_boards_etag
  BEFORE UPDATE ON public.planning_boards
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_planning_board_items_updated_at ON public.planning_board_items;
CREATE TRIGGER trg_planning_board_items_updated_at
  BEFORE UPDATE ON public.planning_board_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_planning_board_items_etag ON public.planning_board_items;
CREATE TRIGGER trg_planning_board_items_etag
  BEFORE UPDATE ON public.planning_board_items
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_planning_item_proposals_etag ON public.planning_item_proposals;
CREATE TRIGGER trg_planning_item_proposals_etag
  BEFORE UPDATE ON public.planning_item_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_planning_item_links_updated_at ON public.planning_item_links;
CREATE TRIGGER trg_planning_item_links_updated_at
  BEFORE UPDATE ON public.planning_item_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_planning_item_links_etag ON public.planning_item_links;
CREATE TRIGGER trg_planning_item_links_etag
  BEFORE UPDATE ON public.planning_item_links
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

ALTER TABLE public.planning_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_item_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_item_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planning_boards_select ON public.planning_boards;
CREATE POLICY planning_boards_select ON public.planning_boards
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_boards_insert ON public.planning_boards;
CREATE POLICY planning_boards_insert ON public.planning_boards
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_boards_update ON public.planning_boards;
CREATE POLICY planning_boards_update ON public.planning_boards
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_board_items_select ON public.planning_board_items;
CREATE POLICY planning_board_items_select ON public.planning_board_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_board_items_insert ON public.planning_board_items;
CREATE POLICY planning_board_items_insert ON public.planning_board_items
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_board_items_update ON public.planning_board_items;
CREATE POLICY planning_board_items_update ON public.planning_board_items
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_proposals_select ON public.planning_item_proposals;
CREATE POLICY planning_item_proposals_select ON public.planning_item_proposals
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_proposals_insert ON public.planning_item_proposals;
CREATE POLICY planning_item_proposals_insert ON public.planning_item_proposals
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_proposals_update ON public.planning_item_proposals;
CREATE POLICY planning_item_proposals_update ON public.planning_item_proposals
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_links_select ON public.planning_item_links;
CREATE POLICY planning_item_links_select ON public.planning_item_links
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_links_insert ON public.planning_item_links;
CREATE POLICY planning_item_links_insert ON public.planning_item_links
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS planning_item_links_update ON public.planning_item_links;
CREATE POLICY planning_item_links_update ON public.planning_item_links
  FOR UPDATE USING (tenant_id = current_tenant_id());

COMMIT;
