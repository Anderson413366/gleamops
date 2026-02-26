import { NextRequest, NextResponse } from 'next/server';
import { nightBridgeReviewSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { reviewNightBridgeShift } from '@/modules/night-bridge';

const API_PATH = '/api/operations/night-bridge/[routeId]/review';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, nightBridgeReviewSchema, API_PATH);
  if (validation.error) return validation.error;

  const { routeId } = await params;
  const result = await reviewNightBridgeShift(getUserClient(request), auth, routeId, validation.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
