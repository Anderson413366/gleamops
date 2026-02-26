import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, nightBridgeListQuerySchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { getNightBridgeSummaries } from '@/modules/night-bridge';

const API_PATH = '/api/operations/night-bridge';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const parsed = nightBridgeListQuerySchema.safeParse({
    date: request.nextUrl.searchParams.get('date') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return NextResponse.json(
      createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid Night Bridge filters', API_PATH, errors),
      {
        status: 400,
        headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
      },
    );
  }

  const result = await getNightBridgeSummaries(
    getUserClient(request),
    auth,
    {
      date: parsed.data.date ?? null,
      status: parsed.data.status ?? null,
    },
    API_PATH,
  );

  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
