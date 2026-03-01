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

export async function nextFieldReportCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'FR',
    p_padding: 4,
  });
}

function fieldReportSelect() {
  return `
    *,
    reporter:reported_by(id, staff_code, full_name),
    site:site_id(id, site_code, name),
    acknowledged_staff:acknowledged_by(id, staff_code, full_name),
    resolved_staff:resolved_by(id, staff_code, full_name)
  `;
}

export async function listFieldReports(
  db: SupabaseClient,
  filters: {
    report_type?: string | null;
    status?: string | null;
    site_id?: string | null;
  },
) {
  let query = db
    .from('field_reports')
    .select(fieldReportSelect())
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.report_type) query = query.eq('report_type', filters.report_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.site_id) query = query.eq('site_id', filters.site_id);

  return query;
}

export async function listMyFieldReports(
  db: SupabaseClient,
  staffId: string,
) {
  return db
    .from('field_reports')
    .select(fieldReportSelect())
    .eq('reported_by', staffId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
}

export async function insertFieldReport(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('field_reports')
    .insert(payload)
    .select(fieldReportSelect())
    .single();
}

export async function getFieldReportByCode(
  db: SupabaseClient,
  code: string,
) {
  return db
    .from('field_reports')
    .select(fieldReportSelect())
    .eq('report_code', code)
    .is('archived_at', null)
    .maybeSingle();
}

export async function updateFieldReportById(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
  expectedEtag: string | null,
) {
  let query = db
    .from('field_reports')
    .update(payload)
    .eq('id', id);

  if (expectedEtag) {
    query = query.eq('version_etag', expectedEtag);
  }

  return query
    .select(fieldReportSelect())
    .maybeSingle();
}

export async function listFieldReportRecipients(
  db: SupabaseClient,
  tenantId: string,
) {
  return db
    .from('tenant_memberships')
    .select('user_id, role_code')
    .eq('tenant_id', tenantId)
    .in('role_code', ['OWNER_ADMIN', 'MANAGER'])
    .is('archived_at', null);
}

export async function insertNotifications(
  db: SupabaseClient,
  payload: Array<{
    tenant_id: string;
    user_id: string;
    title: string;
    body: string;
    link: string;
  }>,
) {
  if (payload.length === 0) return { data: [], error: null };
  return db.from('notifications').insert(payload);
}
