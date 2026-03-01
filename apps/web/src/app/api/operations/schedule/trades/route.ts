import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, shiftTradeRequestSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';

const API_PATH = '/api/operations/schedule/trades';
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

  const periodId = request.nextUrl.searchParams.get('periodId');
  const ticketId = request.nextUrl.searchParams.get('ticketId');
  const status = request.nextUrl.searchParams.get('status');

  const db = getUserClient(request);
  let query = db
    .from('shift_trade_requests')
    .select(`
      id, tenant_id, ticket_id, period_id, initiator_staff_id, target_staff_id,
      request_type, status, requested_at, accepted_at, approved_at, applied_at,
      manager_user_id, initiator_note, manager_note, created_at, updated_at,
      ticket:ticket_id(ticket_code, scheduled_date, start_time, end_time, site:site_id(name, site_code)),
      initiator:staff_id(staff_code, full_name),
      target:staff_id(staff_code, full_name)
    `)
    .is('archived_at', null)
    .order('requested_at', { ascending: false })
    .limit(500);

  if (periodId) query = query.eq('period_id', periodId);
  if (ticketId) query = query.eq('ticket_id', ticketId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, shiftTradeRequestSchema, API_PATH);
  if (validation.error) return validation.error;

  const payload = validation.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: tradeId, error } = await db.rpc('fn_request_shift_trade', {
    p_ticket_id: payload.ticket_id,
    p_request_type: payload.request_type,
    p_target_staff_id: payload.target_staff_id,
    p_initiator_note: payload.initiator_note,
  });

  if (error || !tradeId) {
    return problemResponse(SYS_002(error?.message ?? 'Failed to request shift trade', API_PATH));
  }

  const { data, error: fetchError } = await db
    .from('shift_trade_requests')
    .select('*')
    .eq('id', tradeId)
    .single();

  if (fetchError || !data) {
    return problemResponse(SYS_002(fetchError?.message ?? 'Trade created but fetch failed', API_PATH));
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'shift_trade_requests',
    entityId: String(tradeId),
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_trade_create'),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
