export interface SiteSupplyCostRecord {
  id: string;
  tenant_id: string;
  cost_code: string;
  site_id: string;
  supply_id: string;
  delivery_date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  source: 'DELIVERY' | 'ORDER' | 'MANUAL';
  route_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface SiteSupplyCostListItem extends SiteSupplyCostRecord {
  site?: { id: string; site_code: string; name: string } | null;
  supply?: { id: string; code: string; name: string; category: string | null } | null;
}

export interface MicrofiberWashLogRecord {
  id: string;
  tenant_id: string;
  wash_code: string;
  staff_id: string;
  site_id: string;
  wash_date: string;
  sets_washed: number;
  amount_due: number;
  payroll_period_start: string | null;
  payroll_period_end: string | null;
  exported: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface MicrofiberWashLogListItem extends MicrofiberWashLogRecord {
  staff?: { id: string; staff_code: string; full_name: string | null; microfiber_rate_per_set: number | null } | null;
  site?: { id: string; site_code: string; name: string } | null;
}

export interface MicrofiberEnrollmentListItem {
  id: string;
  staff_code: string;
  full_name: string | null;
  role: string | null;
  microfiber_enrolled: boolean;
  microfiber_enrolled_at: string | null;
  microfiber_exited_at: string | null;
  microfiber_rate_per_set: number | null;
}

export interface OwnerDashboardKpis {
  complaint_response_time_hours: number | null;
  first_time_resolution_rate_pct: number | null;
  inventory_on_time_rate_pct: number | null;
  specialist_turnover_90d_pct: number | null;
  supply_cost_mtd: number;
}

export interface OwnerDashboardSnapshot {
  pending_day_off_requests: number;
  tonight_routes: number;
  overdue_periodic_tasks: number;
  unreviewed_night_bridge: number;
  open_complaints: {
    total: number;
    high_or_urgent: number;
  };
}

export interface OwnerDashboardResponse {
  kpis: OwnerDashboardKpis;
  snapshot: OwnerDashboardSnapshot;
}

export interface MicrofiberExportRow {
  staff_name: string;
  staff_code: string;
  period_start: string | null;
  period_end: string | null;
  sets_washed: number;
  amount_due: number;
}
