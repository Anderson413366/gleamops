/**
 * Warehouse data access layer.
 * Multi-resource CRUD for warehouse/inventory tables.
 * Extracted from api/inventory/warehouse/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

const RESOURCE_TO_TABLE: Record<string, string> = {
  locations: 'inventory_locations',
  items: 'items',
  movements: 'stock_movements',
  'stock-levels': 'stock_levels',
};

export function resolveTable(resource: string): string {
  return RESOURCE_TO_TABLE[resource] ?? 'stock_levels';
}

const ALLOWED_TABLES = new Set([
  'inventory_locations',
  'items',
  'stock_levels',
  'stock_movements',
  'purchase_orders',
  'supply_requests',
]);

export function isAllowedTable(table: string): boolean {
  return ALLOWED_TABLES.has(table);
}

export async function listRecords(
  db: SupabaseClient,
  table: string,
  tenantId: string,
) {
  return db
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .limit(500);
}

export async function insertRecord(
  db: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
) {
  return db
    .from(table)
    .insert(payload)
    .select('*')
    .single();
}
