import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';

const INSTANCE = '/api/payroll/runs';
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
  const db = getServiceClient();

  const { data, error } = await db
    .from('payroll_runs')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return problemResponse(
      createProblemDetails('PAY_001', 'Failed to load payroll runs', 500, error.message, INSTANCE),
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

  const { data, error } = await db
    .from('payroll_runs')
    .insert({
      ...payload,
      tenant_id: tenantId,
    })
    .select('*')
    .single();

  if (error) {
    return problemResponse(
      createProblemDetails('PAY_002', 'Failed to create payroll run', 400, error.message, INSTANCE),
    );
  }

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: 'payroll_runs',
    entityId: data?.id ?? null,
    entityCode: null,
    action: 'CREATE',
    before: null,
    after: (data as Record<string, unknown>) ?? null,
    context: extractAuditContext(request, 'payroll_run_create'),
  });

  return NextResponse.json({ data }, { status: 201 });
}
