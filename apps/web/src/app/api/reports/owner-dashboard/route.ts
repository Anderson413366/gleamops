import { NextRequest, NextResponse } from 'next/server';
import { ownerDashboardQuerySchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { getOwnerDashboard } from '@/modules/owner-dashboard';

const API_PATH = '/api/reports/owner-dashboard';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const parsed = ownerDashboardQuerySchema.safeParse({
    date_from: request.nextUrl.searchParams.get('date_from') ?? undefined,
    date_to: request.nextUrl.searchParams.get('date_to') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid date filters.' },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await getOwnerDashboard(getUserClient(request), auth, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
