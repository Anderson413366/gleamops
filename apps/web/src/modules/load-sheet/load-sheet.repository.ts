import type { SupabaseClient } from '@supabase/supabase-js';

export async function getRouteHeader(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('routes')
    .select('id, tenant_id, route_date')
    .eq('id', routeId)
    .is('archived_at', null)
    .single();
}

export async function listLoadSheetRows(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('v_load_sheet')
    .select('route_id, route_date, supply_id, supply_name, unit, direction, total_quantity, site_breakdown')
    .eq('route_id', routeId)
    .order('supply_name', { ascending: true });
}

export async function listRouteStopsForSpecialItems(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('route_stops')
    .select(`
      id,
      stop_order,
      site_job:site_job_id(
        site:site_id(id, name)
      )
    `)
    .eq('route_id', routeId)
    .is('archived_at', null)
    .order('stop_order', { ascending: true });
}

export async function listCustomTasksByStopIds(
  db: SupabaseClient,
  stopIds: string[],
) {
  if (stopIds.length === 0) {
    return { data: [], error: null };
  }

  return db
    .from('route_stop_tasks')
    .select('route_stop_id, description, task_order')
    .in('route_stop_id', stopIds)
    .eq('task_type', 'CUSTOM')
    .is('archived_at', null)
    .order('task_order', { ascending: true });
}
