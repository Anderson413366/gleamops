import { NextRequest, NextResponse } from 'next/server';
import { supplyCostsQuerySchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { getSupplyCosts } from '@/modules/owner-dashboard';

const API_PATH = '/api/reports/supply-costs';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const parsed = supplyCostsQuerySchema.safeParse({
    date_from: request.nextUrl.searchParams.get('date_from') ?? undefined,
    date_to: request.nextUrl.searchParams.get('date_to') ?? undefined,
    site_id: request.nextUrl.searchParams.get('site_id') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid supply cost filters.' },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await getSupplyCosts(getUserClient(request), auth, parsed.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
