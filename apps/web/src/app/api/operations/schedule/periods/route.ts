import { NextRequest, NextResponse } from 'next/server';
import { schedulePeriodSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { getSchedulePeriods, createSchedulePeriod } from '@/modules/schedule';

const API_PATH = '/api/operations/schedule/periods';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const result = await getSchedulePeriods(
    getUserClient(request),
    {
      siteId: request.nextUrl.searchParams.get('siteId'),
      status: request.nextUrl.searchParams.get('status'),
      start: request.nextUrl.searchParams.get('start'),
      end: request.nextUrl.searchParams.get('end'),
    },
    API_PATH,
  );
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, schedulePeriodSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await createSchedulePeriod(getUserClient(request), getServiceClient(), auth, request, validation.data, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
