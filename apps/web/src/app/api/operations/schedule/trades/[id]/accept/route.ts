import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';

const API_PATH = '/api/operations/schedule/trades/[id]/accept';
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

  const { id } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { error } = await db.rpc('fn_accept_shift_trade', { p_trade_id: id });
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  const { data, error: fetchError } = await db
    .from('shift_trade_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !data) return problemResponse(SYS_002(fetchError?.message ?? 'Unable to fetch trade', API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'shift_trade_requests',
    entityId: id,
    action: 'ACCEPT',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, 'schedule_trade_accept'),
  });

  return NextResponse.json({ success: true, data });
}
