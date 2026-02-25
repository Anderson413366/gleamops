import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';

const INSTANCE = '/api/staff/link-self';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

interface StaffLinkRow {
  id: string;
  staff_code: string;
  full_name: string | null;
  user_id: string | null;
}

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const userClient = getUserClient(request);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return problemResponse(
      createProblemDetails('AUTH_001', 'Unauthorized', 401, userError?.message ?? 'Unable to resolve user', INSTANCE),
    );
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return problemResponse(
      createProblemDetails('STAFF_001', 'Email required', 400, 'User account has no email address.', INSTANCE),
    );
  }

  if (!user.email_confirmed_at) {
    return problemResponse(
      createProblemDetails('STAFF_009', 'Email verification required', 403, 'Verify your email before linking staff profile.', INSTANCE),
    );
  }

  const db = getServiceClient();

  const { data: existingLink, error: existingError } = await db
    .from('staff')
    .select('id, staff_code, full_name, user_id')
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .is('archived_at', null)
    .maybeSingle<StaffLinkRow>();

  if (existingError) {
    return problemResponse(
      createProblemDetails('STAFF_002', 'Lookup failed', 500, existingError.message, INSTANCE),
    );
  }

  if (existingLink) {
    return NextResponse.json({
      linked: true,
      staff: {
        id: existingLink.id,
        staff_code: existingLink.staff_code,
        full_name: existingLink.full_name,
      },
    });
  }

  const { data: matches, error: matchError } = await db
    .from('staff')
    .select('id, staff_code, full_name, user_id')
    .eq('tenant_id', auth.tenantId)
    .ilike('email', email)
    .is('archived_at', null)
    .limit(2);

  if (matchError) {
    return problemResponse(
      createProblemDetails('STAFF_003', 'Lookup failed', 500, matchError.message, INSTANCE),
    );
  }

  const matchedRows = (matches ?? []) as StaffLinkRow[];
  if (matchedRows.length === 0) {
    return NextResponse.json({ linked: false, reason: 'NO_MATCH' });
  }

  if (matchedRows.length > 1) {
    return problemResponse(
      createProblemDetails(
        'STAFF_004',
        'Ambiguous staff match',
        409,
        `Multiple active staff rows matched ${email}.`,
        INSTANCE,
      ),
    );
  }

  const target = matchedRows[0]!;
  if (target.user_id && target.user_id !== auth.userId) {
    return problemResponse(
      createProblemDetails(
        'STAFF_005',
        'Staff row already linked',
        409,
        `${target.staff_code} is already linked to another user.`,
        INSTANCE,
      ),
    );
  }

  if (!target.user_id) {
    const { error: updateError } = await db
      .from('staff')
      .update({ user_id: auth.userId })
      .eq('tenant_id', auth.tenantId)
      .eq('id', target.id)
      .is('archived_at', null)
      .is('user_id', null);

    if (updateError) {
      return problemResponse(
        createProblemDetails('STAFF_006', 'Link failed', 500, updateError.message, INSTANCE),
      );
    }
  }

  const { data: linkedRow, error: linkedError } = await db
    .from('staff')
    .select('id, staff_code, full_name, user_id')
    .eq('tenant_id', auth.tenantId)
    .eq('id', target.id)
    .is('archived_at', null)
    .maybeSingle<StaffLinkRow>();

  if (linkedError || !linkedRow) {
    return problemResponse(
      createProblemDetails('STAFF_007', 'Link verification failed', 500, linkedError?.message ?? 'Missing row', INSTANCE),
    );
  }

  if (linkedRow.user_id !== auth.userId) {
    return problemResponse(
      createProblemDetails(
        'STAFF_008',
        'Link verification failed',
        409,
        `${linkedRow.staff_code} is linked to a different user.`,
        INSTANCE,
      ),
    );
  }

  return NextResponse.json({
    linked: true,
    staff: {
      id: linkedRow.id,
      staff_code: linkedRow.staff_code,
      full_name: linkedRow.full_name,
    },
  });
}
