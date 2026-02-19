/**
 * Fleet data access layer.
 * Extracted from api/operations/fleet/workflow/route.ts
 */
import { getServiceClient } from '@/lib/api/service-client';
import { writeAuditMutation } from '@/lib/api/audit';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function insertCheckout(
  db: SupabaseClient,
  row: Record<string, unknown>,
) {
  return db.from('vehicle_checkouts').insert(row).select('*').single();
}

export async function insertDvirLog(
  db: SupabaseClient,
  row: Record<string, unknown>,
) {
  return db.from('vehicle_dvir_logs').insert(row);
}

export async function findCheckout(
  db: SupabaseClient,
  tenantId: string,
  checkoutId: string,
) {
  return db.from('vehicle_checkouts').select('*').eq('tenant_id', tenantId).eq('id', checkoutId).single();
}

export async function updateCheckoutReturn(
  db: SupabaseClient,
  tenantId: string,
  checkoutId: string,
  patch: Record<string, unknown>,
) {
  return db.from('vehicle_checkouts').update(patch).eq('tenant_id', tenantId).eq('id', checkoutId).select('*').single();
}

export async function insertFuelLog(
  db: SupabaseClient,
  row: Record<string, unknown>,
) {
  return db.from('vehicle_fuel_logs').insert(row);
}

export { writeAuditMutation };
