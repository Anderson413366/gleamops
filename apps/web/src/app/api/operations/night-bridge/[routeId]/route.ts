import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { getNightBridgeDetail } from '@/modules/night-bridge';

const API_PATH = '/api/operations/night-bridge/[routeId]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { routeId } = await params;
  const result = await getNightBridgeDetail(getUserClient(request), auth, routeId, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
