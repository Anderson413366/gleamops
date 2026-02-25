import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export interface SiteRow {
  id: string;
  tenant_id: string;
  name: string;
  site_code: string;
}

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findSiteByCode(db: SupabaseClient, siteCode: string) {
  return db
    .from('sites')
    .select('id, tenant_id, name, site_code')
    .eq('site_code', siteCode)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findSiteById(db: SupabaseClient, siteId: string) {
  return db
    .from('sites')
    .select('id, tenant_id, name, site_code')
    .eq('id', siteId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function listSites(db: SupabaseClient, limit = 100) {
  return db
    .from('sites')
    .select('id, name, site_code')
    .is('archived_at', null)
    .order('name', { ascending: true })
    .limit(limit);
}

export async function insertFieldRequestAlert(
  db: SupabaseClient,
  row: {
    tenant_id: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    body: string;
    entity_id: string;
  },
) {
  return db
    .from('alerts')
    .insert({
      tenant_id: row.tenant_id,
      alert_type: 'FIELD_REQUEST',
      severity: row.severity,
      title: row.title,
      body: row.body,
      entity_type: 'site',
      entity_id: row.entity_id,
    })
    .select('id')
    .single();
}
