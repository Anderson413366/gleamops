import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { canManageShiftsTimePayroll, createPayrollMappingTemplate, getAllPayrollMappings, getTonightBoard } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/payroll/mappings';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const createSchema = z.object({
  template_name: z.string().min(1).max(200),
  provider_code: z.string().max(120).nullable().optional(),
  delimiter: z.enum([',', ';', '\t', '|']).optional(),
  include_header: z.boolean().optional(),
  quote_all: z.boolean().optional(),
  decimal_separator: z.enum(['.', ',']).optional(),
  date_format: z.string().max(40).optional(),
  is_default: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  if (!canManageShiftsTimePayroll(auth.roles)) {
    return NextResponse.json(
      {
        code: 'AUTH_002',
        title: 'Forbidden',
        status: 403,
        detail: 'Payroll mapping access requires manager privileges.',
        instance: API_PATH,
      },
      { status: 403, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true';

  if (includeInactive) {
    const result = await getAllPayrollMappings(getUserClient(request), auth, API_PATH);
    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error.status,
        headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
      });
    }
    return NextResponse.json({ success: true, data: { mappings: result.data } });
  }

  const result = await getTonightBoard(getUserClient(request), auth, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  const payload = result.data as {
    payroll_mappings?: unknown[];
    features?: { payroll_export?: boolean };
  };

  return NextResponse.json({
    success: true,
    data: {
      payroll_export_enabled: Boolean(payload.features?.payroll_export),
      mappings: payload.payroll_mappings ?? [],
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, createSchema, API_PATH);
  if (validation.error) return validation.error;

  const result = await createPayrollMappingTemplate(
    getUserClient(request),
    auth,
    validation.data,
    API_PATH,
  );

  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 201 });
}
