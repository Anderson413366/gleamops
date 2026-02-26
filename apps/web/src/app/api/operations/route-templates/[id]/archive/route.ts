import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { archiveRouteTemplateById } from '@/modules/route-templates';

const API_PATH = '/api/operations/route-templates/[id]/archive';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const archiveSchema = z.object({ reason: z.string().max(500).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  let reason = '';
  try {
    const raw = await request.json();
    const parsed = archiveSchema.safeParse(raw);
    reason = parsed.success ? parsed.data.reason ?? '' : '';
  } catch {
    reason = '';
  }

  const { id } = await params;
  const result = await archiveRouteTemplateById(getUserClient(request), auth, id, reason, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
