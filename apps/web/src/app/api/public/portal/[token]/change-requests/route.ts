import { NextRequest, NextResponse } from 'next/server';
import { submitPublicPortalChangeRequest } from '@/modules/public-portal';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = await submitPublicPortalChangeRequest(token, payload, {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });

  if (!result.success) {
    const safeError = result.status >= 500 ? 'Request could not be submitted right now' : result.error;
    return NextResponse.json({ error: safeError }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
