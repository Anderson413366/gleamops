import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { patchPayrollMappingTemplate, archivePayrollMappingTemplate } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/payroll/mappings/[id]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const patchSchema = z.object({
  template_name: z.string().min(1).max(200).optional(),
  provider_code: z.string().max(120).nullable().optional(),
  delimiter: z.enum([',', ';', '\t', '|']).optional(),
  include_header: z.boolean().optional(),
  quote_all: z.boolean().optional(),
  decimal_separator: z.enum(['.', ',']).optional(),
  date_format: z.string().max(40).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, patchSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { code: 'VALIDATION_001', title: 'Validation failed', status: 400, detail: 'Invalid id format', instance: API_PATH },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await patchPayrollMappingTemplate(
    getUserClient(request),
    auth,
    parsedId.data,
    validation.data,
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const result = await archivePayrollMappingTemplate(
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

  return NextResponse.json({ success: true, data: result.data });
}
