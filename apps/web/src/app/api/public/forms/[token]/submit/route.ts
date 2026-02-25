import { NextRequest, NextResponse } from 'next/server';
import { submitPublicForm } from '@/modules/self-service';

interface PublicFormSubmitBody {
  requestType: string;
  urgency?: string | null;
  siteId?: string | null;
  title?: string | null;
  submittedBy?: string | null;
  details?: Record<string, unknown> | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  let body: PublicFormSubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.requestType) {
    return NextResponse.json({ error: 'requestType is required' }, { status: 400 });
  }

  const result = await submitPublicForm(token, body, {
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
