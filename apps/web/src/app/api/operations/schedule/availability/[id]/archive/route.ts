import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { canManageSchedule } from '@/lib/api/role-guard';

const API_PATH = '/api/operations/schedule/availability/[id]/archive';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

async function currentStaffId(db: ReturnType<typeof getUserClient>, userId: string): Promise<string | null> {
  const { data } = await db
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle();

  return (data as { id?: string } | null)?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: before, error: beforeError } = await db
    .from('staff_availability_rules')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .single();

  if (beforeError || !before) {
    return problemResponse(SYS_002(beforeError?.message ?? 'Availability rule not found', API_PATH));
  }

  const meStaffId = await currentStaffId(db, auth.userId);
  const rowStaffId = (before as { staff_id?: string }).staff_id ?? null;
  const isSelf = meStaffId !== null && rowStaffId === meStaffId;
  const canManage = canManageSchedule(auth.roles);
  if (!isSelf && !canManage) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const { data, error } = await db
    .from('staff_availability_rules')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: auth.userId,
      archive_reason: 'Archived via schedule availability API',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return problemResponse(SYS_002(error?.message ?? 'Failed to archive availability rule', API_PATH));
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'staff_availability_rules',
    entityId: id,
    action: 'ARCHIVE',
    before: before as Record<string, unknown>,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_availability_archive'),
  });

  return NextResponse.json({ success: true, data });
}
