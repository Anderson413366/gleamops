import { NextRequest, NextResponse } from 'next/server';
import {
  customerPortalSessionCreateSchema,
  customerPortalSessionsQuerySchema,
  createProblemDetails,
} from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { hasAnyRole } from '@/lib/api/role-guard';
import {
  createCustomerPortalSession,
  getCustomerPortalSessions,
} from '@/modules/public-portal';

const API_PATH = '/api/operations/customer-portal/sessions';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const ALLOWED_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'] as const;

function deny() {
  return NextResponse.json(
    createProblemDetails('AUTH_002', 'Forbidden', 403, 'You do not have permission to access customer portal sessions.', API_PATH),
    { status: 403, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
  );
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!hasAnyRole(auth.roles, ALLOWED_ROLES)) return deny();

  const parsed = customerPortalSessionsQuerySchema.safeParse({
    client_id: request.nextUrl.searchParams.get('client_id') ?? undefined,
    include_inactive: request.nextUrl.searchParams.get('include_inactive') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid customer portal session filters.', API_PATH),
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await getCustomerPortalSessions(auth.tenantId, parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!hasAnyRole(auth.roles, ALLOWED_ROLES)) return deny();

  const body = await request.json().catch(() => ({}));
  const parsed = customerPortalSessionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid customer portal session payload.', API_PATH),
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await createCustomerPortalSession(auth.tenantId, parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}
