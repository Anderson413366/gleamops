import { NextRequest, NextResponse } from 'next/server';
import { completePublicWorkOrder } from '@/modules/public-work-orders';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  let body: {
    signerName?: string;
    signerEmail?: string;
    notes?: string;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
    supervisorSignOff?: boolean;
    clientSignOff?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = await completePublicWorkOrder(token, body, {
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
