export type FieldReportType = 'SUPPLY_REQUEST' | 'MAINTENANCE' | 'DAY_OFF' | 'INCIDENT' | 'GENERAL';
export type FieldReportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type FieldReportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface FieldReportRequestedItem {
  supply_id: string;
  qty: number;
}

export interface FieldReportRecord {
  id: string;
  tenant_id: string;
  report_code: string;
  report_type: FieldReportType;
  reported_by: string;
  site_id: string | null;
  description: string;
  priority: FieldReportPriority;
  photos: string[] | null;
  requested_items: FieldReportRequestedItem[] | null;
  requested_date: string | null;
  status: FieldReportStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface FieldReportListItem extends FieldReportRecord {
  reporter?: { id: string; staff_code: string; full_name: string | null } | null;
  site?: { id: string; site_code: string; name: string } | null;
  acknowledged_staff?: { id: string; staff_code: string; full_name: string | null } | null;
  resolved_staff?: { id: string; staff_code: string; full_name: string | null } | null;
}

export interface FieldReportCreateInput {
  report_type: FieldReportType;
  site_id?: string | null;
  description: string;
  priority?: FieldReportPriority;
  photos?: string[] | null;
  requested_items?: FieldReportRequestedItem[] | null;
  requested_date?: string | null;
}

export interface FieldReportUpdateInput {
  status?: FieldReportStatus;
  priority?: FieldReportPriority;
  resolution_notes?: string | null;
  requested_date?: string | null;
  requested_items?: FieldReportRequestedItem[] | null;
  photos?: string[] | null;
  version_etag: string;
}

