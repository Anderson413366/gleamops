/**
 * Proposals data access layer.
 * Extracted from api/proposals/send/route.ts
 */
import { createClient } from '@supabase/supabase-js';

export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function findProposal(
  db: ReturnType<typeof createDb>,
  proposalId: string,
  tenantId: string,
) {
  return db
    .from('sales_proposals')
    .select('id, proposal_code, status, tenant_id, bid_version_id')
    .eq('id', proposalId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function countHourlySends(
  db: ReturnType<typeof createDb>,
  tenantId: string,
) {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  return db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo);
}

export async function countDailySendsToRecipient(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  recipientEmail: string,
) {
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  return db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('recipient_email', recipientEmail.trim())
    .gte('created_at', oneDayAgo);
}

export async function insertSendRecord(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  proposalId: string,
  recipientEmail: string,
  recipientName: string | null,
) {
  return db
    .from('sales_proposal_sends')
    .insert({
      tenant_id: tenantId,
      proposal_id: proposalId,
      recipient_email: recipientEmail.trim(),
      recipient_name: recipientName?.trim() || null,
      status: 'QUEUED',
    })
    .select('id, idempotency_key, public_token')
    .single();
}

export async function fetchFollowUpTemplates(
  db: ReturnType<typeof createDb>,
  tenantId: string,
) {
  return db
    .from('sales_followup_templates')
    .select('id, step_number, delay_days')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('step_number', { ascending: true });
}

export async function insertFollowUpSequence(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  proposalId: string,
  totalSteps: number,
) {
  return db
    .from('sales_followup_sequences')
    .insert({
      tenant_id: tenantId,
      proposal_id: proposalId,
      status: 'ACTIVE',
      total_steps: totalSteps,
    })
    .select('id')
    .single();
}

export async function insertFollowUpSends(
  db: ReturnType<typeof createDb>,
  sends: Array<{
    tenant_id: string;
    sequence_id: string;
    step_number: number;
    status: string;
    scheduled_at: string;
  }>,
) {
  return db.from('sales_followup_sends').insert(sends);
}
