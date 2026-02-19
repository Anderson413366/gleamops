import { NextRequest, NextResponse } from 'next/server';
import { savePublicCount } from '@/modules/public-counts';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const result = await savePublicCount(token, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
