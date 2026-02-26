import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeStopActionSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { completeRouteStopRpc } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/stops/[id]/complete';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, routeStopActionSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { code: 'VALIDATION_001', title: 'Validation failed', status: 400, detail: 'Invalid id format', instance: API_PATH },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }
  const result = await completeRouteStopRpc(
    getUserClient(request),
    auth,
    parsedId.data,
    validation.data.note ?? null,
    API_PATH,
  );

  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
