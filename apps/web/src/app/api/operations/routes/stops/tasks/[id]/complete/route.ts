import { NextRequest, NextResponse } from 'next/server';
import { completeTaskSchema, createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { completeStopTask } from '@/modules/route-templates';

const API_PATH = '/api/operations/routes/stops/tasks/[id]/complete';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  let payload: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    const parsed = completeTaskSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
      return NextResponse.json(
        createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Task completion payload is invalid', API_PATH, errors),
        { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
      );
    }
    payload = parsed.data;
  } catch {
    payload = {};
  }

  const { id } = await params;
  const result = await completeStopTask(getUserClient(request), auth, id, payload, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
