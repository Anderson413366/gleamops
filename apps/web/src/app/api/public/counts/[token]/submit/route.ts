import { NextRequest, NextResponse } from 'next/server';
import { submitCount } from '@/modules/counts';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return json({ error: 'Missing token' }, 400);

  const payload = await request.json().catch(() => null);
  if (!payload) return json({ error: 'Invalid request body' }, 400);

  const result = await submitCount(token, payload);

  if (!result.success) {
    const body = result.extra
      ? { error: result.error, ...result.extra }
      : { error: result.error };
    return json(body, result.status);
  }

  return json(result.data);
}
