import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';

const INSTANCE = '/api/issues';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId } = auth;
  const status = request.nextUrl.searchParams.get('status');
  const db = getServiceClient();

  let query = db
    .from('issues')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('reported_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return problemResponse(
      createProblemDetails('ISSUES_001', 'Failed to load issues', 500, error.message, INSTANCE),
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId, userId } = auth;
  const payload = await request.json();
  const db = getServiceClient();

  const insertPayload = {
    ...payload,
    tenant_id: tenantId,
    reported_by_user_id: payload.reported_by_user_id ?? userId,
  };

  const { data, error } = await db
    .from('issues')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return problemResponse(
      createProblemDetails('ISSUES_002', 'Failed to create issue', 400, error.message, INSTANCE),
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

