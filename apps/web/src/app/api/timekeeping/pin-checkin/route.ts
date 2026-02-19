import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, pinCheckinSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { processPinCheckin } from '@/modules/timekeeping';

const INSTANCE = '/api/timekeeping/pin-checkin';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await extractAuth(request, INSTANCE);
    if (isAuthError(auth)) return auth;

    const validation = await validateBody(request, pinCheckinSchema, INSTANCE);
    if (validation.error) return validation.error;

    const result = await processPinCheckin(auth.tenantId, validation.data);

    if (!result.success) {
      return problemResponse(result.error);
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return problemResponse(SYS_002(message, INSTANCE));
  }
}
