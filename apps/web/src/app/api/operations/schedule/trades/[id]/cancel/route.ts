import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { cancelShiftTrade } from '@/modules/schedule';

const API_PATH = '/api/operations/schedule/trades/[id]/cancel';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const result = await cancelShiftTrade(getUserClient(request), getServiceClient(), auth, request, id, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data });
}
