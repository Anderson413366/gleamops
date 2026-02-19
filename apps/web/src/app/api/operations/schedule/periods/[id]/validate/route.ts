import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { canManageSchedule } from '@/lib/api/role-guard';

const API_PATH = '/api/operations/schedule/periods/[id]/validate';
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
  if (!canManageSchedule(auth.roles)) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const { id } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: summary, error } = await db.rpc('fn_validate_schedule_period', { p_period_id: id });
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  const { data: conflicts, error: conflictsError } = await db
    .from('schedule_conflicts')
    .select('id, conflict_type, severity, message, is_blocking, ticket_id, staff_id, created_at')
    .eq('period_id', id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (conflictsError) return problemResponse(SYS_002(conflictsError.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_periods',
    entityId: id,
    action: 'VALIDATE',
    before: null,
    after: {
      summary: summary ?? [],
      conflict_count: (conflicts ?? []).length,
    },
    context: extractAuditContext(request, 'schedule_period_validate'),
  });

  return NextResponse.json({
    success: true,
    summary: summary ?? [],
    conflicts: conflicts ?? [],
  });
}
