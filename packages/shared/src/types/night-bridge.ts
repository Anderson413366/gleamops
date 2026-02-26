import type { DeliveryItem, ShiftSummary, SkipReason, StopStatus } from './routes';

export type NightBridgeReviewStatus = 'PENDING' | 'REVIEWED' | 'NEEDS_FOLLOWUP';
export type NightBridgeUrgency = 'GREEN' | 'YELLOW' | 'RED';

export interface NightBridgeSummaryItem {
  route_id: string;
  tenant_id: string;
  route_date: string;
  route_status: string;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  shift_summary: ShiftSummary | null;
  shift_review_status: NightBridgeReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  floater_name: string | null;
  floater_code: string | null;
  vehicle_name: string | null;
  vehicle_code: string | null;
  stops_completed: number;
  stops_skipped: number;
  stops_total: number;
  photos_uploaded: number;
  issues_count: number;
  urgency: NightBridgeUrgency;
}

export interface NightBridgeTaskDetail {
  id: string;
  task_type: string;
  description: string;
  task_order: number;
  is_completed: boolean;
  evidence_required: boolean;
  evidence_photos: string[];
  notes: string | null;
  delivery_items: DeliveryItem[] | null;
  source_complaint_id: string | null;
}

export interface NightBridgeStopDetail {
  id: string;
  stop_order: number;
  stop_status: StopStatus;
  arrived_at: string | null;
  departed_at: string | null;
  skip_reason: SkipReason | null;
  skip_notes: string | null;
  site_id: string | null;
  site_code: string | null;
  site_name: string;
  tasks_total: number;
  tasks_completed: number;
  photos_uploaded: number;
  tasks: NightBridgeTaskDetail[];
}

export type NightBridgeIssueType = 'SKIPPED_STOP' | 'TASK_NOTE' | 'INCOMPLETE_TASK';

export interface NightBridgeIssue {
  type: NightBridgeIssueType;
  stop_id: string;
  stop_order: number;
  site_name: string;
  message: string;
  task_id: string | null;
}

export interface NightBridgeDetail {
  summary: NightBridgeSummaryItem;
  stops: NightBridgeStopDetail[];
  issues: NightBridgeIssue[];
  floater_notes: string | null;
}

export interface NightBridgeAddToTomorrowInput {
  site_id: string;
  description: string;
  evidence_required?: boolean;
}

export interface NightBridgeReviewInput {
  shift_review_status: 'REVIEWED' | 'NEEDS_FOLLOWUP';
  reviewer_notes?: string | null;
  add_to_tomorrow?: NightBridgeAddToTomorrowInput | null;
}

export interface NightBridgeInjectedTask {
  route_id: string;
  route_stop_id: string;
  task_id: string;
  route_date: string;
  stop_order: number;
  site_id: string;
  site_name: string;
}

export interface NightBridgeReviewResult {
  route_id: string;
  shift_review_status: NightBridgeReviewStatus;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  injected_task: NightBridgeInjectedTask | null;
}
