/**
 * Public proposals data access layer.
 * All Supabase queries for the public proposal portal domain.
 * Extracted from api/public/proposals/[token]/route.ts and sign/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findSendRecordByToken(db: SupabaseClient, token: string) {
  return db
    .from('sales_proposal_sends')
    .select(`
      id,
      public_token,
      recipient_email,
      recipient_name,
      status,
      proposal:sales_proposals!sales_proposal_sends_proposal_id_fkey(
        id,
        proposal_code,
        status,
        pricing_option_count,
        notes,
        tenant_id,
        bid_version_id,
        bid:bid_id(
          id,
          bid_code,
          total_sqft,
          bid_monthly_price,
          client:client_id(id, name, client_code),
          service:service_id(id, name)
        )
      )
    `)
    .eq('public_token', token)
    .single();
}

export async function markSendAsOpened(db: SupabaseClient, sendId: string) {
  return db
    .from('sales_proposal_sends')
    .update({ status: 'OPENED' })
    .eq('id', sendId);
}

export async function findPricingResults(db: SupabaseClient, bidVersionId: string) {
  return db.from('sales_bid_pricing_results').select('*').eq('bid_version_id', bidVersionId).single();
}

export async function findWorkloadResults(db: SupabaseClient, bidVersionId: string) {
  return db.from('sales_bid_workload_results').select('*').eq('bid_version_id', bidVersionId).single();
}

export async function findBidAreas(db: SupabaseClient, bidVersionId: string) {
  return db
    .from('sales_bid_areas')
    .select('name, square_footage, quantity, building_type_code')
    .eq('bid_version_id', bidVersionId)
    .is('archived_at', null)
    .order('name');
}

export async function findTenant(db: SupabaseClient, tenantId: string) {
  return db
    .from('tenants')
    .select('id, name, logo_url, primary_color')
    .eq('id', tenantId)
    .single();
}

export async function findSendRecordForSign(db: SupabaseClient, token: string) {
  return db
    .from('sales_proposal_sends')
    .select('id, proposal_id, tenant_id, status')
    .eq('public_token', token)
    .single();
}

export async function uploadSignatureImage(
  db: SupabaseClient,
  storagePath: string,
  buffer: Buffer,
) {
  return db.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });
}

export function getSignaturePublicUrl(db: SupabaseClient, storagePath: string) {
  return db.storage.from('documents').getPublicUrl(storagePath);
}

export async function insertSignatureRecord(
  db: SupabaseClient,
  data: {
    tenant_id: string;
    proposal_id: string;
    signer_name: string;
    signer_email: string;
    signature_type_code: string;
    signature_url: string;
    ip_address: string | null;
    user_agent: string | null;
  },
) {
  return db
    .from('sales_proposal_signatures')
    .insert(data);
}

export async function updateSendStatus(db: SupabaseClient, sendId: string, status: string) {
  return db
    .from('sales_proposal_sends')
    .update({ status })
    .eq('id', sendId);
}

export async function updateProposalStatus(db: SupabaseClient, proposalId: string, status: string) {
  return db
    .from('sales_proposals')
    .update({ status })
    .eq('id', proposalId);
}
