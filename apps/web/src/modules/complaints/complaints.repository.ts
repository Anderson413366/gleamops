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

export async function nextComplaintCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'CMP',
    p_padding: 4,
  });
}

export async function getSiteClient(
  db: SupabaseClient,
  siteId: string,
) {
  return db
    .from('sites')
    .select('id, client_id')
    .eq('id', siteId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function listComplaints(
  db: SupabaseClient,
  filters: {
    status?: string | null;
    priority?: string | null;
    site_id?: string | null;
    date_from?: string | null;
    date_to?: string | null;
  },
) {
  let query = db
    .from('complaint_records')
    .select(`
      *,
      site:site_id(id, site_code, name),
      client:client_id(id, client_code, name),
      assigned_staff:assigned_to_staff_id(id, staff_code, full_name),
      reported_staff:reported_by_staff_id(id, staff_code, full_name)
    `)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(400);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.site_id) query = query.eq('site_id', filters.site_id);
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00.000Z`);
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999Z`);

  return query;
}

export async function insertComplaint(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('complaint_records')
    .insert(payload)
    .select(`
      *,
      site:site_id(id, site_code, name),
      client:client_id(id, client_code, name),
      assigned_staff:assigned_to_staff_id(id, staff_code, full_name),
      reported_staff:reported_by_staff_id(id, staff_code, full_name)
    `)
    .single();
}

export async function getComplaintByCode(
  db: SupabaseClient,
  code: string,
) {
  return db
    .from('complaint_records')
    .select(`
      *,
      site:site_id(id, site_code, name),
      client:client_id(id, client_code, name),
      assigned_staff:assigned_to_staff_id(id, staff_code, full_name),
      reported_staff:reported_by_staff_id(id, staff_code, full_name)
    `)
    .eq('complaint_code', code)
    .is('archived_at', null)
    .maybeSingle();
}

export async function getComplaintById(
  db: SupabaseClient,
  id: string,
) {
  return db
    .from('complaint_records')
    .select(`
      *,
      site:site_id(id, site_code, name),
      client:client_id(id, client_code, name),
      assigned_staff:assigned_to_staff_id(id, staff_code, full_name),
      reported_staff:reported_by_staff_id(id, staff_code, full_name)
    `)
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();
}

export async function updateComplaintById(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
  expectedEtag: string | null,
) {
  let query = db
    .from('complaint_records')
    .update(payload)
    .eq('id', id);

  if (expectedEtag) {
    query = query.eq('version_etag', expectedEtag);
  }

  return query
    .select(`
      *,
      site:site_id(id, site_code, name),
      client:client_id(id, client_code, name),
      assigned_staff:assigned_to_staff_id(id, staff_code, full_name),
      reported_staff:reported_by_staff_id(id, staff_code, full_name)
    `)
    .maybeSingle();
}

export async function listComplaintTimeline(
  db: SupabaseClient,
  complaintId: string,
) {
  return db
    .from('audit_events')
    .select('id, action, actor_user_id, created_at')
    .eq('entity_type', 'complaint_records')
    .eq('entity_id', complaintId)
    .order('created_at', { ascending: false })
    .limit(200);
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
    .in('status', ['DRAFT', 'PUBLISHED', 'COMPLETED'])
    .order('created_at', { ascending: true });
}

export async function findRouteStopForSiteJobs(
  db: SupabaseClient,
  routeIds: string[],
  siteJobIds: string[],
) {
  if (routeIds.length === 0 || siteJobIds.length === 0) {
    return { data: null, error: null };
  }

  return db
    .from('route_stops')
    .select('id, route_id, stop_order')
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
) {
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

export async function insertRouteTask(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('route_stop_tasks')
    .insert(payload)
    .select('id, route_stop_id')
    .single();
}

export async function getPrimaryContactEmail(
  db: SupabaseClient,
  siteId: string,
  clientId: string | null,
) {
  const siteContact = await db
    .from('contacts')
    .select('email, name')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .eq('is_primary', true)
    .not('email', 'is', null)
    .limit(1)
    .maybeSingle();

  if (siteContact.data?.email) {
    return siteContact;
  }

  if (!clientId) {
    return { data: null, error: null };
  }

  return db
    .from('contacts')
    .select('email, name')
    .eq('client_id', clientId)
    .is('archived_at', null)
    .eq('is_primary', true)
    .not('email', 'is', null)
    .limit(1)
    .maybeSingle();
}
