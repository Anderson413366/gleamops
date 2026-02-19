import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, messageThreadSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { createThread } from '@/modules/messages';

const INSTANCE = '/api/messages';
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

    const validation = await validateBody(request, messageThreadSchema, INSTANCE);
    if (validation.error) return validation.error;

    const result = await createThread(auth.tenantId, auth.userId, validation.data);

    if (!result.success) {
      return problemResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    console.error('[messages] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return problemResponse(createProblemDetails('SYS_002', 'Internal server error', 500, message, INSTANCE));
  }
}
