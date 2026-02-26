import { NextRequest, NextResponse } from 'next/server';
import { getCustomerPortalInspections } from '@/modules/public-portal';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const result = await getCustomerPortalInspections(token);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
