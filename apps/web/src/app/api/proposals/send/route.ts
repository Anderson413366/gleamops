import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, proposalSendSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { sendProposal } from '@/modules/proposals';

const INSTANCE = '/api/proposals/send';
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

    const validation = await validateBody(request, proposalSendSchema, INSTANCE);
    if (validation.error) return validation.error;

    const result = await sendProposal(auth.tenantId, validation.data);

    if (!result.success) {
      return problemResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[proposal-send] Unexpected error:', err);
    return problemResponse(SYS_002(message, INSTANCE));
  }
}
