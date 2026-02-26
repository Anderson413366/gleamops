import { NextRequest, NextResponse } from 'next/server';
import { getCustomerPortalInspection } from '@/modules/public-portal';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const result = await getCustomerPortalInspection(token, id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
