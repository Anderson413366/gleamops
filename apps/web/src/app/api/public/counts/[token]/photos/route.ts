import { NextRequest, NextResponse } from 'next/server';
import { uploadPublicCountPhoto } from '@/modules/public-counts';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const itemId = String(formData.get('itemId') ?? '').trim();
  const file = formData.get('file');

  if (!itemId) {
    return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are allowed.' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 8MB or smaller.' }, { status: 400 });
  }

  const result = await uploadPublicCountPhoto(token, itemId, file);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
