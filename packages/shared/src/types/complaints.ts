export type ComplaintReportedByType = 'CUSTOMER' | 'SPECIALIST' | 'FLOATER' | 'MANAGER' | 'SYSTEM';
export type ComplaintSource = 'EMAIL' | 'PHONE' | 'APP' | 'PORTAL' | 'IN_PERSON';
export type ComplaintCategory =
  | 'CLEANING_QUALITY'
  | 'MISSED_SERVICE'
  | 'SUPPLY_ISSUE'
  | 'DAMAGE'
  | 'BEHAVIOR'
  | 'SAFETY'
  | 'OTHER';
export type ComplaintPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT_SAME_NIGHT';
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';

export interface ComplaintRecord {
  id: string;
  tenant_id: string;
  complaint_code: string;
  site_id: string;
  client_id: string | null;
  reported_by_type: ComplaintReportedByType;
  reported_by_staff_id: string | null;
  reported_by_name: string | null;
  source: ComplaintSource;
  customer_original_message: string | null;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to_staff_id: string | null;
  linked_route_task_id: string | null;
  photos_before: string[] | null;
  photos_after: string[] | null;
  resolution_description: string | null;
  resolution_email_sent: boolean;
  resolution_email_sent_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface ComplaintListItem extends ComplaintRecord {
  site?: { id: string; site_code: string; name: string } | null;
  client?: { id: string; client_code: string; name: string } | null;
  assigned_staff?: { id: string; staff_code: string; full_name: string | null } | null;
  reported_staff?: { id: string; staff_code: string; full_name: string | null } | null;
}

export interface ComplaintTimelineEvent {
  id: string;
  action: string;
  actor_user_id: string;
  created_at: string;
}

export interface ComplaintDetail extends ComplaintListItem {
  timeline: ComplaintTimelineEvent[];
}

export interface ComplaintCreateInput {
  site_id: string;
  reported_by_type: ComplaintReportedByType;
  reported_by_staff_id?: string | null;
  reported_by_name?: string | null;
  source: ComplaintSource;
  customer_original_message?: string | null;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  assigned_to_staff_id?: string | null;
}

export interface ComplaintUpdateInput {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
  assigned_to_staff_id?: string | null;
  customer_original_message?: string | null;
  reviewer_notes?: string | null;
  version_etag: string;
}

export interface ComplaintResolveInput {
  resolution_description: string;
  reviewer_notes?: string | null;
}

export interface ComplaintInjectRouteInput {
  description: string;
  evidence_required?: boolean;
}

export interface ComplaintSendResolutionInput {
  subject?: string | null;
  message?: string | null;
}

export interface ComplaintPhotoInput {
  photo_url: string;
}
