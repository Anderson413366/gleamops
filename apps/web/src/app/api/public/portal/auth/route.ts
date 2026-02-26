import { NextRequest, NextResponse } from 'next/server';
import { customerPortalAuthSchema } from '@gleamops/shared';
import { authCustomerPortal } from '@/modules/public-portal';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = customerPortalAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
  }

  const result = await authCustomerPortal(parsed.data.token);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
