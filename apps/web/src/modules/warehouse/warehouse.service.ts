/**
 * Warehouse service.
 * Business logic for multi-resource warehouse CRUD.
 * Extracted verbatim from api/inventory/warehouse/route.ts
 */
import type { NextRequest } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import type { AuthContext } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import {
  createDb,
  resolveTable,
  isAllowedTable,
  listRecords,
  insertRecord,
} from './warehouse.repository';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function getWarehouseRecords(
  tenantId: string,
  resource: string,
  apiPath: string,
): Promise<ServiceResult<{ resource: string; data: unknown[] }>> {
  const table = resolveTable(resource);
  const db = createDb();

  const { data, error } = await listRecords(db, table, tenantId);
  if (error) {
    return { success: false, error: createProblemDetails('INV_001', 'Failed to load warehouse data', 500, error.message, apiPath) };
  }

  return { success: true, data: { resource, data: data ?? [] } };
}

export async function createWarehouseRecord(
  auth: AuthContext,
  request: NextRequest,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<{ table: string; data: unknown }>> {
  const { tenantId, userId } = auth;
  const table = (payload?.table as string | undefined) ?? 'stock_movements';

  if (!isAllowedTable(table)) {
    return { success: false, error: createProblemDetails('INV_002', 'Invalid warehouse table', 400, `Unsupported table: ${table}`, apiPath) };
  }

  const db = createDb();

  const insertPayload = {
    ...payload,
    tenant_id: tenantId,
  };
  delete (insertPayload as Record<string, unknown>).table;

  const { data, error } = await insertRecord(db, table, insertPayload);
  if (error) {
    return { success: false, error: createProblemDetails('INV_003', 'Failed to create warehouse record', 400, error.message, apiPath) };
  }

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: table,
    entityId: data?.id ?? null,
    entityCode: null,
    action: 'CREATE',
    before: null,
    after: (data as Record<string, unknown>) ?? null,
    context: extractAuditContext(request, `warehouse_${table}_create`),
  });

  return { success: true, data: { table, data } };
}
