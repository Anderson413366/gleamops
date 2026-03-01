/**
 * Schedule data access layer.
 * All Supabase queries for the schedule domain.
 * Extracted from api/operations/schedule/** routes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Shared helper (deduplicated from availability/route.ts & archive/route.ts)
// ---------------------------------------------------------------------------

export async function currentStaffId(
  db: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await db
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle();

  return (data as { id?: string } | null)?.id ?? null;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export async function listAvailabilityRules(
  db: SupabaseClient,
  staffId: string | null,
) {
  let query = db
    .from('staff_availability_rules')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  return query;
}

export async function insertAvailabilityRule(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('staff_availability_rules')
    .insert(payload)
    .select('*')
    .single();
}

export async function findAvailabilityRule(
  db: SupabaseClient,
  ruleId: string,
) {
  return db
    .from('staff_availability_rules')
    .select('*')
    .eq('id', ruleId)
    .is('archived_at', null)
    .single();
}

export async function archiveAvailabilityRule(
  db: SupabaseClient,
  ruleId: string,
  userId: string,
) {
  return db
    .from('staff_availability_rules')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: 'Archived via schedule availability API',
    })
    .eq('id', ruleId)
    .select('*')
    .single();
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export async function listPeriods(
  db: SupabaseClient,
  filters: { siteId?: string | null; status?: string | null; start?: string | null; end?: string | null },
) {
  let query = db
    .from('schedule_periods')
    .select('id, tenant_id, site_id, period_name, period_start, period_end, status, published_at, published_by, locked_at, locked_by, created_at, updated_at')
    .is('archived_at', null)
    .order('period_start', { ascending: false })
    .limit(250);

  if (filters.siteId) query = query.eq('site_id', filters.siteId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.start) query = query.gte('period_start', filters.start);
  if (filters.end) query = query.lte('period_end', filters.end);

  return query;
}

export async function insertPeriod(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('schedule_periods')
    .insert(payload)
    .select('*')
    .single();
}

export async function lockPeriod(db: SupabaseClient, periodId: string) {
  return db.rpc('fn_lock_schedule_period', { p_period_id: periodId });
}

export async function publishPeriod(db: SupabaseClient, periodId: string) {
  return db.rpc('fn_publish_schedule_period', { p_period_id: periodId });
}

export async function validatePeriod(db: SupabaseClient, periodId: string) {
  return db.rpc('fn_validate_schedule_period', { p_period_id: periodId });
}

export async function fetchPeriod(db: SupabaseClient, periodId: string) {
  return db
    .from('schedule_periods')
    .select('id, status, period_name, period_start, period_end, locked_at')
    .eq('id', periodId)
    .single();
}

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

export async function listConflicts(
  db: SupabaseClient,
  filters: { periodId?: string | null; severity?: string | null; blockingOnly?: boolean },
) {
  let query = db
    .from('schedule_conflicts')
    .select('id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking, created_at, resolved_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.periodId) query = query.eq('period_id', filters.periodId);
  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.blockingOnly) query = query.eq('is_blocking', true);

  return query;
}

export async function listConflictsForPeriod(
  db: SupabaseClient,
  periodId: string,
) {
  return db
    .from('schedule_conflicts')
    .select('id, conflict_type, severity, message, is_blocking, ticket_id, staff_id, created_at')
    .eq('period_id', periodId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export async function listTrades(
  db: SupabaseClient,
  filters: { periodId?: string | null; ticketId?: string | null; status?: string | null },
) {
  let query = db
    .from('shift_trade_requests')
    .select(`
      id, tenant_id, ticket_id, period_id, initiator_staff_id, target_staff_id,
      request_type, status, requested_at, accepted_at, approved_at, applied_at,
      manager_user_id, initiator_note, manager_note, created_at, updated_at,
      ticket:work_tickets!shift_trade_requests_ticket_id_fkey(ticket_code, scheduled_date, start_time, end_time, site:sites!work_tickets_site_id_fkey(name, site_code)),
      initiator:staff!shift_trade_requests_initiator_staff_id_fkey(staff_code, full_name),
      target:staff!shift_trade_requests_target_staff_id_fkey(staff_code, full_name)
    `)
    .is('archived_at', null)
    .order('requested_at', { ascending: false })
    .limit(500);

  if (filters.periodId) query = query.eq('period_id', filters.periodId);
  if (filters.ticketId) query = query.eq('ticket_id', filters.ticketId);
  if (filters.status) query = query.eq('status', filters.status);

  return query;
}

export async function requestTrade(
  db: SupabaseClient,
  payload: { ticket_id: string; request_type: string; target_staff_id: string; initiator_note: string },
) {
  return db.rpc('fn_request_shift_trade', {
    p_ticket_id: payload.ticket_id,
    p_request_type: payload.request_type,
    p_target_staff_id: payload.target_staff_id,
    p_initiator_note: payload.initiator_note,
  });
}

export async function acceptTrade(db: SupabaseClient, tradeId: string) {
  return db.rpc('fn_accept_shift_trade', { p_trade_id: tradeId });
}

export async function applyTrade(db: SupabaseClient, tradeId: string) {
  return db.rpc('fn_apply_shift_trade', { p_trade_id: tradeId });
}

export async function approveTrade(db: SupabaseClient, tradeId: string) {
  return db.rpc('fn_approve_shift_trade', { p_trade_id: tradeId });
}

export async function cancelTrade(db: SupabaseClient, tradeId: string) {
  return db.rpc('fn_cancel_shift_trade', { p_trade_id: tradeId });
}

export async function denyTrade(db: SupabaseClient, tradeId: string, managerNote: string | null) {
  return db.rpc('fn_deny_shift_trade', {
    p_trade_id: tradeId,
    p_manager_note: managerNote,
  });
}

export async function fetchTrade(db: SupabaseClient, tradeId: string) {
  return db
    .from('shift_trade_requests')
    .select('*')
    .eq('id', tradeId)
    .single();
}
