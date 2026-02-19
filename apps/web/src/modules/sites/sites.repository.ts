/**
 * Sites data access layer.
 * Supabase queries for site-specific operations.
 * Extracted from api/sites/[id]/pin/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findSite(
  db: SupabaseClient,
  tenantId: string,
  siteId: string,
) {
  return db
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function createPinViaRpc(
  db: SupabaseClient,
  tenantId: string,
  siteId: string,
  pin: string,
  label: string,
  isActive: boolean,
  expiresAt: string | null,
) {
  return db.rpc('fn_create_site_pin', {
    p_tenant_id: tenantId,
    p_site_id: siteId,
    p_pin: pin,
    p_label: label,
    p_is_active: isActive,
    p_expires_at: expiresAt,
  });
}

export async function createPinFallback(
  db: SupabaseClient,
  tenantId: string,
  siteId: string,
  pin: string,
  label: string,
  isActive: boolean,
  expiresAt: string | null,
) {
  return db
    .from('site_pin_codes')
    .insert({
      tenant_id: tenantId,
      site_id: siteId,
      pin_hash: pin,
      label,
      is_active: isActive,
      expires_at: expiresAt,
    });
}
