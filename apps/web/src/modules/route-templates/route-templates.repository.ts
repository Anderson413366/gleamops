import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function listRouteTemplates(
  db: SupabaseClient,
  weekday: string | null,
) {
  let query = db
    .from('route_templates')
    .select(`
      id,
      tenant_id,
      template_code,
      label,
      weekday,
      assigned_staff_id,
      default_vehicle_id,
      default_key_box,
      is_active,
      notes,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      assigned_staff:assigned_staff_id(id, staff_code, full_name),
      default_vehicle:default_vehicle_id(id, vehicle_code, name),
      stops:route_template_stops(id, archived_at)
    `)
    .is('archived_at', null)
    .order('weekday', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  if (weekday) {
    query = query.eq('weekday', weekday);
  }

  return query;
}

export async function getRouteTemplateById(
  db: SupabaseClient,
  id: string,
) {
  return db
    .from('route_templates')
    .select(`
      id,
      tenant_id,
      template_code,
      label,
      weekday,
      assigned_staff_id,
      default_vehicle_id,
      default_key_box,
      is_active,
      notes,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      assigned_staff:assigned_staff_id(id, staff_code, full_name),
      default_vehicle:default_vehicle_id(id, vehicle_code, name),
      stops:route_template_stops(
        id,
        tenant_id,
        template_id,
        site_job_id,
        stop_order,
        access_window_start,
        access_window_end,
        notes,
        created_at,
        updated_at,
        archived_at,
        version_etag,
        site_job:site_job_id(
          id,
          job_code,
          site:site_id(id, site_code, name)
        ),
        tasks:route_template_tasks(
          id,
          tenant_id,
          template_stop_id,
          task_type,
          description_key,
          description_override,
          task_order,
          evidence_required,
          delivery_items,
          created_at,
          updated_at,
          archived_at,
          version_etag
        )
      )
    `)
    .eq('id', id)
    .is('archived_at', null)
    .single();
}

export async function insertRouteTemplate(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_templates')
    .insert(payload)
    .select('*')
    .single();
}

export async function updateRouteTemplate(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
  expectedEtag: string,
) {
  return db
    .from('route_templates')
    .update(payload)
    .eq('id', id)
    .eq('version_etag', expectedEtag)
    .select('*')
    .single();
}

export async function archiveRouteTemplate(
  db: SupabaseClient,
  id: string,
  userId: string,
  reason: string,
) {
  return db
    .from('route_templates')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason,
    })
    .eq('id', id)
    .select('*')
    .single();
}

export async function archiveRouteTemplateStops(
  db: SupabaseClient,
  templateId: string,
  userId: string,
  reason: string,
) {
  return db
    .from('route_template_stops')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason,
    })
    .eq('template_id', templateId)
    .is('archived_at', null)
    .select('id');
}

export async function archiveRouteTemplateTasksByTemplate(
  db: SupabaseClient,
  templateId: string,
  userId: string,
  reason: string,
) {
  const { data: stops } = await db
    .from('route_template_stops')
    .select('id')
    .eq('template_id', templateId)
    .is('archived_at', null);

  const stopIds = (stops ?? []).map((row) => (row as { id: string }).id);
  if (stopIds.length === 0) {
    return { data: [], error: null };
  }

  return db
    .from('route_template_tasks')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason,
    })
    .in('template_stop_id', stopIds)
    .is('archived_at', null)
    .select('id');
}

export async function insertRouteTemplateStop(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_template_stops')
    .insert(payload)
    .select('*')
    .single();
}

export async function getRouteTemplateStopById(
  db: SupabaseClient,
  stopId: string,
) {
  return db
    .from('route_template_stops')
    .select('*')
    .eq('id', stopId)
    .is('archived_at', null)
    .single();
}

export async function updateRouteTemplateStop(
  db: SupabaseClient,
  stopId: string,
  payload: Record<string, unknown>,
  expectedEtag: string,
) {
  return db
    .from('route_template_stops')
    .update(payload)
    .eq('id', stopId)
    .eq('version_etag', expectedEtag)
    .select('*')
    .single();
}

export async function insertRouteTemplateTask(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_template_tasks')
    .insert(payload)
    .select('*')
    .single();
}

export async function getRouteTemplateTaskById(
  db: SupabaseClient,
  taskId: string,
) {
  return db
    .from('route_template_tasks')
    .select('*')
    .eq('id', taskId)
    .is('archived_at', null)
    .single();
}

export async function updateRouteTemplateTask(
  db: SupabaseClient,
  taskId: string,
  payload: Record<string, unknown>,
  expectedEtag: string,
) {
  return db
    .from('route_template_tasks')
    .update(payload)
    .eq('id', taskId)
    .eq('version_etag', expectedEtag)
    .select('*')
    .single();
}

export async function generateDailyRoutes(
  db: SupabaseClient,
  tenantId: string,
  targetDate: string,
) {
  return db.rpc('generate_daily_routes', {
    p_tenant_id: tenantId,
    p_target_date: targetDate,
  });
}

export async function getRouteById(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('routes')
    .select('id, tenant_id, route_date, status, route_owner_staff_id, mileage_start, mileage_end, shift_started_at, shift_ended_at')
    .eq('id', routeId)
    .is('archived_at', null)
    .single();
}

export async function updateRoute(
  db: SupabaseClient,
  routeId: string,
  payload: Record<string, unknown>,
) {
  return db
    .from('routes')
    .update(payload)
    .eq('id', routeId)
    .select('*')
    .single();
}

export async function getRouteStopById(
  db: SupabaseClient,
  stopId: string,
) {
  return db
    .from('route_stops')
    .select('id, route_id, stop_status, arrived_at, departed_at')
    .eq('id', stopId)
    .is('archived_at', null)
    .single();
}

export async function updateRouteStop(
  db: SupabaseClient,
  stopId: string,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_stops')
    .update(payload)
    .eq('id', stopId)
    .select('*')
    .single();
}

export async function getRouteStopTaskById(
  db: SupabaseClient,
  taskId: string,
) {
  return db
    .from('route_stop_tasks')
    .select('id, route_stop_id, task_type, is_completed, evidence_photos, notes, source_complaint_id, description, delivery_items')
    .eq('id', taskId)
    .is('archived_at', null)
    .single();
}

export async function updateRouteStopTask(
  db: SupabaseClient,
  taskId: string,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_stop_tasks')
    .update(payload)
    .eq('id', taskId)
    .select('*')
    .single();
}

export async function getRouteStopsByRouteId(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('route_stops')
    .select('id, stop_status')
    .eq('route_id', routeId)
    .is('archived_at', null);
}

export async function getRouteTasksByRouteId(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('route_stop_tasks')
    .select('id, is_completed, evidence_photos')
    .in(
      'route_stop_id',
      (
        await db
          .from('route_stops')
          .select('id')
          .eq('route_id', routeId)
          .is('archived_at', null)
      ).data?.map((row) => (row as { id: string }).id) ?? [],
    )
    .is('archived_at', null);
}

export async function getRouteStopSupplyContext(
  db: SupabaseClient,
  routeStopId: string,
) {
  return db
    .from('route_stops')
    .select(`
      id,
      route_id,
      site_job:site_job_id(site_id),
      route:route_id(id, tenant_id, route_date)
    `)
    .eq('id', routeStopId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function listSupplyUnitCosts(
  db: SupabaseClient,
  supplyIds: string[],
) {
  if (supplyIds.length === 0) {
    return { data: [], error: null };
  }

  return db
    .from('supply_catalog')
    .select('id, unit_cost')
    .in('id', supplyIds)
    .is('archived_at', null);
}

export async function nextSiteSupplyCostCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'SCT',
    p_padding: 4,
  });
}

export async function insertSiteSupplyCosts(
  db: SupabaseClient,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return db
    .from('site_supply_costs')
    .insert(rows)
    .select('id');
}
