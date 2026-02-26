import { NextRequest, NextResponse } from 'next/server';
import { getCustomerPortalDashboard, getPublicPortal } from '@/modules/public-portal';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const customerPortalResult = await getCustomerPortalDashboard(token);
  if (customerPortalResult.success) {
    return NextResponse.json({ success: true, data: customerPortalResult.data });
  }

  // Backward compatibility for proposal-linked tokens.
  const legacyResult = await getPublicPortal(token);
  if (!legacyResult.success) {
    const safeError = legacyResult.status >= 500 ? 'Portal is temporarily unavailable' : legacyResult.error;
    return NextResponse.json({ error: safeError }, { status: legacyResult.status });
  }

  return NextResponse.json(legacyResult.data);
}
