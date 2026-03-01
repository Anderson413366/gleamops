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

export async function findClientByIdAndTenant(
  db: SupabaseClient,
  tenantId: string,
  clientId: string,
) {
  return db
    .from('clients')
    .select('id, name, client_code')
    .eq('tenant_id', tenantId)
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

export async function nextCustomerPortalSessionCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'CPS',
    p_padding: 4,
  });
}

export async function nextCustomerFeedbackCode(
  db: SupabaseClient,
  tenantId: string,
) {
  return db.rpc('next_code', {
    p_tenant_id: tenantId,
    p_prefix: 'FB',
    p_padding: 4,
  });
}

export async function findCustomerPortalSessionByHash(
  db: SupabaseClient,
  tokenHash: string,
) {
  return db
    .from('customer_portal_sessions')
    .select(`
      id,
      tenant_id,
      session_code,
      client_id,
      token_hash,
      expires_at,
      last_used_at,
      is_active,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      client:client_id(id, client_code, name)
    `)
    .eq('token_hash', tokenHash)
    .is('archived_at', null)
    .maybeSingle();
}

export async function touchCustomerPortalSession(
  db: SupabaseClient,
  sessionId: string,
) {
  return db
    .from('customer_portal_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function listCustomerPortalSessions(
  db: SupabaseClient,
  tenantId: string,
  filters?: { client_id?: string; include_inactive?: boolean },
) {
  let query = db
    .from('customer_portal_sessions')
    .select(`
      id,
      tenant_id,
      session_code,
      client_id,
      token_hash,
      expires_at,
      last_used_at,
      is_active,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      client:client_id(id, client_code, name)
    `)
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!filters?.include_inactive) {
    query = query.eq('is_active', true);
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }

  return query;
}

export async function insertCustomerPortalSession(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('customer_portal_sessions')
    .insert(payload)
    .select(`
      id,
      tenant_id,
      session_code,
      client_id,
      token_hash,
      expires_at,
      last_used_at,
      is_active,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      client:client_id(id, client_code, name)
    `)
    .single();
}

export async function archiveCustomerPortalSession(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string,
  archiveReason: string | null,
) {
  return db
    .from('customer_portal_sessions')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archive_reason: archiveReason,
    })
    .eq('tenant_id', tenantId)
    .eq('id', sessionId)
    .is('archived_at', null);
}

export async function listPortalInspectionsBySites(
  db: SupabaseClient,
  siteIds: string[],
) {
  return db
    .from('inspections')
    .select(`
      id,
      inspection_code,
      site_id,
      status,
      score_pct,
      passed,
      completed_at,
      started_at,
      notes,
      summary_notes,
      photos,
      site:site_id(id, site_code, name),
      inspector:staff_id(id, staff_code, full_name)
    `)
    .in('site_id', siteIds)
    .in('status', ['COMPLETED', 'SUBMITTED'])
    .is('archived_at', null)
    .order('completed_at', { ascending: false })
    .limit(150);
}

export async function getPortalInspectionById(
  db: SupabaseClient,
  inspectionId: string,
) {
  return db
    .from('inspections')
    .select(`
      id,
      inspection_code,
      site_id,
      status,
      score_pct,
      passed,
      completed_at,
      started_at,
      notes,
      summary_notes,
      photos,
      site:site_id(id, site_code, name),
      inspector:staff_id(id, staff_code, full_name)
    `)
    .eq('id', inspectionId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function listPortalInspectionItems(
  db: SupabaseClient,
  inspectionId: string,
) {
  return db
    .from('inspection_items')
    .select('id, section, label, score, score_value, notes, photos')
    .eq('inspection_id', inspectionId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true });
}

export async function listPortalInspectionIssues(
  db: SupabaseClient,
  inspectionId: string,
) {
  return db
    .from('inspection_issues')
    .select('id, severity, description, resolved_at')
    .eq('inspection_id', inspectionId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });
}

export async function listPortalComplaintsByClient(
  db: SupabaseClient,
  clientId: string,
) {
  return db
    .from('complaint_records')
    .select(`
      id,
      complaint_code,
      site_id,
      category,
      priority,
      status,
      created_at,
      resolution_description,
      site:site_id(id, site_code, name)
    `)
    .eq('client_id', clientId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(150);
}

export async function listPortalWorkTicketsBySites(
  db: SupabaseClient,
  siteIds: string[],
) {
  return db
    .from('work_tickets')
    .select(`
      id,
      ticket_code,
      site_id,
      scheduled_date,
      status,
      type,
      title,
      description,
      priority,
      site:site_id(id, site_code, name)
    `)
    .in('site_id', siteIds)
    .is('archived_at', null)
    .order('scheduled_date', { ascending: false })
    .limit(120);
}

export async function insertCustomerFeedback(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('customer_feedback')
    .insert(payload)
    .select(`
      id,
      tenant_id,
      feedback_code,
      client_id,
      site_id,
      feedback_type,
      submitted_via,
      category,
      contact_name,
      contact_email,
      message,
      photos,
      linked_complaint_id,
      status,
      created_at,
      updated_at,
      archived_at,
      version_etag,
      site:site_id(id, site_code, name)
    `)
    .single();
}

export async function insertPortalComplaintRecord(
  db: SupabaseClient,
  payload: Record<string, unknown>,
) {
  return db
    .from('complaint_records')
    .insert(payload)
    .select('id, complaint_code, status')
    .single();
}
