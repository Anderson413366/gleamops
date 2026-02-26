import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_002, SYS_002, createProblemDetails, isFeatureEnabled } from '@gleamops/shared';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  canManageShiftsTimeCoverage,
  canManageShiftsTimePayroll,
  canOperateShiftsTimeRouteExecution,
  canReportShiftsTimeCallout,
  canRespondShiftsTimeCoverage,
} from './shifts-time.permissions';
import {
  rpcAcceptCoverage,
  rpcCaptureTravelSegment,
  rpcFinalizePayrollExport,
  rpcGeneratePayrollPreview,
  findStaffIdByUserId,
  listActivePayrollMappings,
  listCoverageCandidates,
  listRecentCalloutEvents,
  listRecentPayrollRuns,
  listRouteStopsByRouteIds,
  listRoutesForDate,
  rpcOfferCoverage,
  rpcReportCallout,
  rpcRouteCompleteStop,
  rpcRouteStartStop,
  type ShiftsTimeCalloutEventRow,
  type ShiftsTimeCoverageCandidateRow,
  type ShiftsTimePayrollMappingRow,
  type ShiftsTimePayrollRunRow,
  type ShiftsTimeRouteRow,
  type ShiftsTimeRouteStopRow,
} from './shifts-time.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

function featureDisabled(instance: string, detail: string) {
  return createProblemDetails('SHIFT_001', 'Feature disabled', 404, detail, instance);
}

function isRouteExecutionEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_route_execution');
}

function isCalloutEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_callout_automation');
}

function isPayrollEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_payroll_export_v1');
}

function isManagerTier(roles: string[]) {
  return canManageShiftsTimeCoverage(roles) || canManageShiftsTimePayroll(roles);
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSiteDescriptor(stop: ShiftsTimeRouteStopRow) {
  const siteFromDirect = stop.site;
  const siteFromJob = stop.site_job?.site ?? null;
  const site = siteFromDirect ?? siteFromJob;
  return {
    site_id: site?.id ?? null,
    site_code: site?.site_code ?? null,
    site_name: site?.name ?? null,
    job_code: stop.site_job?.job_code ?? null,
  };
}

function resolveRouteOwner(
  routeOwner: ShiftsTimeRouteRow['route_owner'],
): { id: string; staff_code: string | null; full_name: string | null } | null {
  if (Array.isArray(routeOwner)) return routeOwner[0] ?? null;
  return routeOwner ?? null;
}

type CoverageStatus = 'covered' | 'at_risk' | 'uncovered';

type TonightBoardStop = {
  id: string;
  route_id: string;
  stop_order: number;
  route_owner_staff_id: string | null;
  route_owner_name: string | null;
  route_owner_code: string | null;
  stop_status: string;
  status: string;
  planned_start_at: string | null;
  planned_end_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  site_id: string | null;
  site_code: string | null;
  site_name: string | null;
  job_code: string | null;
};

type SiteSummary = {
  site_id: string;
  site_code: string;
  site_name: string;
  total_stops: number;
  completed_stops: number;
  arrived_stops: number;
  pending_stops: number;
  skipped_stops: number;
  late_stops: number;
  coverage_status: CoverageStatus;
};

type RouteSummary = {
  route_id: string;
  route_date: string;
  route_status: string;
  route_owner_staff_id: string | null;
  route_owner_code: string | null;
  route_owner_name: string | null;
  stops: Array<{
    stop_id: string;
    stop_order: number;
    stop_status: string;
    planned_start_at: string | null;
    planned_end_at: string | null;
    site_id: string | null;
    site_code: string | null;
    site_name: string | null;
    job_code: string | null;
    primary_action: 'arrive' | 'complete';
  }>;
};

type CalloutSummary = {
  id: string;
  reason: string;
  status: string;
  reported_at: string;
  escalation_level: number;
  route_id: string | null;
  route_stop_id: string | null;
  affected_staff_id: string | null;
  affected_staff_name: string | null;
  covered_by_staff_id: string | null;
  covered_by_staff_name: string | null;
  site_id: string | null;
  site_code: string | null;
  site_name: string | null;
};

type CoverageCandidate = {
  staff_id: string;
  staff_code: string | null;
  full_name: string | null;
};

type PayrollMappingSummary = {
  id: string;
  template_name: string;
  provider_code: string | null;
  is_default: boolean;
};

type PayrollRunSummary = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  exported_at: string | null;
  mapping_name: string | null;
};

function toTonightBoardStop(
  stop: ShiftsTimeRouteStopRow,
  routeById: Map<string, ShiftsTimeRouteRow>,
): TonightBoardStop {
  const route = routeById.get(stop.route_id);
  const routeOwner = resolveRouteOwner(route?.route_owner ?? null);
  const site = toSiteDescriptor(stop);
  return {
    id: stop.id,
    route_id: stop.route_id,
    stop_order: Number(stop.stop_order ?? 0),
    route_owner_staff_id: route?.route_owner_staff_id ?? null,
    route_owner_name: routeOwner?.full_name ?? null,
    route_owner_code: routeOwner?.staff_code ?? null,
    stop_status: String(stop.stop_status ?? 'PENDING'),
    status: String(stop.status ?? 'PENDING'),
    planned_start_at: stop.planned_start_at ?? null,
    planned_end_at: stop.planned_end_at ?? null,
    arrived_at: stop.arrived_at ?? null,
    departed_at: stop.departed_at ?? null,
    site_id: site.site_id,
    site_code: site.site_code,
    site_name: site.site_name,
    job_code: site.job_code,
  };
}

function computeCoverageStatus(summary: Omit<SiteSummary, 'coverage_status'>): CoverageStatus {
  if (summary.total_stops === 0) return 'uncovered';
  if (summary.completed_stops + summary.arrived_stops >= summary.total_stops) return 'covered';
  if (summary.skipped_stops >= summary.total_stops) return 'uncovered';
  if (summary.late_stops > 0 && summary.completed_stops === 0 && summary.arrived_stops === 0) return 'uncovered';
  return 'at_risk';
}

function toActionForStop(stop: TonightBoardStop): 'arrive' | 'complete' {
  if (stop.stop_status === 'ARRIVED' || stop.status === 'IN_PROGRESS') return 'complete';
  return 'arrive';
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toRouteSummaries(routes: ShiftsTimeRouteRow[], stops: TonightBoardStop[]): RouteSummary[] {
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const grouped = new Map<string, RouteSummary>();

  for (const stop of stops) {
    const route = routeById.get(stop.route_id);
    if (!route) continue;
    const routeOwner = resolveRouteOwner(route.route_owner);
    if (!grouped.has(route.id)) {
      grouped.set(route.id, {
        route_id: route.id,
        route_date: route.route_date,
        route_status: route.status,
        route_owner_staff_id: route.route_owner_staff_id ?? null,
        route_owner_code: routeOwner?.staff_code ?? null,
        route_owner_name: routeOwner?.full_name ?? null,
        stops: [],
      });
    }

    grouped.get(route.id)!.stops.push({
      stop_id: stop.id,
      stop_order: stop.stop_order,
      stop_status: stop.stop_status,
      planned_start_at: stop.planned_start_at,
      planned_end_at: stop.planned_end_at,
      site_id: stop.site_id,
      site_code: stop.site_code,
      site_name: stop.site_name,
      job_code: stop.job_code,
      primary_action: toActionForStop(stop),
    });
  }

  return Array.from(grouped.values())
    .map((route) => ({
      ...route,
      stops: route.stops.sort((a, b) => a.stop_order - b.stop_order),
    }))
    .sort((a, b) => {
      const ownerA = a.route_owner_name ?? '';
      const ownerB = b.route_owner_name ?? '';
      const ownerDiff = ownerA.localeCompare(ownerB);
      if (ownerDiff !== 0) return ownerDiff;
      return a.route_id.localeCompare(b.route_id);
    });
}

function toCalloutSummary(row: ShiftsTimeCalloutEventRow): CalloutSummary {
  const affectedStaff = firstRelation(row.affected_staff);
  const coveredByStaff = firstRelation(row.covered_by_staff);
  const site = firstRelation(row.site);
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    reported_at: row.reported_at,
    escalation_level: row.escalation_level ?? 0,
    route_id: row.route_id,
    route_stop_id: row.route_stop_id,
    affected_staff_id: affectedStaff?.id ?? null,
    affected_staff_name: affectedStaff?.full_name ?? null,
    covered_by_staff_id: coveredByStaff?.id ?? null,
    covered_by_staff_name: coveredByStaff?.full_name ?? null,
    site_id: site?.id ?? null,
    site_code: site?.site_code ?? null,
    site_name: site?.name ?? null,
  };
}

function toCoverageCandidate(row: ShiftsTimeCoverageCandidateRow): CoverageCandidate {
  return {
    staff_id: row.id,
    staff_code: row.staff_code ?? null,
    full_name: row.full_name ?? null,
  };
}

function toPayrollMappingSummary(row: ShiftsTimePayrollMappingRow): PayrollMappingSummary {
  return {
    id: row.id,
    template_name: row.template_name,
    provider_code: row.provider_code ?? null,
    is_default: row.is_default,
  };
}

function toPayrollRunSummary(row: ShiftsTimePayrollRunRow): PayrollRunSummary {
  const mapping = Array.isArray(row.mapping) ? row.mapping[0] : row.mapping;
  return {
    id: row.id,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status,
    created_at: row.created_at,
    exported_at: row.exported_at ?? null,
    mapping_name: mapping?.template_name ?? null,
  };
}

function emptyTonightBoardPayload(date: string, pilotEnabled: boolean, myStaffId: string | null = null) {
  return {
    pilot_enabled: pilotEnabled,
    features: {
      route_execution: pilotEnabled,
      callout_automation: isCalloutEnabled(),
      payroll_export: isPayrollEnabled(),
    },
    date,
    my_staff_id: myStaffId,
    my_next_stop: null,
    route_summaries: [] as RouteSummary[],
    recent_callouts: [] as CalloutSummary[],
    coverage_candidates: [] as CoverageCandidate[],
    payroll_mappings: [] as PayrollMappingSummary[],
    payroll_runs: [] as PayrollRunSummary[],
    site_summaries: [],
    totals: { sites: 0, stops: 0, uncovered_sites: 0 },
  };
}

export async function startRouteStopRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  note: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcRouteStartStop(userDb, { route_stop_id: stopId, note });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function completeRouteStopRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  note: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcRouteCompleteStop(userDb, { route_stop_id: stopId, note });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function captureTravelSegmentRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    travel_end_at?: string;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcCaptureTravelSegment(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function reportCalloutRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    affected_staff_id: string;
    reason: string;
    route_id?: string | null;
    route_stop_id?: string | null;
    work_ticket_id?: string | null;
    site_id?: string | null;
    resolution_note?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canReportShiftsTimeCallout(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcReportCallout(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function offerCoverageRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    callout_event_id: string;
    candidate_staff_id: string;
    expires_in_minutes?: number;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canManageShiftsTimeCoverage(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcOfferCoverage(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function acceptCoverageRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  offerId: string,
  responseNote: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canRespondShiftsTimeCoverage(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcAcceptCoverage(userDb, {
    offer_id: offerId,
    response_note: responseNote,
  });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function previewPayrollExportRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    mapping_id: string;
    period_start: string;
    period_end: string;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isPayrollEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time payroll export is not enabled.') };
  }
  if (!canManageShiftsTimePayroll(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcGeneratePayrollPreview(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function finalizePayrollExportRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    run_id: string;
    exported_file_path?: string | null;
    exported_file_checksum?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isPayrollEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time payroll export is not enabled.') };
  }
  if (!canManageShiftsTimePayroll(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcFinalizePayrollExport(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function getTonightBoard(
  userDb: SupabaseClient,
  auth: AuthContext,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShiftsTimeRouteExecution(auth.roles) && !isManagerTier(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const pilotEnabled = isRouteExecutionEnabled();
  const today = toIsoDate(new Date());
  if (!pilotEnabled) {
    return {
      success: true,
      data: emptyTonightBoardPayload(today, false, null),
    };
  }

  const managerTier = isManagerTier(auth.roles);
  let staffId: string | null = null;

  if (!managerTier) {
    const staffResult = await findStaffIdByUserId(userDb, auth.userId);
    if (staffResult.error) {
      return { success: false, error: SYS_002(staffResult.error.message, apiPath) };
    }
    staffId = (staffResult.data as { id?: string | null } | null)?.id ?? null;

    // Never widen scope for field users when staff mapping is missing.
    if (!staffId) {
      return { success: true, data: emptyTonightBoardPayload(today, true, null) };
    }
  } else {
    const staffResult = await findStaffIdByUserId(userDb, auth.userId);
    if (!staffResult.error) {
      staffId = (staffResult.data as { id?: string | null } | null)?.id ?? null;
    }
  }

  const routesResult = await listRoutesForDate(userDb, today, managerTier ? null : staffId);
  if (routesResult.error) {
    return { success: false, error: SYS_002(routesResult.error.message, apiPath) };
  }

  const routes = (routesResult.data ?? []) as unknown as ShiftsTimeRouteRow[];
  const routeIds = routes.map((route) => route.id);
  const routeById = new Map(routes.map((route) => [route.id, route]));

  const stopsResult = await listRouteStopsByRouteIds(userDb, routeIds);
  if (stopsResult.error) {
    return { success: false, error: SYS_002(stopsResult.error.message, apiPath) };
  }

  const allStops = ((stopsResult.data ?? []) as ShiftsTimeRouteStopRow[]).map((stop) => toTonightBoardStop(stop, routeById));

  const now = new Date();
  const summariesBySite = new Map<string, Omit<SiteSummary, 'coverage_status'>>();
  for (const stop of allStops) {
    const siteId = stop.site_id ?? `unknown:${stop.id}`;
    if (!summariesBySite.has(siteId)) {
      summariesBySite.set(siteId, {
        site_id: siteId,
        site_code: stop.site_code ?? '--',
        site_name: stop.site_name ?? stop.site_code ?? stop.job_code ?? '--',
        total_stops: 0,
        completed_stops: 0,
        arrived_stops: 0,
        pending_stops: 0,
        skipped_stops: 0,
        late_stops: 0,
      });
    }

    const summary = summariesBySite.get(siteId)!;
    summary.total_stops += 1;

    if (stop.stop_status === 'COMPLETED' || stop.status === 'COMPLETED') {
      summary.completed_stops += 1;
      continue;
    }

    if (stop.stop_status === 'ARRIVED' || stop.status === 'IN_PROGRESS') {
      summary.arrived_stops += 1;
      continue;
    }

    if (stop.stop_status === 'SKIPPED' || stop.status === 'SKIPPED') {
      summary.skipped_stops += 1;
      continue;
    }

    summary.pending_stops += 1;
    const plannedStart = parseIsoDate(stop.planned_start_at);
    if (plannedStart && plannedStart < now) {
      summary.late_stops += 1;
    }
  }

  const siteSummaries = Array.from(summariesBySite.values())
    .map((summary) => ({ ...summary, coverage_status: computeCoverageStatus(summary) }))
    .sort((a, b) => {
      const severity = { uncovered: 0, at_risk: 1, covered: 2 } as const;
      const severityDiff = severity[a.coverage_status] - severity[b.coverage_status];
      if (severityDiff !== 0) return severityDiff;
      return a.site_name.localeCompare(b.site_name);
    });

  const myNextStopCandidates = (staffId
    ? allStops.filter((stop) => stop.route_owner_staff_id === staffId)
    : []
  )
    .filter((stop) => stop.stop_status !== 'COMPLETED' && stop.stop_status !== 'SKIPPED')
    .sort((a, b) => {
      const aStart = parseIsoDate(a.planned_start_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bStart = parseIsoDate(b.planned_start_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aStart !== bStart) return aStart - bStart;
      return a.stop_order - b.stop_order;
    });

  const myNextStop = myNextStopCandidates[0]
    ? {
      stop_id: myNextStopCandidates[0].id,
      route_id: myNextStopCandidates[0].route_id,
      stop_order: myNextStopCandidates[0].stop_order,
      stop_status: myNextStopCandidates[0].stop_status,
      planned_start_at: myNextStopCandidates[0].planned_start_at,
      planned_end_at: myNextStopCandidates[0].planned_end_at,
      site_id: myNextStopCandidates[0].site_id,
      site_code: myNextStopCandidates[0].site_code,
      site_name: myNextStopCandidates[0].site_name,
      job_code: myNextStopCandidates[0].job_code,
      primary_action: toActionForStop(myNextStopCandidates[0]),
    }
    : null;

  let recentCallouts: CalloutSummary[] = [];
  let coverageCandidates: CoverageCandidate[] = [];
  if (isCalloutEnabled()) {
    const [calloutsResult, candidatesResult] = await Promise.all([
      listRecentCalloutEvents(userDb, managerTier ? 50 : 10, managerTier ? null : staffId),
      managerTier ? listCoverageCandidates(userDb, 250) : Promise.resolve({ data: [], error: null }),
    ]);

    if (!calloutsResult.error) {
      recentCallouts = ((calloutsResult.data ?? []) as ShiftsTimeCalloutEventRow[]).map(toCalloutSummary);
    }

    if (!candidatesResult.error) {
      coverageCandidates = ((candidatesResult.data ?? []) as ShiftsTimeCoverageCandidateRow[]).map(toCoverageCandidate);
    }
  }

  let payrollMappings: PayrollMappingSummary[] = [];
  let payrollRuns: PayrollRunSummary[] = [];
  if (managerTier && isPayrollEnabled()) {
    const [mappingsResult, runsResult] = await Promise.all([
      listActivePayrollMappings(userDb, 50),
      listRecentPayrollRuns(userDb, 20),
    ]);

    if (!mappingsResult.error) {
      payrollMappings = ((mappingsResult.data ?? []) as ShiftsTimePayrollMappingRow[]).map(toPayrollMappingSummary);
    }

    if (!runsResult.error) {
      payrollRuns = ((runsResult.data ?? []) as ShiftsTimePayrollRunRow[]).map(toPayrollRunSummary);
    }
  }

  const routeSummaries = toRouteSummaries(routes, allStops);

  return {
    success: true,
    data: {
      pilot_enabled: true,
      features: {
        route_execution: true,
        callout_automation: isCalloutEnabled(),
        payroll_export: isPayrollEnabled(),
      },
      date: today,
      my_staff_id: staffId,
      my_next_stop: myNextStop,
      route_summaries: routeSummaries,
      recent_callouts: recentCallouts,
      coverage_candidates: coverageCandidates,
      payroll_mappings: payrollMappings,
      payroll_runs: payrollRuns,
      site_summaries: siteSummaries,
      totals: {
        sites: siteSummaries.length,
        stops: allStops.length,
        uncovered_sites: siteSummaries.filter((site) => site.coverage_status === 'uncovered').length,
      },
    },
  };
}
