import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';

const INSTANCE = '/api/auth/context';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function normalizeRole(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: NextRequest) {
  const userClient = getUserClient(request);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return problemResponse(
      createProblemDetails('AUTH_001', 'Unauthorized', 401, userError?.message ?? 'Invalid session', INSTANCE),
    );
  }

  const db = getServiceClient();

  const membership = await db
    .from('tenant_memberships')
    .select('tenant_id, role_code, created_at')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ tenant_id: string | null; role_code: string | null }>();

  if (membership.error) {
    return problemResponse(
      createProblemDetails('AUTH_004', 'Membership lookup failed', 500, membership.error.message, INSTANCE),
    );
  }

  if (membership.data?.tenant_id) {
    return NextResponse.json({
      userId: user.id,
      tenantId: membership.data.tenant_id,
      role: normalizeRole(membership.data.role_code),
      source: 'membership',
    });
  }

  const staffByUser = await db
    .from('staff')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle<{ tenant_id: string | null; role: string | null }>();

  if (staffByUser.error) {
    return problemResponse(
      createProblemDetails('AUTH_005', 'Staff lookup failed', 500, staffByUser.error.message, INSTANCE),
    );
  }

  if (staffByUser.data?.tenant_id) {
    return NextResponse.json({
      userId: user.id,
      tenantId: staffByUser.data.tenant_id,
      role: normalizeRole(staffByUser.data.role),
      source: 'staff_user',
    });
  }

  const email = user.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return NextResponse.json({
      userId: user.id,
      tenantId: null,
      role: null,
      source: 'none',
    });
  }

  const staffByEmail = await db
    .from('staff')
    .select('tenant_id, role')
    .ilike('email', email)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle<{ tenant_id: string | null; role: string | null }>();

  if (staffByEmail.error) {
    return problemResponse(
      createProblemDetails('AUTH_006', 'Staff lookup failed', 500, staffByEmail.error.message, INSTANCE),
    );
  }

  return NextResponse.json({
    userId: user.id,
    tenantId: staffByEmail.data?.tenant_id ?? null,
    role: normalizeRole(staffByEmail.data?.role ?? null),
    source: staffByEmail.data?.tenant_id ? 'staff_email' : 'none',
  });
}
