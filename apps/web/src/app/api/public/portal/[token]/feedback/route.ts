import { NextRequest, NextResponse } from 'next/server';
import { customerPortalFeedbackSchema } from '@gleamops/shared';
import { createCustomerPortalFeedback } from '@/modules/public-portal';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = customerPortalFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid feedback payload' }, { status: 400 });
  }

  const result = await createCustomerPortalFeedback(token, parsed.data, {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}
