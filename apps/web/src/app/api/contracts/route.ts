import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';

const INSTANCE = '/api/contracts';
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
    .from('contracts')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return problemResponse(
      createProblemDetails('CONTRACTS_001', 'Failed to load contracts', 500, error.message, INSTANCE),
    );
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId } = auth;
  const payload = await request.json();
  const db = getServiceClient();

  const insertPayload = {
    ...payload,
    tenant_id: tenantId,
  };

  const { data, error } = await db
    .from('contracts')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return problemResponse(
      createProblemDetails('CONTRACTS_002', 'Failed to create contract', 400, error.message, INSTANCE),
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

