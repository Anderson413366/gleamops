export type DriftResolutionChoice = 'use_board_version' | 'accept_schedule_version';

export interface DriftResolutionEvent {
  board_item_id: string;
  ticket_id: string;
  choice: DriftResolutionChoice;
  resolved_by: string;
  resolved_at: string;
}
