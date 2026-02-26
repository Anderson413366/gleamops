import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from './complaints';

export type CustomerPortalFeedbackType = 'COMPLAINT' | 'KUDOS' | 'SUGGESTION' | 'QUESTION';
export type CustomerPortalSubmittedVia = 'PORTAL' | 'EMAIL' | 'PHONE' | 'IN_PERSON';
export type CustomerPortalFeedbackStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CustomerPortalSession {
  id: string;
  tenant_id: string;
  session_code: string;
  client_id: string;
  token_hash: string;
  expires_at: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface CustomerPortalSessionListItem extends CustomerPortalSession {
  client?: { id: string; client_code: string | null; name: string } | null;
}

export interface CustomerFeedbackRecord {
  id: string;
  tenant_id: string;
  feedback_code: string;
  client_id: string;
  site_id: string | null;
  feedback_type: CustomerPortalFeedbackType;
  submitted_via: CustomerPortalSubmittedVia;
  category: ComplaintCategory | null;
  contact_name: string | null;
  contact_email: string | null;
  message: string;
  photos: string[] | null;
  linked_complaint_id: string | null;
  status: CustomerPortalFeedbackStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface CustomerFeedbackListItem extends CustomerFeedbackRecord {
  site?: { id: string; site_code: string; name: string } | null;
  complaint?: { id: string; complaint_code: string; status: ComplaintStatus } | null;
}

export interface CustomerPortalInspectionListItem {
  id: string;
  inspection_code: string;
  site_id: string | null;
  site_name: string;
  site_code: string | null;
  inspector_name: string | null;
  status: string;
  score_pct: number | null;
  passed: boolean | null;
  completed_at: string | null;
}

export interface CustomerPortalInspectionIssueItem {
  id: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  resolved_at: string | null;
}

export interface CustomerPortalInspectionItemScore {
  id: string;
  section: string | null;
  label: string;
  score: number | null;
  score_value: number | null;
  notes: string | null;
  photos: string[] | null;
}

export interface CustomerPortalInspectionDetail extends CustomerPortalInspectionListItem {
  started_at: string | null;
  notes: string | null;
  summary_notes: string | null;
  photos: string[] | null;
  items: CustomerPortalInspectionItemScore[];
  issues: CustomerPortalInspectionIssueItem[];
}

export interface CustomerPortalComplaintListItem {
  id: string;
  complaint_code: string;
  site_id: string | null;
  site_name: string;
  site_code: string | null;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  created_at: string;
  resolution_description: string | null;
}

export interface CustomerPortalWorkTicketListItem {
  id: string;
  ticket_code: string;
  site_id: string;
  site_name: string;
  site_code: string | null;
  scheduled_date: string;
  status: string;
  type: string | null;
  title: string | null;
  description: string | null;
  priority: string | null;
}

export interface CustomerPortalDashboard {
  token: string;
  expires_at: string;
  client: {
    id: string;
    name: string;
    client_code: string | null;
  };
  sites: Array<{ id: string; site_code: string; name: string }>;
  stats: {
    openComplaints: number;
    recentInspections: number;
    openWorkTickets: number;
  };
  recentInspections: CustomerPortalInspectionListItem[];
}

export interface CustomerPortalAuthInput {
  token: string;
}

export interface CustomerPortalSessionCreateInput {
  client_id: string;
  expires_in_days?: number;
}

export interface CustomerPortalFeedbackCreateInput {
  feedback_type: CustomerPortalFeedbackType;
  site_id?: string | null;
  category?: ComplaintCategory | null;
  priority?: ComplaintPriority | null;
  contact_name?: string | null;
  contact_email?: string | null;
  message: string;
  photos?: string[] | null;
}
