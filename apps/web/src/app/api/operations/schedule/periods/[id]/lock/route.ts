import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { canPublishSchedule } from '@/lib/api/role-guard';

const API_PATH = '/api/operations/schedule/periods/[id]/lock';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canPublishSchedule(auth.roles)) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const { id } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { error } = await db.rpc('fn_lock_schedule_period', { p_period_id: id });
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  const { data: period, error: periodError } = await db
    .from('schedule_periods')
    .select('id, status, period_name, period_start, period_end, locked_at')
    .eq('id', id)
    .single();

  if (periodError) return problemResponse(SYS_002(periodError.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: id,
    action: 'LOCK',
    before: null,
    after: (period ?? {}) as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_period_lock'),
  });

  return NextResponse.json({ success: true, data: period });
}
