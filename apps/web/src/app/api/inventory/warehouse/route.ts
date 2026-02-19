import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getWarehouseRecords, createWarehouseRecord } from '@/modules/warehouse';

const INSTANCE = '/api/inventory/warehouse';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const resource = request.nextUrl.searchParams.get('resource') ?? 'stock-levels';
  const result = await getWarehouseRecords(auth.tenantId, resource, INSTANCE);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const payload = await request.json();
  const result = await createWarehouseRecord(auth, request, payload, INSTANCE);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json(result.data, { status: 201 });
}
