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

export async function nextPeriodicCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'PER',
    p_padding: 4,
  });
}

export async function listPeriodicTasks(
  db: SupabaseClient,
  filters: {
    status?: string | null;
  },
) {
  let query = db
    .from('periodic_tasks')
    .select(`
      *,
      site_job:site_jobs!periodic_tasks_site_job_id_fkey(
        id,
        job_code,
        site:site_id(id, site_code, name)
      ),
      preferred_staff:staff!periodic_tasks_preferred_staff_id_fkey(id, staff_code, full_name),
      last_completed_route:routes!periodic_tasks_last_completed_route_id_fkey(id, route_date, status)
    `)
    .is('archived_at', null)
    .order('next_due_date', { ascending: true })
    .limit(500);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  return query;
}

export async function insertPeriodicTask(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('periodic_tasks')
    .insert(payload)
    .select(`
      *,
      site_job:site_jobs!periodic_tasks_site_job_id_fkey(
        id,
        job_code,
        site:site_id(id, site_code, name)
      ),
      preferred_staff:staff!periodic_tasks_preferred_staff_id_fkey(id, staff_code, full_name),
      last_completed_route:routes!periodic_tasks_last_completed_route_id_fkey(id, route_date, status)
    `)
    .single();
}

export async function getPeriodicTaskByCode(
  db: SupabaseClient,
  code: string,
) {
  return db
    .from('periodic_tasks')
    .select(`
      *,
      site_job:site_jobs!periodic_tasks_site_job_id_fkey(
        id,
        job_code,
        site:site_id(id, site_code, name)
      ),
      preferred_staff:staff!periodic_tasks_preferred_staff_id_fkey(id, staff_code, full_name),
      last_completed_route:routes!periodic_tasks_last_completed_route_id_fkey(id, route_date, status)
    `)
    .eq('periodic_code', code)
    .is('archived_at', null)
    .maybeSingle();
}

export async function updatePeriodicTaskById(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
  expectedEtag: string | null,
) {
  let query = db
    .from('periodic_tasks')
    .update(payload)
    .eq('id', id);

  if (expectedEtag) {
    query = query.eq('version_etag', expectedEtag);
  }

  return query
    .select(`
      *,
      site_job:site_jobs!periodic_tasks_site_job_id_fkey(
        id,
        job_code,
        site:site_id(id, site_code, name)
      ),
      preferred_staff:staff!periodic_tasks_preferred_staff_id_fkey(id, staff_code, full_name),
      last_completed_route:routes!periodic_tasks_last_completed_route_id_fkey(id, route_date, status)
    `)
    .maybeSingle();
}

export async function completePeriodicTask(
  db: SupabaseClient,
  periodicId: string,
  completedAt: string | null,
  routeId: string | null,
) {
  return db.rpc('complete_periodic_task', {
    p_periodic_id: periodicId,
    p_completed_at: completedAt,
    p_route_id: routeId,
  });
}

export async function listPeriodicCompletionHistory(
  db: SupabaseClient,
  periodicCode: string,
) {
  return db
    .from('route_stop_tasks')
    .select(`
      id,
      completed_at,
      completed_by,
      description,
      route_stop:route_stop_id!route_stop_tasks_route_stop_id_fkey(
        id,
        route:route_id(id, route_date, status),
        site_job:site_job_id(
          id,
          site:site_id(id, site_code, name)
        )
      )
    `)
    .eq('is_completed', true)
    .is('archived_at', null)
    .like('description', `${periodicCode}:%`)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(100);
}

export async function archivePeriodicTaskById(
  db: SupabaseClient,
  id: string,
  archivedBy: string | null,
  reason: string,
) {
  return db
    .from('periodic_tasks')
    .update({
      status: 'ARCHIVED',
      archived_at: new Date().toISOString(),
      archived_by: archivedBy,
      archive_reason: reason,
      version_etag: crypto.randomUUID(),
    })
    .eq('id', id)
    .is('archived_at', null)
    .select(`
      *,
      site_job:site_jobs!periodic_tasks_site_job_id_fkey(
        id,
        job_code,
        site:site_id(id, site_code, name)
      ),
      preferred_staff:staff!periodic_tasks_preferred_staff_id_fkey(id, staff_code, full_name),
      last_completed_route:routes!periodic_tasks_last_completed_route_id_fkey(id, route_date, status)
    `)
    .maybeSingle();
}

