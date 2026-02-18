import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, staffAvailabilityRuleSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { canManageSchedule } from '@/lib/api/role-guard';
import { validateBody } from '@/lib/api/validate-request';

const API_PATH = '/api/operations/schedule/availability';
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

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const db = getUserClient(request);
  const staffId = request.nextUrl.searchParams.get('staffId');

  let query = db
    .from('staff_availability_rules')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, staffAvailabilityRuleSchema, API_PATH);
  if (validation.error) return validation.error;

  const payload = validation.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const meStaffId = await currentStaffId(db, auth.userId);
  const isSelf = meStaffId !== null && payload.staff_id === meStaffId;
  const canManage = canManageSchedule(auth.roles);
  if (!isSelf && !canManage) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    staff_id: payload.staff_id,
    rule_type: payload.rule_type,
    availability_type: payload.availability_type,
    weekday: payload.rule_type === 'WEEKLY_RECURRING' ? payload.weekday : null,
    start_time: payload.rule_type === 'WEEKLY_RECURRING' ? payload.start_time : null,
    end_time: payload.rule_type === 'WEEKLY_RECURRING' ? payload.end_time : null,
    one_off_start: payload.rule_type === 'ONE_OFF' ? payload.one_off_start : null,
    one_off_end: payload.rule_type === 'ONE_OFF' ? payload.one_off_end : null,
    valid_from: payload.valid_from,
    valid_to: payload.valid_to,
    notes: payload.notes,
  };

  const { data, error } = await db
    .from('staff_availability_rules')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    return problemResponse(SYS_002(error?.message ?? 'Failed to create availability rule', API_PATH));
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'staff_availability_rules',
    entityId: (data as { id?: string }).id ?? null,
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_availability_create'),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
