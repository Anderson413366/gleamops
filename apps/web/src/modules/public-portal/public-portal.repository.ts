import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findPortalContextByToken(db: SupabaseClient, token: string) {
  return db
    .from('sales_proposal_sends')
    .select(`
      id,
      tenant_id,
      public_token,
      proposal_id,
      recipient_name,
      recipient_email,
      status,
      sent_at
    `)
    .eq('public_token', token)
    .single();
}

export async function findProposalById(db: SupabaseClient, proposalId: string) {
  return db
    .from('sales_proposals')
    .select('id, proposal_code, status, updated_at, bid_version_id')
    .eq('id', proposalId)
    .single();
}

export async function findBidVersionById(db: SupabaseClient, bidVersionId: string) {
  return db
    .from('sales_bid_versions')
    .select('id, bid_id')
    .eq('id', bidVersionId)
    .single();
}

export async function findBidById(db: SupabaseClient, bidId: string) {
  return db
    .from('sales_bids')
    .select('id, client_id')
    .eq('id', bidId)
    .single();
}

export async function findClientById(db: SupabaseClient, clientId: string) {
  return db
    .from('clients')
    .select('id, name, client_code')
    .eq('id', clientId)
    .is('archived_at', null)
    .single();
}

export async function findClientSites(db: SupabaseClient, clientId: string) {
  return db
    .from('sites')
    .select('id, name, site_code')
    .eq('client_id', clientId)
    .is('archived_at', null)
    .order('name', { ascending: true })
    .limit(30);
}

export async function findUpcomingTickets(
  db: SupabaseClient,
  siteIds: string[],
  from: string,
  to: string,
) {
  return db
    .from('work_tickets')
    .select(`
      id,
      ticket_code,
      scheduled_date,
      start_time,
      end_time,
      status,
      site:site_id(id, name, site_code)
    `)
    .in('site_id', siteIds)
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .is('archived_at', null)
    .order('scheduled_date', { ascending: true })
    .limit(120);
}

export async function findRecentInspections(db: SupabaseClient, siteIds: string[]) {
  return db
    .from('inspections')
    .select(`
      id,
      inspection_code,
      inspected_at,
      status,
      score_pct,
      summary,
      site:site_id(id, name, site_code)
    `)
    .in('site_id', siteIds)
    .is('archived_at', null)
    .order('inspected_at', { ascending: false })
    .limit(25);
}

export async function findRecentCounts(db: SupabaseClient, siteIds: string[]) {
  return db
    .from('inventory_counts')
    .select(`
      id,
      count_code,
      count_date,
      status,
      counted_by_name,
      submitted_at,
      site:site_id(id, name, site_code)
    `)
    .in('site_id', siteIds)
    .is('archived_at', null)
    .order('count_date', { ascending: false })
    .limit(20);
}

export async function findRecentOrders(db: SupabaseClient, siteIds: string[]) {
  return db
    .from('supply_orders')
    .select(`
      id,
      order_code,
      order_date,
      status,
      total_amount,
      site:site_id(id, name, site_code)
    `)
    .in('site_id', siteIds)
    .is('archived_at', null)
    .order('order_date', { ascending: false })
    .limit(20);
}

export async function findClientAgreements(db: SupabaseClient, clientId: string) {
  return db
    .from('contracts')
    .select('id, contract_number, contract_name, status, start_date, end_date')
    .eq('client_id', clientId)
    .is('archived_at', null)
    .order('start_date', { ascending: false })
    .limit(12);
}

export async function findChemicalCatalog(db: SupabaseClient, tenantId: string) {
  return db
    .from('supply_catalog')
    .select('id, code, name, category, image_url, sds_url')
    .eq('tenant_id', tenantId)
    .ilike('category', '%chem%')
    .is('archived_at', null)
    .order('name', { ascending: true })
    .limit(40);
}

export async function insertPortalChangeAlert(
  db: SupabaseClient,
  payload: {
    tenant_id: string;
    alert_type: string;
    severity: string;
    title: string;
    body: string;
    entity_type: string;
    entity_id: string | null;
  },
) {
  return db
    .from('alerts')
    .insert(payload)
    .select('id, created_at')
    .single();
}
