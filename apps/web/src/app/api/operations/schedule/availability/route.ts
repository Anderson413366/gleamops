import { NextRequest, NextResponse } from 'next/server';
import { staffAvailabilityRuleSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { getAvailabilityRules, createAvailabilityRule } from '@/modules/schedule';

const API_PATH = '/api/operations/schedule/availability';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const result = await getAvailabilityRules(getUserClient(request), request.nextUrl.searchParams.get('staffId'), API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, staffAvailabilityRuleSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await createAvailabilityRule(getUserClient(request), getServiceClient(), auth, request, validation.data, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
