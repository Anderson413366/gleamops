import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';

const INSTANCE = '/api/codes/next';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const PREFIX_PATTERN = /^[A-Z][A-Z0-9_]{1,9}$/;

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemResponse(
      createProblemDetails('CODES_001', 'Invalid request', 400, 'Request body must be valid JSON', INSTANCE),
    );
  }

  const prefixRaw = typeof payload === 'object' && payload !== null ? (payload as { prefix?: unknown }).prefix : undefined;
  const prefix = typeof prefixRaw === 'string' ? prefixRaw.trim().toUpperCase() : '';
  if (!PREFIX_PATTERN.test(prefix)) {
    return problemResponse(
      createProblemDetails(
        'CODES_002',
        'Invalid prefix',
        400,
        'Prefix must start with a letter and contain only A-Z, 0-9, or underscore (2-10 chars).',
        INSTANCE,
      ),
    );
  }

  const db = getServiceClient();
  const { data, error } = await db.rpc('next_code', { p_tenant_id: auth.tenantId, p_prefix: prefix });
  if (error || typeof data !== 'string' || !data.trim()) {
    return problemResponse(
      createProblemDetails('CODES_003', 'Failed to generate code', 500, error?.message ?? 'Unknown error', INSTANCE),
    );
  }

  return NextResponse.json({ data });
}
