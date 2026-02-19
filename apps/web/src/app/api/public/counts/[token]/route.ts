import { NextRequest, NextResponse } from 'next/server';
import { getPublicCount } from '@/modules/public-counts';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const result = await getPublicCount(token);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
