export type RouteTaskType =
  | 'DELIVER_PICKUP'
  | 'FULL_CLEAN'
  | 'LIGHT_CLEAN'
  | 'VACUUM_MOP_TRASH'
  | 'INSPECTION'
  | 'INVENTORY'
  | 'SUPPLY_REFILL'
  | 'RESTROOM_CLEAN'
  | 'FLOOR_SCRUB'
  | 'TRAINING'
  | 'CUSTOM';

export type RouteWeekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type StopStatus = 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
export type SkipReason = 'SITE_CLOSED' | 'ACCESS_ISSUE' | 'TIME_CONSTRAINT' | 'OTHER';
export type ShiftReviewStatus = 'PENDING' | 'REVIEWED' | 'NEEDS_FOLLOWUP';

export interface DeliveryItem {
  supply_id: string;
  supply_name?: string;
  quantity: number;
  unit?: string;
  direction: 'deliver' | 'pickup';
}

export interface RouteTemplate {
  id: string;
  tenant_id: string;
  template_code: string;
  label: string;
  weekday: RouteWeekday;
  assigned_staff_id: string | null;
  default_vehicle_id: string | null;
  default_key_box: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface RouteTemplateStop {
  id: string;
  tenant_id: string;
  template_id: string;
  site_job_id: string;
  stop_order: number;
  access_window_start: string | null;
  access_window_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
  tasks: RouteTemplateTask[];
}

export interface RouteTemplateTask {
  id: string;
  tenant_id: string;
  template_stop_id: string;
  task_type: RouteTaskType;
  description_key: string | null;
  description_override: string | null;
  task_order: number;
  evidence_required: boolean;
  delivery_items: DeliveryItem[] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface RouteTemplateWithStops extends RouteTemplate {
  stops: RouteTemplateStop[];
}

export interface RouteStopTask {
  id: string;
  tenant_id: string;
  route_stop_id: string;
  task_type: RouteTaskType;
  description: string;
  task_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  evidence_required: boolean;
  evidence_photos: string[] | null;
  notes: string | null;
  delivery_items: DeliveryItem[] | null;
  is_from_template: boolean;
  source_complaint_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface RouteStop {
  id: string;
  tenant_id: string;
  route_id: string;
  site_job_id: string;
  stop_order: number;
  estimated_travel_minutes: number | null;
  is_locked: boolean;
  arrived_at: string | null;
  departed_at: string | null;
  stop_status: StopStatus;
  skip_reason: SkipReason | null;
  skip_notes: string | null;
  access_window_start: string | null;
  access_window_end: string | null;
  tasks?: RouteStopTask[];
}

export interface RouteRecord {
  id: string;
  tenant_id: string;
  route_date: string;
  route_owner_staff_id: string | null;
  route_type: 'DAILY_ROUTE' | 'MASTER_ROUTE' | 'PROJECT_ROUTE';
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  template_id: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  key_box_number: string | null;
  vehicle_cleaned: boolean | null;
  personal_items_removed: boolean | null;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  shift_summary: ShiftSummary | null;
  shift_review_status: ShiftReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export interface RouteWithStops extends RouteRecord {
  stops: RouteStop[];
}

export interface ShiftSummary {
  stops_completed: number;
  stops_skipped: number;
  stops_total: number;
  issues_reported: number;
  photos_uploaded: number;
  mileage_driven: number | null;
  floater_notes: string | null;
  complaints_addressed: number;
}
