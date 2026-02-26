import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, routeTemplateStopSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { addRouteTemplateStop } from '@/modules/route-templates';

const API_PATH = '/api/operations/route-templates/[id]/stops';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const stopInputSchema = routeTemplateStopSchema.omit({ template_id: true });

function validationProblem(detail: string, errors?: Array<{ field: string; message: string }>) {
  return createProblemDetails('VALIDATION_001', 'Validation failed', 400, detail, API_PATH, errors);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(validationProblem('Request body must be valid JSON'), {
      status: 400,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  const parsed = stopInputSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return NextResponse.json(validationProblem('Stop payload is invalid', errors), {
      status: 400,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  const { id } = await params;
  const result = await addRouteTemplateStop(getUserClient(request), auth, id, parsed.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
