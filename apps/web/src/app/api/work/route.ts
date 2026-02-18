import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/work';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canReadWork(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR', 'ADMIN', 'OPERATIONS', 'TECHNICIAN']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canReadWork(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const db = getUserClient(request);
  const url = request.nextUrl;
  const status = url.searchParams.get('status');
  const siteId = url.searchParams.get('siteId');
  const staffId = url.searchParams.get('staffId');
  const scheduledDate = url.searchParams.get('scheduledDate');

  let query = db
    .from('work_tickets')
    .select('*, site:sites(id, name, site_code), assignments:ticket_assignments(id, staff_id, subcontractor_id, role, assignment_status)')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(200);

  if (status) query = query.eq('status', status);
  if (siteId) query = query.eq('site_id', siteId);
  if (scheduledDate) query = query.eq('scheduled_date', scheduledDate);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  let results = data ?? [];

  if (staffId) {
    results = results.filter((ticket: Record<string, unknown>) => {
      const assignments = ticket.assignments as Array<{ staff_id: string | null }> | null;
      return assignments?.some((a) => a.staff_id === staffId);
    });
  }

  return NextResponse.json({ success: true, data: results });
}
