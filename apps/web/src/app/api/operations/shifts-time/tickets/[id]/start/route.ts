import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { startWorkTicketExecution } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/tickets/[id]/start';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { code: 'VALIDATION_001', title: 'Validation failed', status: 400, detail: 'Invalid id format', instance: API_PATH },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await startWorkTicketExecution(
    getUserClient(request),
    auth,
    parsedId.data,
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
