import { NextRequest, NextResponse } from 'next/server';
import {
  createProblemDetails,
  fieldReportCreateSchema,
  fieldReportListQuerySchema,
} from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { createFieldReport, getFieldReports } from '@/modules/field-reports';

const API_PATH = '/api/operations/field-reports';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const parsed = fieldReportListQuerySchema.safeParse({
    report_type: request.nextUrl.searchParams.get('report_type') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
    site_id: request.nextUrl.searchParams.get('site_id') ?? undefined,
  });
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return NextResponse.json(
      createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid field report filters', API_PATH, errors),
      {
        status: 400,
        headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
      },
    );
  }

  const result = await getFieldReports(getUserClient(request), auth, parsed.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, fieldReportCreateSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await createFieldReport(getUserClient(request), auth, validation.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}

