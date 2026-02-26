import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { hasAnyRole } from '@/lib/api/role-guard';
import { deactivateCustomerPortalSession } from '@/modules/public-portal';

const API_PATH = '/api/operations/customer-portal/sessions/[id]/archive';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const ALLOWED_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'] as const;

function deny() {
  return NextResponse.json(
    createProblemDetails('AUTH_002', 'Forbidden', 403, 'You do not have permission to archive customer portal sessions.', API_PATH),
    { status: 403, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!hasAnyRole(auth.roles, ALLOWED_ROLES)) return deny();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null;
  const result = await deactivateCustomerPortalSession(auth.tenantId, id, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
