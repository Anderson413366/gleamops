import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { getPayrollMappingFields, replacePayrollMappingFieldSet } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/payroll/mappings/[id]/fields';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const replaceSchema = z.object({
  fields: z.array(z.object({
    output_column_name: z.string().min(1).max(200),
    source_field: z.string().max(200).nullable().optional(),
    static_value: z.string().max(500).nullable().optional(),
    transform_config: z.record(z.string(), z.unknown()).nullable().optional(),
    is_required: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
  })).min(1),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const result = await getPayrollMappingFields(getUserClient(request), auth, parsedId.data, API_PATH);

  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, replaceSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { code: 'VALIDATION_001', title: 'Validation failed', status: 400, detail: 'Invalid id format', instance: API_PATH },
      { status: 400, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } },
    );
  }

  const result = await replacePayrollMappingFieldSet(
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

  return NextResponse.json({ success: true, data: result.data }, { status: result.status ?? 200 });
}
