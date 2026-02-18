export type BoardWorkspaceScope = 'SUPERVISOR' | 'REGION' | 'GLOBAL';
export type BoardStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETE' | 'ARCHIVED';

export interface PlanningBoard {
  id: string;
  tenant_id: string;
  board_date: string;
  supervisor_staff_id: string | null;
  workspace_scope: BoardWorkspaceScope;
  status: BoardStatus;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export type BoardItemKind = 'TICKET' | 'NOTE' | 'TASK';
export type BoardItemSyncState = 'synced' | 'draft_change' | 'applied' | 'conflict' | 'dismissed';

export interface PlanningBoardItem {
  id: string;
  tenant_id: string;
  board_id: string;
  item_kind: BoardItemKind;
  ticket_id: string | null;
  title: string;
  sync_state: BoardItemSyncState;
  current_assignee_staff_id: string | null;
  current_assignee_subcontractor_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export type ProposalApplyState = 'draft' | 'validated' | 'applied' | 'rejected' | 'dismissed';

export interface PlanningItemProposal {
  id: string;
  tenant_id: string;
  board_item_id: string;
  proposed_staff_id: string | null;
  proposed_subcontractor_id: string | null;
  proposal_reason: string | null;
  apply_state: ProposalApplyState;
  created_by: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export type PlanningLinkType = 'TICKET' | 'SCHEDULE_PERIOD' | 'SITE' | 'JOB' | 'ASSIGNMENT';

export interface PlanningItemLink {
  id: string;
  tenant_id: string;
  board_item_id: string;
  link_type: PlanningLinkType;
  linked_entity_id: string;
  linked_entity_code: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export type PlanningConflictType =
  | 'double_booking'
  | 'in_progress_change'
  | 'availability_violation'
  | 'locked_period'
  | 'external_drift'
  | 'missing_required_skill'
  | 'rest_window_violation'
  | 'max_weekly_hours_violation';

export type PlanningConflictSeverity = 'blocking' | 'warning';

export type PlanningConflictResolution =
  | 'applied_anyway'
  | 'reverted'
  | 'dismissed'
  | 'auto_resolved'
  | 'applied'
  | 'rejected'
  | 'override_applied';

export interface PlanningBoardConflict {
  id: string;
  tenant_id: string;
  board_id: string;
  card_id: string;
  conflict_type: PlanningConflictType;
  severity: PlanningConflictSeverity;
  affected_staff_id: string | null;
  affected_ticket_id: string | null;
  description: string;
  resolution: PlanningConflictResolution | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}
