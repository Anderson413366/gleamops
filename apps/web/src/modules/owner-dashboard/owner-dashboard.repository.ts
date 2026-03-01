import type { SupabaseClient } from '@supabase/supabase-js';

export async function listComplaintRowsForMonth(
  db: SupabaseClient,
  fromIso: string,
) {
  return db
    .from('complaint_records')
    .select('id, created_at, resolved_at, status, priority')
    .gte('created_at', fromIso)
    .is('archived_at', null);
}

export async function listInventoryCountsForMonth(
  db: SupabaseClient,
  fromDate: string,
  toDate: string,
) {
  return db
    .from('inventory_counts')
    .select('id, count_date, status')
    .gte('count_date', fromDate)
    .lte('count_date', toDate)
    .is('archived_at', null);
}

export async function listSpecialistStaff(
  db: SupabaseClient,
) {
  return db
    .from('staff')
    .select('id, staff_status, updated_at, archived_at, microfiber_exited_at')
    .eq('role', 'CLEANER')
    .is('archived_at', null);
}

export async function listSupplyCostsForRange(
  db: SupabaseClient,
  fromDate: string,
  toDate: string,
  siteId?: string,
) {
  let query = db
    .from('site_supply_costs')
    .select(`
      id,
      tenant_id,
      cost_code,
      site_id,
      supply_id,
      delivery_date,
      quantity,
      unit_cost,
      total_cost,
      source,
      route_id,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      site:site_id!site_supply_costs_site_id_fkey(id, site_code, name),
      supply:supply_id!site_supply_costs_supply_id_fkey(id, code, name, category)
    `)
    .gte('delivery_date', fromDate)
    .lte('delivery_date', toDate)
    .is('archived_at', null)
    .order('delivery_date', { ascending: false })
    .limit(5000);

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  return query;
}

export async function countPendingDayOffRequests(
  db: SupabaseClient,
) {
  return db
    .from('field_reports')
    .select('id', { count: 'exact', head: true })
    .eq('report_type', 'DAY_OFF')
    .eq('status', 'OPEN')
    .is('archived_at', null);
}

export async function countTonightRoutes(
  db: SupabaseClient,
  routeDate: string,
) {
  return db
    .from('routes')
    .select('id', { count: 'exact', head: true })
    .eq('route_date', routeDate)
    .in('status', ['DRAFT', 'PUBLISHED'])
    .is('archived_at', null);
}

export async function countOverduePeriodicTasks(
  db: SupabaseClient,
  dateKey: string,
) {
  return db
    .from('periodic_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')
    .lt('next_due_date', dateKey)
    .is('archived_at', null);
}

export async function countUnreviewedNightBridge(
  db: SupabaseClient,
) {
  return db
    .from('v_night_bridge')
    .select('route_id', { count: 'exact', head: true })
    .eq('shift_review_status', 'PENDING');
}

export async function listOpenComplaints(
  db: SupabaseClient,
) {
  return db
    .from('complaint_records')
    .select('id, priority, status')
    .not('status', 'in', '("RESOLVED","CLOSED")')
    .is('archived_at', null);
}

export async function listMicrofiberEnrollments(
  db: SupabaseClient,
) {
  return db
    .from('staff')
    .select('id, staff_code, full_name, role, microfiber_enrolled, microfiber_enrolled_at, microfiber_exited_at, microfiber_rate_per_set')
    .is('archived_at', null)
    .order('full_name', { ascending: true })
    .limit(1000);
}

export async function updateMicrofiberStaff(
  db: SupabaseClient,
  staffId: string,
  payload: Record<string, unknown>,
) {
  return db
    .from('staff')
    .update(payload)
    .eq('id', staffId)
    .is('archived_at', null)
    .select('id, staff_code, full_name, role, microfiber_enrolled, microfiber_enrolled_at, microfiber_exited_at, microfiber_rate_per_set')
    .single();
}

export async function listMicrofiberWashLogs(
  db: SupabaseClient,
  fromDate?: string,
  toDate?: string,
) {
  let query = db
    .from('microfiber_wash_log')
    .select(`
      id,
      tenant_id,
      wash_code,
      staff_id,
      site_id,
      wash_date,
      sets_washed,
      amount_due,
      payroll_period_start,
      payroll_period_end,
      exported,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      staff:staff_id!microfiber_wash_log_staff_id_fkey(id, staff_code, full_name, microfiber_rate_per_set),
      site:site_id!microfiber_wash_log_site_id_fkey(id, site_code, name)
    `)
    .is('archived_at', null)
    .order('wash_date', { ascending: false })
    .limit(3000);

  if (fromDate) query = query.gte('wash_date', fromDate);
  if (toDate) query = query.lte('wash_date', toDate);

  return query;
}
