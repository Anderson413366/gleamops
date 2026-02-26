import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { getTonightBoard } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/tonight-board';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const result = await getTonightBoard(getUserClient(request), auth, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
