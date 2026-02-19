import { NextRequest, NextResponse } from 'next/server';
import { signPublicProposal } from '@/modules/public-proposals';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  let body: {
    signer_name: string;
    signer_email: string;
    signature_type_code: string;
    signature_data: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.signer_name?.trim() || !body.signer_email?.trim() || !body.signature_data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await signPublicProposal(
    token,
    body,
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
    request.headers.get('user-agent') ?? null,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
