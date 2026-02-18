import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, schedulePeriodSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { canPublishSchedule } from '@/lib/api/role-guard';
import { validateBody } from '@/lib/api/validate-request';

const API_PATH = '/api/operations/schedule/periods';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const db = getUserClient(request);
  const siteId = request.nextUrl.searchParams.get('siteId');
  const status = request.nextUrl.searchParams.get('status');
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  let query = db
    .from('schedule_periods')
    .select('id, tenant_id, site_id, period_name, period_start, period_end, status, published_at, published_by, locked_at, locked_by, created_at, updated_at')
    .is('archived_at', null)
    .order('period_start', { ascending: false })
    .limit(250);

  if (siteId) query = query.eq('site_id', siteId);
  if (status) query = query.eq('status', status);
  if (start) query = query.gte('period_start', start);
  if (end) query = query.lte('period_end', end);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  if (!canPublishSchedule(auth.roles)) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const validation = await validateBody(request, schedulePeriodSchema, API_PATH);
  if (validation.error) return validation.error;

  const payload = validation.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const insertPayload = {
    tenant_id: auth.tenantId,
    site_id: payload.site_id,
    period_name: payload.period_name,
    period_start: payload.period_start,
    period_end: payload.period_end,
    status: 'DRAFT' as const,
  };

  const { data, error } = await db
    .from('schedule_periods')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    return problemResponse(SYS_002(error?.message ?? 'Failed to create schedule period', API_PATH));
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

  return NextResponse.json({ success: true, data }, { status: 201 });
}
