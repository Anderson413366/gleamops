/**
 * Inventory counts data access layer.
 * Extracted from api/public/counts/[token]/submit/route.ts
 */
import { createClient } from '@supabase/supabase-js';

export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function findCountByToken(db: ReturnType<typeof createDb>, token: string) {
  return db
    .from('inventory_counts')
    .select('id, site_id, count_date, status, tenant_id')
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountByCode(db: ReturnType<typeof createDb>, code: string) {
  return db
    .from('inventory_counts')
    .select('id, site_id, count_date, status, tenant_id')
    .eq('count_code', code)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountDetails(db: ReturnType<typeof createDb>, countId: string) {
  return db
    .from('inventory_count_details')
    .select('id, actual_qty')
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function updateCountDetail(
  db: ReturnType<typeof createDb>,
  detailId: string,
  countId: string,
  actualQty: number | null,
  notes: string | null,
) {
  return db
    .from('inventory_count_details')
    .update({ actual_qty: actualQty, notes })
    .eq('id', detailId)
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function updateCountStatus(
  db: ReturnType<typeof createDb>,
  countId: string,
  patch: Record<string, unknown>,
) {
  return db
    .from('inventory_counts')
    .update(patch)
    .eq('id', countId);
}

export async function getSiteFrequency(db: ReturnType<typeof createDb>, siteId: string) {
  return db
    .from('sites')
    .select('inventory_frequency')
    .eq('id', siteId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function updateSiteCountSchedule(
  db: ReturnType<typeof createDb>,
  siteId: string,
  lastCountDate: string,
  nextDue: string,
  statusAlert: string,
) {
  return db
    .from('sites')
    .update({
      last_count_date: lastCountDate,
      next_count_due: nextDue,
      count_status_alert: statusAlert,
    })
    .eq('id', siteId)
    .is('archived_at', null);
}
