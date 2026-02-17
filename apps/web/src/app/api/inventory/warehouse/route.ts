import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getServiceClient } from '@/lib/api/service-client';

const INSTANCE = '/api/inventory/warehouse';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId } = auth;
  const db = getServiceClient();
  const resource = request.nextUrl.searchParams.get('resource') ?? 'stock-levels';

  const table =
    resource === 'locations'
      ? 'inventory_locations'
      : resource === 'items'
        ? 'items'
        : resource === 'movements'
          ? 'stock_movements'
          : 'stock_levels';

  const { data, error } = await db
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .limit(500);

  if (error) {
    return problemResponse(
      createProblemDetails('INV_001', 'Failed to load warehouse data', 500, error.message, INSTANCE),
    );
  }

  return NextResponse.json({ resource, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId } = auth;
  const payload = await request.json();
  const db = getServiceClient();
  const table = (payload?.table as string | undefined) ?? 'stock_movements';

  const allowed = new Set([
    'inventory_locations',
    'items',
    'stock_levels',
    'stock_movements',
    'purchase_orders',
    'supply_requests',
  ]);
  if (!allowed.has(table)) {
    return problemResponse(
      createProblemDetails('INV_002', 'Invalid warehouse table', 400, `Unsupported table: ${table}`, INSTANCE),
    );
  }

  const insertPayload = {
    ...payload,
    tenant_id: tenantId,
  };
  delete (insertPayload as Record<string, unknown>).table;

  const { data, error } = await db
    .from(table)
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return problemResponse(
      createProblemDetails('INV_003', 'Failed to create warehouse record', 400, error.message, INSTANCE),
    );
  }

  return NextResponse.json({ table, data }, { status: 201 });
}

