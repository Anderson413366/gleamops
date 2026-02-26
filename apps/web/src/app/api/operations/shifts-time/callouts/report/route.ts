import { NextRequest, NextResponse } from 'next/server';
import { reportCalloutSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { reportCalloutRpc } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/callouts/report';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, reportCalloutSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await reportCalloutRpc(
    getUserClient(request),
    auth,
    validation.data,
    API_PATH,
  );

  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 201 });
}
