import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_002, SYS_002, createProblemDetails } from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  archiveRouteTemplate,
  archiveRouteTemplateStops,
  archiveRouteTemplateTasksByTemplate,
  currentStaffId,
  generateDailyRoutes,
  getRouteById,
  getRouteStopById,
  getRouteStopSupplyContext,
  getRouteStopTaskById,
  getRouteTemplateById,
  getRouteTemplateStopById,
  getRouteTemplateTaskById,
  insertRouteTemplate,
  insertSiteSupplyCosts,
  insertRouteTemplateStop,
  insertRouteTemplateTask,
  listSupplyUnitCosts,
  listRouteTemplates,
  nextSiteSupplyCostCode,
  updateRoute,
  updateRouteStop,
  updateRouteStopTask,
  updateRouteTemplate,
  updateRouteTemplateStop,
  updateRouteTemplateTask,
} from './route-templates.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const TEMPLATE_MANAGER_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;
const SHIFT_OPERATOR_ROLES = ['SUPERVISOR', 'CLEANER'] as const;
const PERIODIC_CODE_PREFIX = /^(PER-\d{4,}):/i;
type DeliveryItem = {
  supply_id: string;
  quantity: number;
  direction: string;
};

function canManageTemplates(roles: string[]) {
  return hasAnyRole(roles, TEMPLATE_MANAGER_ROLES);
}

function canOperateShift(roles: string[]) {
  return hasAnyRole(roles, SHIFT_OPERATOR_ROLES);
}

function conflict(instance: string, detail: string) {
  return createProblemDetails('SYS_003', 'Conflict', 409, detail, instance);
}

function normalizeTemplateGraph(data: Record<string, unknown>) {
  const stopsRaw = Array.isArray(data.stops) ? (data.stops as Record<string, unknown>[]) : [];
  const stops = stopsRaw
    .filter((stop) => !stop.archived_at)
    .map((stop): Record<string, unknown> & {
      tasks: Record<string, unknown>[];
      stop_order?: number;
    } => {
      const tasksRaw = Array.isArray(stop.tasks) ? (stop.tasks as Record<string, unknown>[]) : [];
      const tasks = tasksRaw
        .filter((task) => !task.archived_at)
        .sort((a, b) => Number(a.task_order ?? 0) - Number(b.task_order ?? 0));

      return {
        ...stop,
        tasks,
      };
    })
    .sort((a, b) => Number(a.stop_order ?? 0) - Number(b.stop_order ?? 0));

  return {
    ...data,
    stops,
  };
}

function normalizeDeliveryItems(value: unknown): DeliveryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      const supplyId = typeof row.supply_id === 'string' ? row.supply_id : '';
      const quantity = Number(row.quantity ?? 0);
      const direction = typeof row.direction === 'string' ? row.direction.toLowerCase() : '';
      return { supply_id: supplyId, quantity, direction };
    })
    .filter((item) => item.supply_id && Number.isFinite(item.quantity) && item.quantity > 0)
    .filter((item) => item.direction !== 'pickup');
}

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function logDeliveryCostsForTask(
  db: SupabaseClient,
  routeStopId: string,
  deliveryItemsRaw: unknown,
) {
  const deliveryItems = normalizeDeliveryItems(deliveryItemsRaw);
  if (deliveryItems.length === 0) return;

  const { data: context, error: contextError } = await getRouteStopSupplyContext(db, routeStopId);
  if (contextError || !context) return;

  const contextRow = context as {
    route_id?: string;
    site_job?: { site_id?: string } | null;
    route?: { tenant_id?: string; route_date?: string | null } | null;
  };

  const tenantId = contextRow.route?.tenant_id;
  const routeId = contextRow.route_id;
  const siteId = contextRow.site_job?.site_id;
  if (!tenantId || !routeId || !siteId) return;

  const uniqueSupplyIds = Array.from(new Set(deliveryItems.map((item) => item.supply_id)));
  const { data: supplyRows, error: supplyError } = await listSupplyUnitCosts(db, uniqueSupplyIds);
  if (supplyError) return;

  const unitCostBySupplyId = new Map<string, number>();
  for (const row of (supplyRows ?? []) as Array<{ id: string; unit_cost: number | null }>) {
    unitCostBySupplyId.set(row.id, Number(row.unit_cost ?? 0));
  }

  const deliveryDate = contextRow.route?.route_date
    ? String(contextRow.route.route_date)
    : new Date().toISOString().slice(0, 10);

  const rows: Record<string, unknown>[] = [];
  for (const item of deliveryItems) {
    if (!unitCostBySupplyId.has(item.supply_id)) continue;
    const unitCost = Number(unitCostBySupplyId.get(item.supply_id) ?? 0);
    const quantity = Math.max(1, Math.floor(item.quantity));
    const totalCost = toMoney(quantity * unitCost);

    const codeRes = await nextSiteSupplyCostCode(db, tenantId);
    if (codeRes.error || typeof codeRes.data !== 'string') continue;

    rows.push({
      tenant_id: tenantId,
      cost_code: codeRes.data,
      site_id: siteId,
      supply_id: item.supply_id,
      delivery_date: deliveryDate,
      quantity,
      unit_cost: toMoney(unitCost),
      total_cost: totalCost,
      source: 'DELIVERY',
      route_id: routeId,
    });
  }

  if (rows.length > 0) {
    await insertSiteSupplyCosts(db, rows);
  }
}

async function nextTemplateCode(
  db: SupabaseClient,
  tenantId: string,
  weekday: string,
): Promise<string> {
  const { count, error } = await db
    .from('route_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('weekday', weekday)
    .is('archived_at', null);

  if (error) {
    throw new Error(error.message);
  }

  const next = (count ?? 0) + 1;
  return `RT-${weekday}-${String(next).padStart(3, '0')}`;
}

export async function getRouteTemplates(
  userDb: SupabaseClient,
  auth: AuthContext,
  weekday: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const normalizedWeekday = weekday ? weekday.toUpperCase() : null;
  const { data, error } = await listRouteTemplates(userDb, normalizedWeekday);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const stops = Array.isArray(row.stops) ? (row.stops as Array<{ archived_at?: string | null }>) : [];
    return {
      ...row,
      stop_count: stops.filter((stop) => !stop.archived_at).length,
    };
  });

  return { success: true, data: rows };
}

export async function createRouteTemplate(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  try {
    const templateCode = await nextTemplateCode(userDb, auth.tenantId, String(payload.weekday));
    const insertPayload = {
      tenant_id: auth.tenantId,
      template_code: templateCode,
      label: payload.label,
      weekday: payload.weekday,
      assigned_staff_id: payload.assigned_staff_id,
      default_vehicle_id: payload.default_vehicle_id,
      default_key_box: payload.default_key_box,
      is_active: payload.is_active,
      notes: payload.notes,
    };

    const { data, error } = await insertRouteTemplate(userDb, insertPayload);
    if (error || !data) {
      return {
        success: false,
        error: SYS_002(error?.message ?? 'Failed to create route template', apiPath),
      };
    }

    return { success: true, data, status: 201 };
  } catch (error) {
    return {
      success: false,
      error: SYS_002(error instanceof Error ? error.message : 'Failed to create route template', apiPath),
    };
  }
}

export async function getRouteTemplate(
  userDb: SupabaseClient,
  auth: AuthContext,
  templateId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await getRouteTemplateById(userDb, templateId);
  if (error || !data) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_001', 'Route template not found', 404, 'Template was not found', apiPath),
    };
  }

  return { success: true, data: normalizeTemplateGraph(data as unknown as Record<string, unknown>) };
}

export async function patchRouteTemplate(
  userDb: SupabaseClient,
  auth: AuthContext,
  templateId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { version_etag, ...changes } = payload;
  const updatePayload = {
    ...changes,
    version_etag: crypto.randomUUID(),
  };

  const { data, error } = await updateRouteTemplate(userDb, templateId, updatePayload, String(version_etag));
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }
  if (!data) {
    return { success: false, error: conflict(apiPath, 'Template was modified by another user. Refresh and retry.') };
  }

  return { success: true, data };
}

export async function archiveRouteTemplateById(
  userDb: SupabaseClient,
  auth: AuthContext,
  templateId: string,
  reason: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const archiveReason = reason.trim() || 'Archived via route template API';
  const archived = await archiveRouteTemplate(userDb, templateId, auth.userId, archiveReason);

  if (archived.error || !archived.data) {
    return {
      success: false,
      error: SYS_002(archived.error?.message ?? 'Failed to archive route template', apiPath),
    };
  }

  await archiveRouteTemplateTasksByTemplate(userDb, templateId, auth.userId, archiveReason);
  await archiveRouteTemplateStops(userDb, templateId, auth.userId, archiveReason);

  return { success: true, data: archived.data };
}

export async function addRouteTemplateStop(
  userDb: SupabaseClient,
  auth: AuthContext,
  templateId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: template, error: templateError } = await getRouteTemplateById(userDb, templateId);
  if (templateError || !template) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_001', 'Route template not found', 404, 'Template was not found', apiPath),
    };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    template_id: templateId,
    site_job_id: payload.site_job_id,
    stop_order: payload.stop_order,
    access_window_start: payload.access_window_start,
    access_window_end: payload.access_window_end,
    notes: payload.notes,
  };

  const { data, error } = await insertRouteTemplateStop(userDb, insertPayload);
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to add template stop', apiPath),
    };
  }

  return { success: true, data, status: 201 };
}

export async function patchRouteTemplateStop(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: stop, error: stopError } = await getRouteTemplateStopById(userDb, stopId);
  if (stopError || !stop) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_002', 'Route template stop not found', 404, 'Stop was not found', apiPath),
    };
  }

  const { version_etag, ...changes } = payload;
  const updatePayload = {
    ...changes,
    version_etag: crypto.randomUUID(),
  };

  const { data, error } = await updateRouteTemplateStop(userDb, stopId, updatePayload, String(version_etag));
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }
  if (!data) {
    return { success: false, error: conflict(apiPath, 'Stop was modified by another user. Refresh and retry.') };
  }

  return { success: true, data };
}

export async function addRouteTemplateTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: stop, error: stopError } = await getRouteTemplateStopById(userDb, stopId);
  if (stopError || !stop) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_002', 'Route template stop not found', 404, 'Stop was not found', apiPath),
    };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    template_stop_id: stopId,
    task_type: payload.task_type,
    description_key: payload.description_key,
    description_override: payload.description_override,
    task_order: payload.task_order,
    evidence_required: payload.evidence_required,
    delivery_items: payload.delivery_items,
  };

  const { data, error } = await insertRouteTemplateTask(userDb, insertPayload);
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to add template task', apiPath),
    };
  }

  return { success: true, data, status: 201 };
}

export async function patchRouteTemplateTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  taskId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: task, error: taskError } = await getRouteTemplateTaskById(userDb, taskId);
  if (taskError || !task) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_003', 'Route template task not found', 404, 'Task was not found', apiPath),
    };
  }

  const { version_etag, ...changes } = payload;
  const updatePayload = {
    ...changes,
    version_etag: crypto.randomUUID(),
  };

  const { data, error } = await updateRouteTemplateTask(userDb, taskId, updatePayload, String(version_etag));
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }
  if (!data) {
    return { success: false, error: conflict(apiPath, 'Task was modified by another user. Refresh and retry.') };
  }

  return { success: true, data };
}

export async function generateRoutesForDate(
  userDb: SupabaseClient,
  auth: AuthContext,
  targetDate: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageTemplates(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await generateDailyRoutes(userDb, auth.tenantId, targetDate);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data: data ?? [] };
}

export async function startShift(
  userDb: SupabaseClient,
  auth: AuthContext,
  routeId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: route, error: routeError } = await getRouteById(userDb, routeId);
  if (routeError || !route) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_004', 'Route not found', 404, 'Route was not found', apiPath),
    };
  }

  if ((route as { shift_started_at?: string | null }).shift_started_at) {
    return {
      success: false,
      error: conflict(apiPath, 'Shift has already started for this route.'),
    };
  }

  const staffId = await currentStaffId(userDb, auth.userId);
  const updatePayload: Record<string, unknown> = {
    mileage_start: payload.mileage_start,
    key_box_number: payload.key_box_number,
    shift_started_at: new Date().toISOString(),
  };

  if (staffId) {
    updatePayload.route_owner_staff_id = staffId;
  }

  const { data, error } = await updateRoute(userDb, routeId, updatePayload);
  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to start shift', apiPath) };
  }

  return { success: true, data };
}

export async function endShift(
  userDb: SupabaseClient,
  auth: AuthContext,
  routeId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: route, error: routeError } = await getRouteById(userDb, routeId);
  if (routeError || !route) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_004', 'Route not found', 404, 'Route was not found', apiPath),
    };
  }

  const mileageStart = Number((route as { mileage_start?: number | null }).mileage_start ?? 0);
  const mileageEnd = Number(payload.mileage_end ?? 0);

  if (mileageStart > 0 && mileageEnd < mileageStart) {
    return {
      success: false,
      error: createProblemDetails(
        'ROUTE_005',
        'Invalid mileage',
        400,
        'Ending mileage cannot be lower than starting mileage.',
        apiPath,
      ),
    };
  }

  const { data: stops, error: stopsError } = await userDb
    .from('route_stops')
    .select('id, stop_status')
    .eq('route_id', routeId)
    .is('archived_at', null);

  if (stopsError) {
    return { success: false, error: SYS_002(stopsError.message, apiPath) };
  }

  const stopRows = (stops ?? []) as Array<{ id: string; stop_status: string }>;
  const stopIds = stopRows.map((stop) => stop.id);
  let taskRows: Array<{ is_completed: boolean; evidence_photos: string[] | null }> = [];

  if (stopIds.length > 0) {
    const { data: tasks, error: tasksError } = await userDb
      .from('route_stop_tasks')
      .select('is_completed, evidence_photos')
      .in('route_stop_id', stopIds)
      .is('archived_at', null);

    if (tasksError) {
      return { success: false, error: SYS_002(tasksError.message, apiPath) };
    }

    taskRows = (tasks ?? []) as Array<{ is_completed: boolean; evidence_photos: string[] | null }>;
  }

  const photosUploaded = taskRows.reduce((sum, task) => sum + (Array.isArray(task.evidence_photos) ? task.evidence_photos.length : 0), 0);

  const summary = {
    stops_completed: stopRows.filter((stop) => stop.stop_status === 'COMPLETED').length,
    stops_skipped: stopRows.filter((stop) => stop.stop_status === 'SKIPPED').length,
    stops_total: stopRows.length,
    issues_reported: 0,
    photos_uploaded: photosUploaded,
    mileage_driven: mileageStart > 0 ? mileageEnd - mileageStart : null,
    floater_notes: (payload.floater_notes as string | null) ?? null,
    complaints_addressed: 0,
  };

  const { data, error } = await updateRoute(userDb, routeId, {
    mileage_end: payload.mileage_end,
    vehicle_cleaned: payload.vehicle_cleaned,
    personal_items_removed: payload.personal_items_removed,
    shift_ended_at: new Date().toISOString(),
    shift_summary: summary,
    status: 'COMPLETED',
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to end shift', apiPath) };
  }

  return {
    success: true,
    data: {
      route: data,
      summary,
    },
  };
}

export async function arriveAtStop(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: stop, error: stopError } = await getRouteStopById(userDb, stopId);
  if (stopError || !stop) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_006', 'Route stop not found', 404, 'Stop was not found', apiPath),
    };
  }

  const { data, error } = await updateRouteStop(userDb, stopId, {
    stop_status: 'ARRIVED',
    arrived_at: new Date().toISOString(),
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to mark stop as arrived', apiPath) };
  }

  return { success: true, data };
}

export async function completeStop(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: stop, error: stopError } = await getRouteStopById(userDb, stopId);
  if (stopError || !stop) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_006', 'Route stop not found', 404, 'Stop was not found', apiPath),
    };
  }

  const { data, error } = await updateRouteStop(userDb, stopId, {
    stop_status: 'COMPLETED',
    departed_at: new Date().toISOString(),
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to complete stop', apiPath) };
  }

  return { success: true, data };
}

export async function skipStop(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: stop, error: stopError } = await getRouteStopById(userDb, stopId);
  if (stopError || !stop) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_006', 'Route stop not found', 404, 'Stop was not found', apiPath),
    };
  }

  const { data, error } = await updateRouteStop(userDb, stopId, {
    stop_status: 'SKIPPED',
    skip_reason: payload.skip_reason,
    skip_notes: payload.skip_notes,
    departed_at: new Date().toISOString(),
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to skip stop', apiPath) };
  }

  return { success: true, data };
}

export async function completeStopTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  taskId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: task, error: taskError } = await getRouteStopTaskById(userDb, taskId);
  if (taskError || !task) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_007', 'Route task not found', 404, 'Task was not found', apiPath),
    };
  }

  const staffId = await currentStaffId(userDb, auth.userId);
  const existing = task as {
    route_stop_id: string;
    is_completed?: boolean;
    task_type?: string | null;
    delivery_items?: unknown;
    notes?: string | null;
    source_complaint_id?: string | null;
    description?: string | null;
  };
  const shouldLogDeliveryCosts = !existing.is_completed;

  const { data, error } = await updateRouteStopTask(userDb, taskId, {
    is_completed: true,
    completed_at: new Date().toISOString(),
    completed_by: staffId,
    notes: payload.notes ?? existing.notes ?? null,
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to complete task', apiPath) };
  }

  if (shouldLogDeliveryCosts) {
    await logDeliveryCostsForTask(userDb, existing.route_stop_id, existing.delivery_items);
  }

  if (existing.source_complaint_id) {
    await userDb
      .from('complaint_records')
      .update({
        status: 'RESOLVED',
        resolution_description: (payload.notes as string | null) ?? existing.description ?? 'Resolved during route task completion.',
        resolved_at: new Date().toISOString(),
        resolved_by: staffId,
      })
      .eq('id', existing.source_complaint_id)
      .is('archived_at', null);
  }

  const periodicCodeMatch = existing.description?.trim().match(PERIODIC_CODE_PREFIX);
  if (periodicCodeMatch?.[1]) {
    const periodicCode = periodicCodeMatch[1].toUpperCase();
    const [{ data: periodic }, { data: stop }] = await Promise.all([
      userDb
        .from('periodic_tasks')
        .select('id')
        .eq('periodic_code', periodicCode)
        .is('archived_at', null)
        .maybeSingle(),
      userDb
        .from('route_stops')
        .select('route_id')
        .eq('id', existing.route_stop_id)
        .maybeSingle(),
    ]);

    if (periodic?.id) {
      await userDb.rpc('complete_periodic_task', {
        p_periodic_id: periodic.id,
        p_completed_at: new Date().toISOString(),
        p_route_id: (stop as { route_id?: string } | null)?.route_id ?? null,
      });
    }
  }

  return { success: true, data };
}

export async function addTaskPhoto(
  userDb: SupabaseClient,
  auth: AuthContext,
  taskId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canOperateShift(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: task, error: taskError } = await getRouteStopTaskById(userDb, taskId);
  if (taskError || !task) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_007', 'Route task not found', 404, 'Task was not found', apiPath),
    };
  }

  const existingPhotos = Array.isArray((task as { evidence_photos?: unknown }).evidence_photos)
    ? ((task as { evidence_photos: string[] }).evidence_photos)
    : [];
  const nextPhotos = [...existingPhotos, String(payload.photo_url)];

  const { data, error } = await updateRouteStopTask(userDb, taskId, {
    evidence_photos: nextPhotos,
  });

  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to add photo evidence', apiPath) };
  }

  return { success: true, data };
}
