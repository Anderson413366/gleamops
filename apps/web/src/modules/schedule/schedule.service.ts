/**
 * Schedule service.
 * Business logic extracted verbatim from api/operations/schedule/** routes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_002, SYS_002, createProblemDetails } from '@gleamops/shared';
import type { AuthContext } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { canManageSchedule, canPublishSchedule } from '@/lib/api/role-guard';
import type { NextRequest } from 'next/server';
import {
  currentStaffId,
  listAvailabilityRules,
  insertAvailabilityRule,
  findAvailabilityRule,
  archiveAvailabilityRule,
  listPeriods,
  insertPeriod,
  lockPeriod,
  publishPeriod,
  validatePeriod,
  fetchPeriod,
  listConflicts,
  listConflictsForPeriod,
  listTrades,
  requestTrade,
  acceptTrade,
  applyTrade,
  approveTrade,
  cancelTrade,
  denyTrade,
  fetchTrade,
} from './schedule.repository';

type ServiceResult =
  | { success: true; data: unknown; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export async function getAvailabilityRules(
  userDb: SupabaseClient,
  staffId: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  const { data, error } = await listAvailabilityRules(userDb, staffId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: data ?? [] };
}

export async function createAvailabilityRule(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  const meStaffId = await currentStaffId(userDb, auth.userId);
  const isSelf = meStaffId !== null && payload.staff_id === meStaffId;
  const canManage = canManageSchedule(auth.roles);
  if (!isSelf && !canManage) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    staff_id: payload.staff_id,
    rule_type: payload.rule_type,
    availability_type: payload.availability_type,
    weekday: payload.rule_type === 'WEEKLY_RECURRING' ? payload.weekday : null,
    start_time: payload.rule_type === 'WEEKLY_RECURRING' ? payload.start_time : null,
    end_time: payload.rule_type === 'WEEKLY_RECURRING' ? payload.end_time : null,
    one_off_start: payload.rule_type === 'ONE_OFF' ? payload.one_off_start : null,
    one_off_end: payload.rule_type === 'ONE_OFF' ? payload.one_off_end : null,
    valid_from: payload.valid_from,
    valid_to: payload.valid_to,
    notes: payload.notes,
  };

  const { data, error } = await insertAvailabilityRule(userDb, insertPayload);
  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to create availability rule', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'staff_availability_rules',
    entityId: (data as { id?: string }).id ?? null,
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_availability_create'),
  });

  return { success: true, data, status: 201 };
}

export async function archiveAvailability(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  ruleId: string,
  apiPath: string,
): Promise<ServiceResult> {
  const { data: before, error: beforeError } = await findAvailabilityRule(userDb, ruleId);
  if (beforeError || !before) {
    return { success: false, error: SYS_002(beforeError?.message ?? 'Availability rule not found', apiPath) };
  }

  const meStaffId = await currentStaffId(userDb, auth.userId);
  const rowStaffId = (before as { staff_id?: string }).staff_id ?? null;
  const isSelf = meStaffId !== null && rowStaffId === meStaffId;
  const canManage = canManageSchedule(auth.roles);
  if (!isSelf && !canManage) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await archiveAvailabilityRule(userDb, ruleId, auth.userId);
  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to archive availability rule', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'staff_availability_rules',
    entityId: ruleId,
    action: 'ARCHIVE',
    before: before as Record<string, unknown>,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_availability_archive'),
  });

  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export async function getSchedulePeriods(
  userDb: SupabaseClient,
  filters: { siteId?: string | null; status?: string | null; start?: string | null; end?: string | null },
  apiPath: string,
): Promise<ServiceResult> {
  const { data, error } = await listPeriods(userDb, filters);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: data ?? [] };
}

export async function createSchedulePeriod(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canPublishSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    site_id: payload.site_id,
    period_name: payload.period_name,
    period_start: payload.period_start,
    period_end: payload.period_end,
    status: 'DRAFT' as const,
  };

  const { data, error } = await insertPeriod(userDb, insertPayload);
  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to create schedule period', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: (data as { id?: string }).id ?? null,
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_period_create'),
  });

  return { success: true, data, status: 201 };
}

export async function lockSchedulePeriod(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  periodId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canPublishSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { error } = await lockPeriod(userDb, periodId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const { data: period, error: periodError } = await fetchPeriod(userDb, periodId);
  if (periodError) return { success: false, error: SYS_002(periodError.message, apiPath) };

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: periodId,
    action: 'LOCK',
    before: null,
    after: (period ?? {}) as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_period_lock'),
  });

  return { success: true, data: period };
}

export async function publishSchedulePeriod(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  periodId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canPublishSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { error } = await publishPeriod(userDb, periodId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const { data: period, error: periodError } = await fetchPeriod(userDb, periodId);
  if (periodError) return { success: false, error: SYS_002(periodError.message, apiPath) };

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: periodId,
    action: 'PUBLISH',
    before: null,
    after: (period ?? {}) as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_period_publish'),
  });

  return { success: true, data: period };
}

export async function validateSchedulePeriod(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  periodId: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data: summary, error } = await validatePeriod(userDb, periodId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const { data: conflicts, error: conflictsError } = await listConflictsForPeriod(userDb, periodId);
  if (conflictsError) return { success: false, error: SYS_002(conflictsError.message, apiPath) };

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: periodId,
    action: 'VALIDATE',
    before: null,
    after: {
      summary: summary ?? [],
      conflict_count: (conflicts ?? []).length,
    },
    context: extractAuditContext(request, 'schedule_period_validate'),
  });

  return { success: true, data: { summary: summary ?? [], conflicts: conflicts ?? [] } };
}

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

export async function getScheduleConflicts(
  userDb: SupabaseClient,
  filters: { periodId?: string | null; severity?: string | null; blockingOnly?: boolean },
  apiPath: string,
): Promise<ServiceResult> {
  const { data, error } = await listConflicts(userDb, filters);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: data ?? [] };
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export async function getShiftTrades(
  userDb: SupabaseClient,
  filters: { periodId?: string | null; ticketId?: string | null; status?: string | null },
  apiPath: string,
): Promise<ServiceResult> {
  const { data, error } = await listTrades(userDb, filters);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: data ?? [] };
}

export async function createShiftTrade(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  payload: { ticket_id: string; request_type: string; target_staff_id: string; initiator_note: string },
  apiPath: string,
): Promise<ServiceResult> {
  const { data: tradeId, error } = await requestTrade(userDb, payload);
  if (error || !tradeId) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to request shift trade', apiPath) };
  }

  const { data, error: fetchError } = await fetchTrade(userDb, tradeId);
  if (fetchError || !data) {
    return { success: false, error: SYS_002(fetchError?.message ?? 'Trade created but fetch failed', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'shift_trade_requests',
    entityId: String(tradeId),
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_trade_create'),
  });

  return { success: true, data, status: 201 };
}

async function tradeAction(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  tradeId: string,
  action: string,
  rpcFn: (db: SupabaseClient, id: string) => Promise<{ error: { message: string } | null }>,
  apiPath: string,
  requireManage: boolean,
): Promise<ServiceResult> {
  if (requireManage && !canManageSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { error } = await rpcFn(userDb, tradeId);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const { data, error: fetchError } = await fetchTrade(userDb, tradeId);
  if (fetchError || !data) {
    return { success: false, error: SYS_002(fetchError?.message ?? 'Unable to fetch trade', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'shift_trade_requests',
    entityId: tradeId,
    action,
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, `schedule_trade_${action.toLowerCase()}`),
  });

  return { success: true, data };
}

export async function acceptShiftTrade(
  userDb: SupabaseClient, serviceDb: SupabaseClient, auth: AuthContext, request: NextRequest, tradeId: string, apiPath: string,
): Promise<ServiceResult> {
  return tradeAction(userDb, serviceDb, auth, request, tradeId, 'ACCEPT', acceptTrade, apiPath, false);
}

export async function applyShiftTrade(
  userDb: SupabaseClient, serviceDb: SupabaseClient, auth: AuthContext, request: NextRequest, tradeId: string, apiPath: string,
): Promise<ServiceResult> {
  return tradeAction(userDb, serviceDb, auth, request, tradeId, 'APPLY', applyTrade, apiPath, true);
}

export async function approveShiftTrade(
  userDb: SupabaseClient, serviceDb: SupabaseClient, auth: AuthContext, request: NextRequest, tradeId: string, apiPath: string,
): Promise<ServiceResult> {
  return tradeAction(userDb, serviceDb, auth, request, tradeId, 'APPROVE', approveTrade, apiPath, true);
}

export async function cancelShiftTrade(
  userDb: SupabaseClient, serviceDb: SupabaseClient, auth: AuthContext, request: NextRequest, tradeId: string, apiPath: string,
): Promise<ServiceResult> {
  return tradeAction(userDb, serviceDb, auth, request, tradeId, 'CANCEL', cancelTrade, apiPath, false);
}

export async function denyShiftTrade(
  userDb: SupabaseClient,
  serviceDb: SupabaseClient,
  auth: AuthContext,
  request: NextRequest,
  tradeId: string,
  managerNote: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canManageSchedule(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { error } = await denyTrade(userDb, tradeId, managerNote);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };

  const { data, error: fetchError } = await fetchTrade(userDb, tradeId);
  if (fetchError || !data) {
    return { success: false, error: SYS_002(fetchError?.message ?? 'Unable to fetch trade', apiPath) };
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'shift_trade_requests',
    entityId: tradeId,
    action: 'DENY',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_trade_deny'),
  });

  return { success: true, data };
}
