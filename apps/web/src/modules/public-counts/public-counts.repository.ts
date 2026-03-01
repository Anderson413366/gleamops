/**
 * Public counts data access layer.
 * All Supabase queries for the public count form domain.
 * Extracted from api/public/counts/[token]/route.ts and save/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findCountByToken(db: SupabaseClient, token: string) {
  return db
    .from('inventory_counts')
    .select(`
      id,
      tenant_id,
      count_code,
      count_date,
      status,
      notes,
      counted_by_name,
      counted_by,
      submitted_at,
      site_id,
      counter:counted_by(full_name),
      site:sites!inventory_counts_site_id_fkey(name, site_code, address)
    `)
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountByTokenFallback(db: SupabaseClient, token: string) {
  return db
    .from('inventory_counts')
    .select(`
      id,
      tenant_id,
      count_code,
      count_date,
      status,
      notes,
      counted_by,
      site_id,
      counter:counted_by(full_name),
      site:sites!inventory_counts_site_id_fkey(name, site_code, address)
    `)
    .eq('count_code', token)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountByTokenMinimal(db: SupabaseClient, token: string) {
  return db
    .from('inventory_counts')
    .select('id, tenant_id, status')
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountByTokenMinimalFallback(db: SupabaseClient, token: string) {
  return db
    .from('inventory_counts')
    .select('id, tenant_id, status')
    .eq('count_code', token)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findCountDetails(db: SupabaseClient, countId: string) {
  return db
    .from('inventory_count_details')
    .select('id, supply_id, expected_qty, actual_qty, notes, photo_urls, created_at')
    .eq('count_id', countId)
    .is('archived_at', null)
    .order('created_at');
}

export async function findSupplies(db: SupabaseClient, supplyIds: string[]) {
  return db
    .from('supply_catalog')
    .select('id, code, name, category, unit, brand, preferred_vendor, image_url, unit_cost')
    .in('id', supplyIds);
}

export async function findPreviousCount(db: SupabaseClient, siteId: string, excludeCountId: string) {
  return db
    .from('inventory_counts')
    .select('id, count_date')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .neq('id', excludeCountId)
    .in('status', ['SUBMITTED', 'COMPLETED'])
    .order('count_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function findPreviousCountDetails(db: SupabaseClient, countId: string) {
  return db
    .from('inventory_count_details')
    .select('supply_id, actual_qty')
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function findDetailIds(db: SupabaseClient, countId: string) {
  return db
    .from('inventory_count_details')
    .select('id')
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function findDetailById(db: SupabaseClient, countId: string, detailId: string) {
  return db
    .from('inventory_count_details')
    .select('id, photo_urls')
    .eq('count_id', countId)
    .eq('id', detailId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function updateDetail(
  db: SupabaseClient,
  detailId: string,
  countId: string,
  actualQty: number | null,
  notes: string | null,
  photoUrls: string[] | null,
) {
  return db
    .from('inventory_count_details')
    .update({ actual_qty: actualQty, notes, photo_urls: photoUrls })
    .eq('id', detailId)
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function updateCountHeader(
  db: SupabaseClient,
  countId: string,
  countedByName: string | null,
  notes: string | null,
) {
  return db
    .from('inventory_counts')
    .update({
      counted_by_name: countedByName,
      notes,
      status: 'DRAFT',
    })
    .eq('id', countId);
}

export async function updateCountHeaderFallback(
  db: SupabaseClient,
  countId: string,
  notes: string | null,
) {
  return db
    .from('inventory_counts')
    .update({
      notes,
      status: 'DRAFT',
    })
    .eq('id', countId);
}

export async function findRefreshedDetails(db: SupabaseClient, countId: string) {
  return db
    .from('inventory_count_details')
    .select('id, actual_qty, photo_urls')
    .eq('count_id', countId)
    .is('archived_at', null);
}

export async function uploadCountPhoto(
  db: SupabaseClient,
  storagePath: string,
  buffer: Buffer,
  contentType: string,
) {
  return db.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType, upsert: false });
}

export function getCountPhotoPublicUrl(db: SupabaseClient, storagePath: string) {
  return db.storage.from('documents').getPublicUrl(storagePath);
}
