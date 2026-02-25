import { NextRequest, NextResponse } from 'next/server';
import { getPublicPortal } from '@/modules/public-portal';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const result = await getPublicPortal(token);
  if (!result.success) {
    const safeError = result.status >= 500 ? 'Portal is temporarily unavailable' : result.error;
    return NextResponse.json({ error: safeError }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
