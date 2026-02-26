import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_002,
  SYS_002,
  createProblemDetails,
  type MicrofiberEnrollmentListItem,
  type MicrofiberExportRow,
  type OwnerDashboardResponse,
  type SiteSupplyCostListItem,
} from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  countOverduePeriodicTasks,
  countPendingDayOffRequests,
  countTonightRoutes,
  countUnreviewedNightBridge,
  listComplaintRowsForMonth,
  listInventoryCountsForMonth,
  listMicrofiberEnrollments,
  listMicrofiberWashLogs,
  listOpenComplaints,
  listSpecialistStaff,
  listSupplyCostsForRange,
  updateMicrofiberStaff,
} from './owner-dashboard.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const OWNER_VIEW_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;
const MICROFIBER_VIEW_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;
const MICROFIBER_EDIT_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;

function canViewOwner(roles: string[]) {
  return hasAnyRole(roles, OWNER_VIEW_ROLES);
}

function canViewMicrofiber(roles: string[]) {
  return hasAnyRole(roles, MICROFIBER_VIEW_ROLES);
}

function canEditMicrofiber(roles: string[]) {
  return hasAnyRole(roles, MICROFIBER_EDIT_ROLES);
}

function nowDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartKey() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function sanitizeDateRange(dateFrom?: string, dateTo?: string) {
  const today = nowDateKey();
  const from = dateFrom ?? monthStartKey();
  const to = dateTo ?? today;
  return { from, to };
}

function formatMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export async function getOwnerDashboard(
  userDb: SupabaseClient,
  auth: AuthContext,
  apiPath: string,
): Promise<ServiceResult<OwnerDashboardResponse>> {
  if (!canViewOwner(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const fromDate = monthStartKey();
  const today = nowDateKey();
  const fromIso = `${fromDate}T00:00:00.000Z`;
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    complaintRowsRes,
    inventoryRowsRes,
    specialistRowsRes,
    supplyRowsRes,
    pendingDayOffRes,
    tonightRoutesRes,
    overduePeriodicRes,
    unreviewedBridgeRes,
    openComplaintsRes,
  ] = await Promise.all([
    listComplaintRowsForMonth(userDb, fromIso),
    listInventoryCountsForMonth(userDb, fromDate, today),
    listSpecialistStaff(userDb),
    listSupplyCostsForRange(userDb, fromDate, today),
    countPendingDayOffRequests(userDb),
    countTonightRoutes(userDb, today),
    countOverduePeriodicTasks(userDb, today),
    countUnreviewedNightBridge(userDb),
    listOpenComplaints(userDb),
  ]);

  const failures = [
    complaintRowsRes.error,
    inventoryRowsRes.error,
    specialistRowsRes.error,
    supplyRowsRes.error,
    pendingDayOffRes.error,
    tonightRoutesRes.error,
    overduePeriodicRes.error,
    unreviewedBridgeRes.error,
    openComplaintsRes.error,
  ].filter(Boolean);
  if (failures.length > 0) {
    return { success: false, error: SYS_002(failures[0]?.message ?? 'Failed to load owner dashboard', apiPath) };
  }

  const complaintRows = (complaintRowsRes.data ?? []) as Array<{
    created_at: string;
    resolved_at: string | null;
    status: string;
  }>;
  const resolvedComplaintDurations = complaintRows
    .filter((row) => row.resolved_at)
    .map((row) => (new Date(String(row.resolved_at)).getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const resolvedOrClosedCount = complaintRows.filter((row) => ['RESOLVED', 'CLOSED'].includes(row.status)).length;
  const escalatedCount = complaintRows.filter((row) => row.status === 'ESCALATED').length;

  const inventoryRows = (inventoryRowsRes.data ?? []) as Array<{ status: string }>;
  const inventoryOnTimeCount = inventoryRows.filter((row) => ['SUBMITTED', 'COMPLETED'].includes(row.status)).length;

  const specialistRows = (specialistRowsRes.data ?? []) as Array<{
    staff_status: string | null;
    updated_at: string;
    microfiber_exited_at: string | null;
  }>;
  const specialistTotal = specialistRows.length;
  const exited90Count = specialistRows.filter((row) => {
    if (row.microfiber_exited_at) {
      return new Date(`${row.microfiber_exited_at}T00:00:00.000Z`).getTime() >= new Date(ninetyDaysAgoIso).getTime();
    }
    if (!row.updated_at) return false;
    return (
      ['INACTIVE', 'TERMINATED', 'EXITED'].includes(String(row.staff_status ?? '').toUpperCase())
      && new Date(row.updated_at).getTime() >= new Date(ninetyDaysAgoIso).getTime()
    );
  }).length;

  const supplyRows = (supplyRowsRes.data ?? []) as Array<{ total_cost: number | null }>;
  const supplyCostMtd = supplyRows.reduce((sum, row) => sum + Number(row.total_cost ?? 0), 0);

  const openComplaints = (openComplaintsRes.data ?? []) as Array<{ priority: string }>;
  const highOrUrgent = openComplaints.filter((row) => ['HIGH', 'URGENT_SAME_NIGHT'].includes(String(row.priority))).length;

  return {
    success: true,
    data: {
      kpis: {
        complaint_response_time_hours: average(resolvedComplaintDurations),
        first_time_resolution_rate_pct: percent(resolvedOrClosedCount, resolvedOrClosedCount + escalatedCount),
        inventory_on_time_rate_pct: percent(inventoryOnTimeCount, inventoryRows.length),
        specialist_turnover_90d_pct: percent(exited90Count, specialistTotal),
        supply_cost_mtd: Math.round(supplyCostMtd * 100) / 100,
      },
      snapshot: {
        pending_day_off_requests: pendingDayOffRes.count ?? 0,
        tonight_routes: tonightRoutesRes.count ?? 0,
        overdue_periodic_tasks: overduePeriodicRes.count ?? 0,
        unreviewed_night_bridge: unreviewedBridgeRes.count ?? 0,
        open_complaints: {
          total: openComplaints.length,
          high_or_urgent: highOrUrgent,
        },
      },
    },
  };
}

export async function getSupplyCosts(
  userDb: SupabaseClient,
  auth: AuthContext,
  query: { date_from?: string; date_to?: string; site_id?: string; limit?: number },
  apiPath: string,
): Promise<ServiceResult<{
  rows: SiteSupplyCostListItem[];
  by_site: Array<{ site_id: string; site_name: string; site_code: string | null; total_cost: number }>;
  monthly_trend: Array<{ month: string; total_cost: number }>;
  total_cost: number;
  date_range: { from: string; to: string };
}>> {
  if (!canViewOwner(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { from, to } = sanitizeDateRange(query.date_from, query.date_to);
  const { data, error } = await listSupplyCostsForRange(userDb, from, to, query.site_id);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  const rows = (data ?? []) as unknown as SiteSupplyCostListItem[];
  const limitedRows = rows.slice(0, query.limit ?? rows.length);

  const bySiteMap = new Map<string, { site_id: string; site_name: string; site_code: string | null; total_cost: number }>();
  const trendMap = new Map<string, number>();
  let totalCost = 0;

  for (const row of rows) {
    const siteName = row.site?.name ?? 'Unknown Site';
    const siteCode = row.site?.site_code ?? null;
    const rowCost = Number(row.total_cost ?? 0);
    totalCost += rowCost;

    const bySite = bySiteMap.get(row.site_id) ?? {
      site_id: row.site_id,
      site_name: siteName,
      site_code: siteCode,
      total_cost: 0,
    };
    bySite.total_cost += rowCost;
    bySiteMap.set(row.site_id, bySite);

    const month = formatMonthKey(row.delivery_date);
    trendMap.set(month, (trendMap.get(month) ?? 0) + rowCost);
  }

  const bySite = Array.from(bySiteMap.values())
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10)
    .map((entry) => ({ ...entry, total_cost: Math.round(entry.total_cost * 100) / 100 }));
  const monthlyTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, total_cost: Math.round(value * 100) / 100 }));

  return {
    success: true,
    data: {
      rows: limitedRows,
      by_site: bySite,
      monthly_trend: monthlyTrend,
      total_cost: Math.round(totalCost * 100) / 100,
      date_range: { from, to },
    },
  };
}

export async function getSupplyCostsBySite(
  userDb: SupabaseClient,
  auth: AuthContext,
  siteId: string,
  query: { date_from?: string; date_to?: string },
  apiPath: string,
): Promise<ServiceResult<{
  rows: SiteSupplyCostListItem[];
  by_supply: Array<{ supply_id: string; supply_name: string; supply_code: string | null; quantity: number; total_cost: number }>;
  monthly_trend: Array<{ month: string; total_cost: number }>;
  total_cost: number;
}>> {
  if (!canViewOwner(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { from, to } = sanitizeDateRange(query.date_from, query.date_to);
  const { data, error } = await listSupplyCostsForRange(userDb, from, to, siteId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const rows = (data ?? []) as unknown as SiteSupplyCostListItem[];
  const bySupplyMap = new Map<string, { supply_id: string; supply_name: string; supply_code: string | null; quantity: number; total_cost: number }>();
  const trendMap = new Map<string, number>();
  let totalCost = 0;

  for (const row of rows) {
    const rowCost = Number(row.total_cost ?? 0);
    totalCost += rowCost;
    const aggregate = bySupplyMap.get(row.supply_id) ?? {
      supply_id: row.supply_id,
      supply_name: row.supply?.name ?? 'Unknown Supply',
      supply_code: row.supply?.code ?? null,
      quantity: 0,
      total_cost: 0,
    };
    aggregate.quantity += Number(row.quantity ?? 0);
    aggregate.total_cost += rowCost;
    bySupplyMap.set(row.supply_id, aggregate);

    const month = formatMonthKey(row.delivery_date);
    trendMap.set(month, (trendMap.get(month) ?? 0) + rowCost);
  }

  return {
    success: true,
    data: {
      rows,
      by_supply: Array.from(bySupplyMap.values())
        .sort((a, b) => b.total_cost - a.total_cost)
        .map((entry) => ({ ...entry, total_cost: Math.round(entry.total_cost * 100) / 100 })),
      monthly_trend: Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => ({ month, total_cost: Math.round(value * 100) / 100 })),
      total_cost: Math.round(totalCost * 100) / 100,
    },
  };
}

export async function getMicrofiberEnrollments(
  userDb: SupabaseClient,
  auth: AuthContext,
  apiPath: string,
): Promise<ServiceResult<MicrofiberEnrollmentListItem[]>> {
  if (!canViewMicrofiber(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await listMicrofiberEnrollments(userDb);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: (data ?? []) as unknown as MicrofiberEnrollmentListItem[] };
}

export async function enrollMicrofiberSpecialist(
  userDb: SupabaseClient,
  auth: AuthContext,
  staffId: string,
  payload: { enrolled_at?: string; microfiber_rate_per_set?: number },
  apiPath: string,
): Promise<ServiceResult<MicrofiberEnrollmentListItem>> {
  if (!canEditMicrofiber(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const enrolledAt = payload.enrolled_at ?? nowDateKey();
  const { data, error } = await updateMicrofiberStaff(userDb, staffId, {
    microfiber_enrolled: true,
    microfiber_enrolled_at: enrolledAt,
    microfiber_exited_at: null,
    microfiber_rate_per_set: payload.microfiber_rate_per_set ?? 5,
  });
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to enroll specialist into microfiber program', apiPath),
    };
  }

  return { success: true, data: data as unknown as MicrofiberEnrollmentListItem };
}

export async function exitMicrofiberSpecialist(
  userDb: SupabaseClient,
  auth: AuthContext,
  staffId: string,
  payload: { exited_at?: string },
  apiPath: string,
): Promise<ServiceResult<MicrofiberEnrollmentListItem>> {
  if (!canEditMicrofiber(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const exitedAt = payload.exited_at ?? nowDateKey();
  const { data, error } = await updateMicrofiberStaff(userDb, staffId, {
    microfiber_enrolled: false,
    microfiber_exited_at: exitedAt,
  });
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to remove specialist from microfiber program', apiPath),
    };
  }

  return { success: true, data: data as unknown as MicrofiberEnrollmentListItem };
}

export async function exportMicrofiberPayroll(
  userDb: SupabaseClient,
  auth: AuthContext,
  query: { date_from?: string; date_to?: string },
  apiPath: string,
): Promise<ServiceResult<MicrofiberExportRow[]>> {
  if (!canViewMicrofiber(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { from, to } = sanitizeDateRange(query.date_from, query.date_to);
  const { data, error } = await listMicrofiberWashLogs(userDb, from, to);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const rows = (data ?? []) as Array<{
    sets_washed: number;
    amount_due: number;
    payroll_period_start: string | null;
    payroll_period_end: string | null;
    staff: { full_name?: string | null; staff_code?: string | null } | Array<{ full_name?: string | null; staff_code?: string | null }> | null;
  }>;

  const grouped = new Map<string, MicrofiberExportRow>();
  for (const row of rows) {
    const staff = Array.isArray(row.staff) ? row.staff[0] : row.staff;
    const staffName = staff?.full_name ?? 'Unknown';
    const staffCode = staff?.staff_code ?? 'N/A';
    const key = `${staffCode}:${row.payroll_period_start ?? from}:${row.payroll_period_end ?? to}`;
    const entry = grouped.get(key) ?? {
      staff_name: staffName,
      staff_code: staffCode,
      period_start: row.payroll_period_start ?? from,
      period_end: row.payroll_period_end ?? to,
      sets_washed: 0,
      amount_due: 0,
    };
    entry.sets_washed += Number(row.sets_washed ?? 0);
    entry.amount_due += Number(row.amount_due ?? 0);
    grouped.set(key, entry);
  }

  return {
    success: true,
    data: Array.from(grouped.values())
      .sort((a, b) => a.staff_name.localeCompare(b.staff_name))
      .map((row) => ({ ...row, amount_due: Math.round(row.amount_due * 100) / 100 })),
  };
}
