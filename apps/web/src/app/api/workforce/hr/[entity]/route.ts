import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { resolveEntity, getHrRecords, createHrRecord } from '@/modules/workforce-hr';

const API_PATH = '/api/workforce/hr/[entity]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { entity } = await params;
  const staffId = request.nextUrl.searchParams.get('staffId');
  const status = request.nextUrl.searchParams.get('status');
  const result = await getHrRecords(auth.tenantId, entity, staffId, status, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { entity } = await params;
  const config = resolveEntity(entity);
  if (!config) {
    const pd = createProblemDetails('HR_404', 'Unknown HR entity', 404, `Unsupported HR entity: ${entity}`, API_PATH);
    return NextResponse.json(pd, { status: 404, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  }

  const validation = await validateBody(request, config.schema, API_PATH);
  if (validation.error) return validation.error;

  const result = await createHrRecord(auth, request, entity, validation.data as Record<string, unknown>, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}
