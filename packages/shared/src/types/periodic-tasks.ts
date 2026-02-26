import type { RouteTaskType } from './routes';

export type PeriodicTaskFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
export type PeriodicTaskStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface PeriodicTask {
  id: string;
  tenant_id: string;
  periodic_code: string;
  site_job_id: string;
  task_type: RouteTaskType;
  description_key: string | null;
  description_override: string | null;
  frequency: PeriodicTaskFrequency;
  custom_interval_days: number | null;
  last_completed_at: string | null;
  last_completed_route_id: string | null;
  next_due_date: string;
  auto_add_to_route: boolean;
  preferred_staff_id: string | null;
  evidence_required: boolean;
  notes: string | null;
  status: PeriodicTaskStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface PeriodicTaskListItem extends PeriodicTask {
  site_job?: {
    id: string;
    job_code: string;
    site?: { id: string; site_code: string; name: string } | null;
  } | null;
  preferred_staff?: { id: string; staff_code: string; full_name: string | null } | null;
  last_completed_route?: { id: string; route_date: string; status: string } | null;
  is_overdue?: boolean;
  is_due_soon?: boolean;
}

export interface PeriodicTaskCompletion {
  id: string;
  completed_at: string;
  completed_by: string | null;
  description: string;
  route_id: string;
  route_date: string;
  route_status: string;
  site_name: string | null;
  site_code: string | null;
}

export interface PeriodicTaskDetail extends PeriodicTaskListItem {
  completion_history: PeriodicTaskCompletion[];
}

export interface PeriodicTaskCreateInput {
  site_job_id: string;
  task_type: RouteTaskType;
  description_key?: string | null;
  description_override?: string | null;
  frequency: PeriodicTaskFrequency;
  custom_interval_days?: number | null;
  next_due_date: string;
  auto_add_to_route?: boolean;
  preferred_staff_id?: string | null;
  evidence_required?: boolean;
  notes?: string | null;
  status?: Extract<PeriodicTaskStatus, 'ACTIVE' | 'PAUSED'>;
}

export interface PeriodicTaskUpdateInput {
  site_job_id?: string;
  task_type?: RouteTaskType;
  description_key?: string | null;
  description_override?: string | null;
  frequency?: PeriodicTaskFrequency;
  custom_interval_days?: number | null;
  next_due_date?: string;
  auto_add_to_route?: boolean;
  preferred_staff_id?: string | null;
  evidence_required?: boolean;
  notes?: string | null;
  status?: PeriodicTaskStatus;
  version_etag: string;
}

export interface PeriodicTaskCompleteInput {
  completed_at?: string | null;
  route_id?: string | null;
}

export interface PeriodicTaskArchiveInput {
  reason?: string | null;
}

