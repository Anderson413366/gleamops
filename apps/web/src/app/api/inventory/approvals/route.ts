import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, procurementApprovalActionSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { processApproval } from '@/modules/inventory';

const INSTANCE = '/api/inventory/approvals';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, procurementApprovalActionSchema, INSTANCE);
  if (validation.error) return validation.error;

  const result = await processApproval(auth, validation.data, request);

  if (!result.success) {
    return problemResponse(result.error);
  }

  return NextResponse.json(result.data);
}
