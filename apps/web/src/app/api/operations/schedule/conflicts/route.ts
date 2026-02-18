import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';

const API_PATH = '/api/operations/schedule/conflicts';
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
  const severity = request.nextUrl.searchParams.get('severity');
  const blockingOnly = request.nextUrl.searchParams.get('blockingOnly') === 'true';
  const db = getUserClient(request);

  let query = db
    .from('schedule_conflicts')
    .select('id, period_id, ticket_id, staff_id, conflict_type, severity, message, payload, is_blocking, created_at, resolved_at')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (periodId) query = query.eq('period_id', periodId);
  if (severity) query = query.eq('severity', severity);
  if (blockingOnly) query = query.eq('is_blocking', true);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}
