import { NextRequest, NextResponse } from 'next/server';
import { microfiberEnrollSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { enrollMicrofiberSpecialist } from '@/modules/owner-dashboard';

const API_PATH = '/api/workforce/microfiber/[staffId]/enroll';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = microfiberEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid microfiber enroll payload.' },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const { staffId } = await params;
  const result = await enrollMicrofiberSpecialist(getUserClient(request), auth, staffId, parsed.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
