/**
 * Inventory orders data access layer.
 * All Supabase queries for the proof-of-delivery domain.
 * Extracted from api/inventory/orders/[id]/pod/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findProofOfDelivery(
  db: SupabaseClient,
  tenantId: string,
  orderId: string,
) {
  return db
    .from('supply_order_deliveries')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findOrder(
  db: SupabaseClient,
  tenantId: string,
  orderId: string,
) {
  return db
    .from('supply_orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function verifyFileOwnership(
  db: SupabaseClient,
  tenantId: string,
  fileIds: string[],
) {
  return db
    .from('files')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', fileIds);
}

export async function upsertProofOfDelivery(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('supply_order_deliveries')
    .upsert(payload, { onConflict: 'tenant_id,order_id' })
    .select('*')
    .single();
}

export async function updateOrderStatus(
  db: SupabaseClient,
  tenantId: string,
  orderId: string,
  status: string,
  deliveredAt: string,
) {
  return db
    .from('supply_orders')
    .update({ status, delivered_at: deliveredAt })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);
}
