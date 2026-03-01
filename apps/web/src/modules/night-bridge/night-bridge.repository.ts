import type { SupabaseClient } from '@supabase/supabase-js';
import type { NightBridgeReviewStatus } from '@gleamops/shared';

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

export async function listNightBridgeSummaries(
  db: SupabaseClient,
  tenantId: string,
  routeDate: string | null,
  reviewStatus: NightBridgeReviewStatus | null,
) {
  let query = db
    .from('v_night_bridge')
    .select(`
      route_id,
      tenant_id,
      route_date,
      route_status,
      shift_started_at,
      shift_ended_at,
      mileage_start,
      mileage_end,
      shift_summary,
      shift_review_status,
      reviewed_by,
      reviewed_at,
      reviewer_notes,
      floater_name,
      floater_code,
      vehicle_name,
      vehicle_code,
      stops_completed,
      stops_skipped,
      stops_total,
      photos_uploaded
    `)
    .eq('tenant_id', tenantId)
    .order('route_date', { ascending: false })
    .order('shift_ended_at', { ascending: false })
    .limit(250);

  if (routeDate) query = query.eq('route_date', routeDate);
  if (reviewStatus) query = query.eq('shift_review_status', reviewStatus);

  return query;
}

export async function getNightBridgeSummaryByRoute(
  db: SupabaseClient,
  tenantId: string,
  routeId: string,
) {
  return db
    .from('v_night_bridge')
    .select(`
      route_id,
      tenant_id,
      route_date,
      route_status,
      shift_started_at,
      shift_ended_at,
      mileage_start,
      mileage_end,
      shift_summary,
      shift_review_status,
      reviewed_by,
      reviewed_at,
      reviewer_notes,
      floater_name,
      floater_code,
      vehicle_name,
      vehicle_code,
      stops_completed,
      stops_skipped,
      stops_total,
      photos_uploaded
    `)
    .eq('tenant_id', tenantId)
    .eq('route_id', routeId)
    .maybeSingle();
}

export async function getRouteById(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('routes')
    .select('id, tenant_id, route_date, status, version_etag')
    .eq('id', routeId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function listRouteStops(
  db: SupabaseClient,
  routeId: string,
) {
  return db
    .from('route_stops')
    .select(`
      id,
      route_id,
      site_job_id,
      stop_order,
      stop_status,
      arrived_at,
      departed_at,
      skip_reason,
      skip_notes,
      site_job:site_jobs!route_stops_site_job_id_fkey(
        site:sites!route_stops_site_id_fkey(id, site_code, name)
      )
    `)
    .eq('route_id', routeId)
    .is('archived_at', null)
    .order('stop_order', { ascending: true });
}

export async function listRouteStopTasks(
  db: SupabaseClient,
  stopIds: string[],
) {
  if (stopIds.length === 0) {
    return { data: [], error: null };
  }

  return db
    .from('route_stop_tasks')
    .select(`
      id,
      route_stop_id,
      task_type,
      description,
      task_order,
      is_completed,
      evidence_required,
      evidence_photos,
      notes,
      delivery_items,
      source_complaint_id
    `)
    .in('route_stop_id', stopIds)
    .is('archived_at', null)
    .order('task_order', { ascending: true });
}

export async function updateRouteReview(
  db: SupabaseClient,
  routeId: string,
  payload: Record<string, unknown>,
) {
  return db
    .from('routes')
    .update(payload)
    .eq('id', routeId)
    .select('id, shift_review_status, reviewed_at, reviewer_notes')
    .single();
}

export async function listSiteJobsForSite(
  db: SupabaseClient,
  siteId: string,
) {
  return db
    .from('site_jobs')
    .select('id')
    .eq('site_id', siteId)
    .is('archived_at', null);
}

export async function listRoutesForDate(
  db: SupabaseClient,
  tenantId: string,
  routeDate: string,
) {
  return db
    .from('routes')
    .select('id, route_date, status')
    .eq('tenant_id', tenantId)
    .eq('route_date', routeDate)
    .is('archived_at', null)
    .in('status', ['DRAFT', 'PUBLISHED', 'COMPLETED']);
}

export async function findFirstRouteStopForSiteJobs(
  db: SupabaseClient,
  routeIds: string[],
  siteJobIds: string[],
) {
  if (routeIds.length === 0 || siteJobIds.length === 0) {
    return { data: null, error: null };
  }

  return db
    .from('route_stops')
    .select('id, route_id, site_job_id, stop_order')
    .in('route_id', routeIds)
    .in('site_job_id', siteJobIds)
    .is('archived_at', null)
    .order('stop_order', { ascending: true })
    .limit(1)
    .maybeSingle();
}

export async function nextTaskOrder(
  db: SupabaseClient,
  routeStopId: string,
): Promise<number> {
  const { data } = await db
    .from('route_stop_tasks')
    .select('task_order')
    .eq('route_stop_id', routeStopId)
    .is('archived_at', null)
    .order('task_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxOrder = Number((data as { task_order?: number } | null)?.task_order ?? 0);
  return maxOrder + 1;
}

export async function insertRouteStopTask(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_stop_tasks')
    .insert(payload)
    .select('id, route_stop_id')
    .single();
}

export async function getSiteById(
  db: SupabaseClient,
  siteId: string,
) {
  return db
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .is('archived_at', null)
    .maybeSingle();
}
