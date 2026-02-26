import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_002,
  SYS_002,
  createProblemDetails,
  type NightBridgeDetail,
  type NightBridgeIssue,
  type NightBridgeReviewInput,
  type NightBridgeReviewResult,
  type NightBridgeReviewStatus,
  type NightBridgeSummaryItem,
  type NightBridgeUrgency,
  type ShiftSummary,
} from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  currentStaffId,
  findFirstRouteStopForSiteJobs,
  getNightBridgeSummaryByRoute,
  getRouteById,
  getSiteById,
  insertRouteStopTask,
  listNightBridgeSummaries,
  listRouteStopTasks,
  listRouteStops,
  listRoutesForDate,
  listSiteJobsForSite,
  nextTaskOrder,
  updateRouteReview,
} from './night-bridge.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const NIGHT_BRIDGE_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;

type NightBridgeSummaryRow = {
  route_id: string;
  tenant_id: string;
  route_date: string;
  route_status: string;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  mileage_start: number | string | null;
  mileage_end: number | string | null;
  shift_summary: unknown;
  shift_review_status: NightBridgeReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  floater_name: string | null;
  floater_code: string | null;
  vehicle_name: string | null;
  vehicle_code: string | null;
  stops_completed: number | string | null;
  stops_skipped: number | string | null;
  stops_total: number | string | null;
  photos_uploaded: number | string | null;
};

function canReadNightBridge(roles: string[]) {
  return hasAnyRole(roles, NIGHT_BRIDGE_ROLES);
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function yesterdayDateKey() {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  return day.toISOString().slice(0, 10);
}

function tomorrowDateKey(baseDate: string) {
  const day = new Date(`${baseDate}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function normalizeShiftSummary(raw: unknown): ShiftSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  return {
    stops_completed: toNumber(value.stops_completed),
    stops_skipped: toNumber(value.stops_skipped),
    stops_total: toNumber(value.stops_total),
    issues_reported: toNumber(value.issues_reported),
    photos_uploaded: toNumber(value.photos_uploaded),
    mileage_driven: value.mileage_driven == null ? null : toNumber(value.mileage_driven),
    floater_notes: typeof value.floater_notes === 'string' ? value.floater_notes : null,
    complaints_addressed: toNumber(value.complaints_addressed),
  };
}

function summaryIssuesCount(shiftSummary: ShiftSummary | null, stopsSkipped: number) {
  const base = shiftSummary?.issues_reported ?? 0;
  return Math.max(base, stopsSkipped);
}

function summaryUrgency(
  stopsSkipped: number,
  issuesCount: number,
  hasNotes: boolean,
): NightBridgeUrgency {
  if (stopsSkipped > 0) return 'RED';
  if (issuesCount > 0 || hasNotes) return 'YELLOW';
  return 'GREEN';
}

function mapSummaryRow(row: NightBridgeSummaryRow): NightBridgeSummaryItem {
  const shiftSummary = normalizeShiftSummary(row.shift_summary);
  const stopsSkipped = toNumber(row.stops_skipped);
  const issuesCount = summaryIssuesCount(shiftSummary, stopsSkipped);
  const floaterNotes = shiftSummary?.floater_notes?.trim() ?? '';

  return {
    route_id: row.route_id,
    tenant_id: row.tenant_id,
    route_date: row.route_date,
    route_status: row.route_status,
    shift_started_at: row.shift_started_at,
    shift_ended_at: row.shift_ended_at,
    mileage_start: row.mileage_start == null ? null : toNumber(row.mileage_start),
    mileage_end: row.mileage_end == null ? null : toNumber(row.mileage_end),
    shift_summary: shiftSummary,
    shift_review_status: row.shift_review_status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    reviewer_notes: row.reviewer_notes,
    floater_name: row.floater_name,
    floater_code: row.floater_code,
    vehicle_name: row.vehicle_name,
    vehicle_code: row.vehicle_code,
    stops_completed: toNumber(row.stops_completed),
    stops_skipped: stopsSkipped,
    stops_total: toNumber(row.stops_total),
    photos_uploaded: toNumber(row.photos_uploaded),
    issues_count: issuesCount,
    urgency: summaryUrgency(stopsSkipped, issuesCount, floaterNotes.length > 0),
  };
}

function mapSkipReason(reason: string | null) {
  if (!reason) return 'Skipped stop';
  switch (reason) {
    case 'SITE_CLOSED':
      return 'Site closed';
    case 'ACCESS_ISSUE':
      return 'Access issue';
    case 'TIME_CONSTRAINT':
      return 'Time constraint';
    default:
      return 'Skipped stop';
  }
}

export async function getNightBridgeSummaries(
  userDb: SupabaseClient,
  auth: AuthContext,
  filters: { date?: string | null; status?: NightBridgeReviewStatus | null },
  apiPath: string,
): Promise<ServiceResult<NightBridgeSummaryItem[]>> {
  if (!canReadNightBridge(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const targetDate = filters.date ?? yesterdayDateKey();
  const { data, error } = await listNightBridgeSummaries(
    userDb,
    auth.tenantId,
    targetDate,
    filters.status ?? null,
  );

  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  const rows = (data ?? []) as NightBridgeSummaryRow[];
  return { success: true, data: rows.map(mapSummaryRow) };
}

export async function getNightBridgeDetail(
  userDb: SupabaseClient,
  auth: AuthContext,
  routeId: string,
  apiPath: string,
): Promise<ServiceResult<NightBridgeDetail>> {
  if (!canReadNightBridge(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const summaryResult = await getNightBridgeSummaryByRoute(userDb, auth.tenantId, routeId);
  if (summaryResult.error) {
    return { success: false, error: SYS_002(summaryResult.error.message, apiPath) };
  }
  if (!summaryResult.data) {
    return {
      success: false,
      error: createProblemDetails(
        'BRIDGE_001',
        'Shift summary not found',
        404,
        'The requested route shift summary was not found',
        apiPath,
      ),
    };
  }

  const stopsResult = await listRouteStops(userDb, routeId);
  if (stopsResult.error) {
    return { success: false, error: SYS_002(stopsResult.error.message, apiPath) };
  }

  const stopRows = (stopsResult.data ?? []) as Array<{
    id: string;
    stop_order: number | string | null;
    stop_status: 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
    arrived_at: string | null;
    departed_at: string | null;
    skip_reason: string | null;
    skip_notes: string | null;
    site_job?: { site?: { id?: string | null; site_code?: string | null; name?: string | null } | null } | null;
  }>;

  const stopIds = stopRows.map((stop) => stop.id);
  const tasksResult = await listRouteStopTasks(userDb, stopIds);
  if (tasksResult.error) {
    return { success: false, error: SYS_002(tasksResult.error.message, apiPath) };
  }

  const taskRows = (tasksResult.data ?? []) as Array<{
    id: string;
    route_stop_id: string;
    task_type: string;
    description: string | null;
    task_order: number | string | null;
    is_completed: boolean | null;
    evidence_required: boolean | null;
    evidence_photos: unknown;
    notes: string | null;
    delivery_items: unknown;
    source_complaint_id: string | null;
  }>;

  const tasksByStopId = new Map<string, typeof taskRows>();
  for (const task of taskRows) {
    if (!tasksByStopId.has(task.route_stop_id)) {
      tasksByStopId.set(task.route_stop_id, []);
    }
    tasksByStopId.get(task.route_stop_id)!.push(task);
  }

  const issues: NightBridgeIssue[] = [];
  const stops = stopRows.map((stop) => {
    const siteName = stop.site_job?.site?.name?.trim() || 'Unknown site';
    const tasks = (tasksByStopId.get(stop.id) ?? []).map((task) => {
      const evidencePhotos = Array.isArray(task.evidence_photos)
        ? (task.evidence_photos as string[])
        : [];
      const notes = task.notes?.trim() || null;
      const isCompleted = !!task.is_completed;

      if (!isCompleted) {
        issues.push({
          type: 'INCOMPLETE_TASK',
          stop_id: stop.id,
          stop_order: toNumber(stop.stop_order),
          site_name: siteName,
          message: `Incomplete task: ${task.description ?? 'Task'}`,
          task_id: task.id,
        });
      }

      if (notes) {
        issues.push({
          type: 'TASK_NOTE',
          stop_id: stop.id,
          stop_order: toNumber(stop.stop_order),
          site_name: siteName,
          message: notes,
          task_id: task.id,
        });
      }

      return {
        id: task.id,
        task_type: task.task_type,
        description: task.description ?? 'Task',
        task_order: toNumber(task.task_order),
        is_completed: isCompleted,
        evidence_required: !!task.evidence_required,
        evidence_photos: evidencePhotos,
        notes,
        delivery_items: Array.isArray(task.delivery_items) ? task.delivery_items : null,
        source_complaint_id: task.source_complaint_id,
      };
    }).sort((a, b) => a.task_order - b.task_order);

    if (stop.stop_status === 'SKIPPED') {
      issues.push({
        type: 'SKIPPED_STOP',
        stop_id: stop.id,
        stop_order: toNumber(stop.stop_order),
        site_name: siteName,
        message: stop.skip_notes?.trim() || mapSkipReason(stop.skip_reason),
        task_id: null,
      });
    }

    return {
      id: stop.id,
      stop_order: toNumber(stop.stop_order),
      stop_status: stop.stop_status,
      arrived_at: stop.arrived_at,
      departed_at: stop.departed_at,
      skip_reason: (stop.skip_reason as 'SITE_CLOSED' | 'ACCESS_ISSUE' | 'TIME_CONSTRAINT' | 'OTHER' | null) ?? null,
      skip_notes: stop.skip_notes,
      site_id: stop.site_job?.site?.id ?? null,
      site_code: stop.site_job?.site?.site_code ?? null,
      site_name: siteName,
      tasks_total: tasks.length,
      tasks_completed: tasks.filter((task) => task.is_completed).length,
      photos_uploaded: tasks.reduce((count, task) => count + task.evidence_photos.length, 0),
      tasks,
    };
  });

  const summary = mapSummaryRow(summaryResult.data as NightBridgeSummaryRow);
  const floaterNotes = summary.shift_summary?.floater_notes ?? null;
  const issuesCount = Math.max(summary.issues_count, issues.length);
  const hasNotes = !!floaterNotes?.trim();

  const detail: NightBridgeDetail = {
    summary: {
      ...summary,
      issues_count: issuesCount,
      urgency: summaryUrgency(summary.stops_skipped, issuesCount, hasNotes),
    },
    stops,
    issues: issues.sort((a, b) => a.stop_order - b.stop_order || a.message.localeCompare(b.message)),
    floater_notes: floaterNotes,
  };

  return { success: true, data: detail };
}

export async function reviewNightBridgeShift(
  userDb: SupabaseClient,
  auth: AuthContext,
  routeId: string,
  payload: NightBridgeReviewInput,
  apiPath: string,
): Promise<ServiceResult<NightBridgeReviewResult>> {
  if (!canReadNightBridge(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const routeResult = await getRouteById(userDb, routeId);
  if (routeResult.error) {
    return { success: false, error: SYS_002(routeResult.error.message, apiPath) };
  }
  if (!routeResult.data) {
    return {
      success: false,
      error: createProblemDetails('BRIDGE_002', 'Route not found', 404, 'Route was not found', apiPath),
    };
  }

  if ((routeResult.data as { status?: string }).status !== 'COMPLETED') {
    return {
      success: false,
      error: createProblemDetails(
        'BRIDGE_003',
        'Route not completed',
        409,
        'Night Bridge reviews are only available for completed routes',
        apiPath,
      ),
    };
  }

  let injectedTask: NightBridgeReviewResult['injected_task'] = null;
  const addToTomorrow = payload.add_to_tomorrow ?? null;
  if (addToTomorrow) {
    const siteJobsResult = await listSiteJobsForSite(userDb, addToTomorrow.site_id);
    if (siteJobsResult.error) {
      return { success: false, error: SYS_002(siteJobsResult.error.message, apiPath) };
    }

    const siteJobIds = ((siteJobsResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
    if (siteJobIds.length === 0) {
      return {
        success: false,
        error: createProblemDetails(
          'BRIDGE_004',
          'No job found for site',
          404,
          'No active site jobs were found for the selected site',
          apiPath,
        ),
      };
    }

    const tomorrowDate = tomorrowDateKey((routeResult.data as { route_date: string }).route_date);
    const tomorrowRoutesResult = await listRoutesForDate(userDb, auth.tenantId, tomorrowDate);
    if (tomorrowRoutesResult.error) {
      return { success: false, error: SYS_002(tomorrowRoutesResult.error.message, apiPath) };
    }

    const tomorrowRoutes = (tomorrowRoutesResult.data ?? []) as Array<{ id: string; route_date: string }>;
    const tomorrowRouteIds = tomorrowRoutes.map((route) => route.id);
    if (tomorrowRouteIds.length === 0) {
      return {
        success: false,
        error: createProblemDetails(
          'BRIDGE_005',
          'No route available tomorrow',
          409,
          'No route exists for tomorrow to inject this follow-up task',
          apiPath,
        ),
      };
    }

    const stopResult = await findFirstRouteStopForSiteJobs(userDb, tomorrowRouteIds, siteJobIds);
    if (stopResult.error) {
      return { success: false, error: SYS_002(stopResult.error.message, apiPath) };
    }
    if (!stopResult.data) {
      return {
        success: false,
        error: createProblemDetails(
          'BRIDGE_006',
          'Site not on tomorrow route',
          404,
          'No stop for this site was found on tomorrow routes',
          apiPath,
        ),
      };
    }

    const stop = stopResult.data as { id: string; route_id: string; stop_order: number };
    const taskOrder = await nextTaskOrder(userDb, stop.id);
    const insertedTask = await insertRouteStopTask(userDb, {
      tenant_id: auth.tenantId,
      route_stop_id: stop.id,
      task_type: 'CUSTOM',
      description: addToTomorrow.description,
      task_order: taskOrder,
      is_completed: false,
      evidence_required: !!addToTomorrow.evidence_required,
      evidence_photos: null,
      notes: null,
      delivery_items: null,
      is_from_template: false,
      source_complaint_id: null,
    });

    if (insertedTask.error || !insertedTask.data) {
      return {
        success: false,
        error: SYS_002(insertedTask.error?.message ?? 'Failed to inject follow-up task', apiPath),
      };
    }

    const siteMeta = await getSiteById(userDb, addToTomorrow.site_id);
    const siteName = (siteMeta.data as { name?: string } | null)?.name ?? 'Site';
    const routeDate = tomorrowRoutes.find((route) => route.id === stop.route_id)?.route_date ?? tomorrowDate;

    injectedTask = {
      route_id: stop.route_id,
      route_stop_id: stop.id,
      task_id: (insertedTask.data as { id: string }).id,
      route_date: routeDate,
      stop_order: stop.stop_order,
      site_id: addToTomorrow.site_id,
      site_name: siteName,
    };
  }

  const reviewerStaffId = await currentStaffId(userDb, auth.userId);
  const updateResult = await updateRouteReview(userDb, routeId, {
    shift_review_status: payload.shift_review_status,
    reviewer_notes: payload.reviewer_notes ?? null,
    reviewed_by: reviewerStaffId,
    reviewed_at: new Date().toISOString(),
  });

  if (updateResult.error || !updateResult.data) {
    return {
      success: false,
      error: SYS_002(updateResult.error?.message ?? 'Failed to update review status', apiPath),
    };
  }

  const updated = updateResult.data as {
    id: string;
    shift_review_status: NightBridgeReviewStatus;
    reviewed_at: string | null;
    reviewer_notes: string | null;
  };

  return {
    success: true,
    data: {
      route_id: updated.id,
      shift_review_status: updated.shift_review_status,
      reviewed_at: updated.reviewed_at,
      reviewer_notes: updated.reviewer_notes,
      injected_task: injectedTask,
    },
  };
}
