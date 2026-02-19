import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, fleetWorkflowSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { processFleetWorkflow } from '@/modules/fleet';

const API_PATH = '/api/operations/fleet/workflow';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, fleetWorkflowSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await processFleetWorkflow(auth, validation.data, request);

  if (!result.success) {
    return problemResponse(result.error);
  }

  return NextResponse.json(result.data);
}
