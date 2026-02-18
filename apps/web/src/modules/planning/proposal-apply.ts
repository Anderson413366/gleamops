export interface PlanningApplyInput {
  board_id: string;
  board_item_id: string;
  proposal_id: string;
  acknowledged_warning_ids: string[];
  override_locked_period: boolean;
  override_reason: string | null;
}

export interface PlanningApplyConflict {
  conflict_type: string;
  description: string;
  staff_id: string | null;
  ticket_id: string | null;
}

export interface PlanningApplyResult {
  board_item_id: string;
  sync_state: 'applied';
  ticket_id: string;
  conflicts_logged: PlanningApplyConflict[];
}
