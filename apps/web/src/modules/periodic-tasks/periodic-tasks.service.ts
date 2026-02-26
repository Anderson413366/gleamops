import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_002,
  SYS_002,
  createProblemDetails,
  type PeriodicTask,
  type PeriodicTaskCompletion,
  type PeriodicTaskDetail,
  type PeriodicTaskListItem,
} from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  archivePeriodicTaskById,
  completePeriodicTask,
  currentStaffId,
  getPeriodicTaskByCode,
  insertPeriodicTask,
  listPeriodicCompletionHistory,
  listPeriodicTasks,
  nextPeriodicCode,
  updatePeriodicTaskById,
} from './periodic-tasks.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const PERIODIC_VIEW_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER'] as const;
const PERIODIC_EDIT_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;
const PERIODIC_ARCHIVE_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;

function canViewPeriodicTasks(roles: string[]) {
  return hasAnyRole(roles, PERIODIC_VIEW_ROLES);
}

function canEditPeriodicTasks(roles: string[]) {
  return hasAnyRole(roles, PERIODIC_EDIT_ROLES);
}

function canArchivePeriodicTasks(roles: string[]) {
  return hasAnyRole(roles, PERIODIC_ARCHIVE_ROLES);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysKey(days: number) {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return day.toISOString().slice(0, 10);
}

function isOverdue(dateKey: string) {
  return dateKey < todayKey();
}

function isDueSoon(dateKey: string) {
  const today = todayKey();
  const end = plusDaysKey(7);
  return dateKey >= today && dateKey <= end;
}

function withDueFlags<T extends { next_due_date: string }>(row: T) {
  return {
    ...row,
    is_overdue: isOverdue(row.next_due_date),
    is_due_soon: isDueSoon(row.next_due_date),
  };
}

function missingPeriodicTask(apiPath: string) {
  return createProblemDetails('PER_001', 'Periodic task not found', 404, 'Periodic task was not found', apiPath);
}

function mapHistoryRows(rows: Array<Record<string, unknown>>): PeriodicTaskCompletion[] {
  return rows.flatMap((row) => {
    const routeStop = row.route_stop as {
      route?: { id?: string; route_date?: string; status?: string } | null;
      site_job?: { site?: { name?: string; site_code?: string } | null } | null;
    } | null;

    const route = routeStop?.route;
    if (!route?.id || !route.route_date || !route.status || typeof row.completed_at !== 'string') {
      return [];
    }

    return [{
      id: String(row.id),
      completed_at: row.completed_at,
      completed_by: row.completed_by ? String(row.completed_by) : null,
      description: String(row.description ?? ''),
      route_id: route.id,
      route_date: route.route_date,
      route_status: route.status,
      site_name: routeStop?.site_job?.site?.name ?? null,
      site_code: routeStop?.site_job?.site?.site_code ?? null,
    }];
  });
}

function validateCustomFrequency(
  frequency: string,
  customIntervalDays: number | null,
  apiPath: string,
): ReturnType<typeof createProblemDetails> | null {
  if (frequency === 'CUSTOM') {
    if ((customIntervalDays ?? 0) <= 0) {
      return createProblemDetails(
        'PER_002',
        'Invalid custom interval',
        400,
        'Custom frequency requires custom_interval_days greater than zero.',
        apiPath,
      );
    }
    return null;
  }

  if (customIntervalDays != null) {
    return createProblemDetails(
      'PER_003',
      'Invalid custom interval',
      400,
      'custom_interval_days must be null unless frequency is CUSTOM.',
      apiPath,
    );
  }

  return null;
}

export async function getPeriodicTasks(
  userDb: SupabaseClient,
  auth: AuthContext,
  filters: { status?: string | null; scope?: 'ALL' | 'OVERDUE' | 'DUE_SOON' | null },
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskListItem[]>> {
  if (!canViewPeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await listPeriodicTasks(userDb, { status: filters.status ?? null });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  let rows = ((data ?? []) as PeriodicTaskListItem[]).map(withDueFlags);
  const scope = filters.scope ?? 'ALL';
  if (scope === 'OVERDUE') {
    rows = rows.filter((row) => row.is_overdue);
  } else if (scope === 'DUE_SOON') {
    rows = rows.filter((row) => row.is_due_soon);
  }

  return { success: true, data: rows };
}

export async function createPeriodicTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskListItem>> {
  if (!canEditPeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const frequency = String(payload.frequency);
  const customInterval = payload.custom_interval_days == null ? null : Number(payload.custom_interval_days);
  const frequencyError = validateCustomFrequency(frequency, customInterval, apiPath);
  if (frequencyError) {
    return { success: false, error: frequencyError };
  }

  const codeResult = await nextPeriodicCode(userDb, auth.tenantId);
  if (codeResult.error || typeof codeResult.data !== 'string') {
    return {
      success: false,
      error: SYS_002(codeResult.error?.message ?? 'Failed to generate periodic code', apiPath),
    };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    periodic_code: codeResult.data,
    site_job_id: payload.site_job_id,
    task_type: payload.task_type,
    description_key: payload.description_key ?? null,
    description_override: payload.description_override ?? null,
    frequency,
    custom_interval_days: customInterval,
    last_completed_at: null,
    last_completed_route_id: null,
    next_due_date: payload.next_due_date,
    auto_add_to_route: payload.auto_add_to_route ?? true,
    preferred_staff_id: payload.preferred_staff_id ?? null,
    evidence_required: payload.evidence_required ?? false,
    notes: payload.notes ?? null,
    status: payload.status ?? 'ACTIVE',
  };

  const { data, error } = await insertPeriodicTask(userDb, insertPayload);
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to create periodic task', apiPath),
    };
  }

  return { success: true, data: withDueFlags(data as PeriodicTaskListItem), status: 201 };
}

export async function getPeriodicTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskDetail>> {
  if (!canViewPeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const periodicResult = await getPeriodicTaskByCode(userDb, code.toUpperCase());
  if (periodicResult.error) {
    return { success: false, error: SYS_002(periodicResult.error.message, apiPath) };
  }
  if (!periodicResult.data) {
    return { success: false, error: missingPeriodicTask(apiPath) };
  }

  const task = periodicResult.data as PeriodicTask & PeriodicTaskDetail;
  const historyResult = await listPeriodicCompletionHistory(userDb, task.periodic_code);
  if (historyResult.error) {
    return { success: false, error: SYS_002(historyResult.error.message, apiPath) };
  }

  return {
    success: true,
    data: {
      ...withDueFlags(task),
      completion_history: mapHistoryRows((historyResult.data ?? []) as Array<Record<string, unknown>>),
    },
  };
}

export async function patchPeriodicTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskListItem>> {
  if (!canEditPeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const periodicResult = await getPeriodicTaskByCode(userDb, code.toUpperCase());
  if (periodicResult.error) {
    return { success: false, error: SYS_002(periodicResult.error.message, apiPath) };
  }
  if (!periodicResult.data) {
    return { success: false, error: missingPeriodicTask(apiPath) };
  }

  const task = periodicResult.data as PeriodicTask;
  const { version_etag, ...changes } = payload;
  const frequency = String(changes.frequency ?? task.frequency);
  const customInterval = changes.custom_interval_days == null
    ? task.custom_interval_days
    : Number(changes.custom_interval_days);
  const frequencyError = validateCustomFrequency(frequency, customInterval, apiPath);
  if (frequencyError) {
    return { success: false, error: frequencyError };
  }

  const updatePayload = {
    ...changes,
    custom_interval_days: frequency === 'CUSTOM' ? customInterval : null,
    version_etag: crypto.randomUUID(),
  };

  const updated = await updatePeriodicTaskById(userDb, task.id, updatePayload, String(version_etag));
  if (updated.error) {
    return { success: false, error: SYS_002(updated.error.message, apiPath) };
  }
  if (!updated.data) {
    return {
      success: false,
      error: createProblemDetails(
        'SYS_003',
        'Conflict',
        409,
        'Periodic task was modified by another user. Refresh and retry.',
        apiPath,
      ),
    };
  }

  return { success: true, data: withDueFlags(updated.data as PeriodicTaskListItem) };
}

export async function completePeriodicTaskByCode(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  payload: { completed_at?: string | null; route_id?: string | null },
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskListItem>> {
  if (!canEditPeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const periodicResult = await getPeriodicTaskByCode(userDb, code.toUpperCase());
  if (periodicResult.error) {
    return { success: false, error: SYS_002(periodicResult.error.message, apiPath) };
  }
  if (!periodicResult.data) {
    return { success: false, error: missingPeriodicTask(apiPath) };
  }

  const task = periodicResult.data as PeriodicTask;
  const completed = await completePeriodicTask(
    userDb,
    task.id,
    payload.completed_at ?? null,
    payload.route_id ?? null,
  );
  if (completed.error) {
    return { success: false, error: SYS_002(completed.error.message, apiPath) };
  }

  const updated = await getPeriodicTaskByCode(userDb, code.toUpperCase());
  if (updated.error || !updated.data) {
    return {
      success: false,
      error: SYS_002(updated.error?.message ?? 'Periodic task completed but refresh failed', apiPath),
    };
  }

  return { success: true, data: withDueFlags(updated.data as PeriodicTaskListItem) };
}

export async function archivePeriodicTask(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  reason: string,
  apiPath: string,
): Promise<ServiceResult<PeriodicTaskListItem>> {
  if (!canArchivePeriodicTasks(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const periodicResult = await getPeriodicTaskByCode(userDb, code.toUpperCase());
  if (periodicResult.error) {
    return { success: false, error: SYS_002(periodicResult.error.message, apiPath) };
  }
  if (!periodicResult.data) {
    return { success: false, error: missingPeriodicTask(apiPath) };
  }

  const task = periodicResult.data as PeriodicTask;
  const staffId = await currentStaffId(userDb, auth.userId);
  const archiveReason = reason.trim() || 'Archived via periodic tasks API';
  const archived = await archivePeriodicTaskById(userDb, task.id, staffId, archiveReason);
  if (archived.error || !archived.data) {
    return {
      success: false,
      error: SYS_002(archived.error?.message ?? 'Failed to archive periodic task', apiPath),
    };
  }

  return { success: true, data: withDueFlags(archived.data as PeriodicTaskListItem) };
}

