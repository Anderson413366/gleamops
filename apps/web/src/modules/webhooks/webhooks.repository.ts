/**
 * Webhooks data access layer.
 * All Supabase queries for SendGrid webhook processing.
 * Extracted from api/webhooks/sendgrid/route.ts
 */
import { createClient } from '@supabase/supabase-js';

export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function findSendRecord(
  db: ReturnType<typeof createDb>,
  providerMessageId: string,
) {
  return db
    .from('sales_proposal_sends')
    .select('id, tenant_id, proposal_id, status')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle();
}

export async function insertEmailEvent(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  proposalSendId: string,
  providerEventId: string,
  eventType: string,
  rawPayload: Record<string, unknown>,
) {
  return db
    .from('sales_email_events')
    .insert({
      tenant_id: tenantId,
      proposal_send_id: proposalSendId,
      provider_event_id: providerEventId,
      event_type: eventType,
      raw_payload: rawPayload,
    });
}

export async function updateSendStatus(
  db: ReturnType<typeof createDb>,
  sendId: string,
  newStatus: string,
) {
  return db
    .from('sales_proposal_sends')
    .update({ status: newStatus })
    .eq('id', sendId);
}

export async function updateProposalStatus(
  db: ReturnType<typeof createDb>,
  proposalId: string,
  newStatus: string,
) {
  return db
    .from('sales_proposals')
    .update({ status: newStatus })
    .eq('id', proposalId);
}

export async function getProposalStatus(
  db: ReturnType<typeof createDb>,
  proposalId: string,
) {
  return db
    .from('sales_proposals')
    .select('status')
    .eq('id', proposalId)
    .single();
}

export async function stopFollowups(
  db: ReturnType<typeof createDb>,
  proposalId: string,
  reason: string,
): Promise<void> {
  // Stop active sequences
  await db
    .from('sales_followup_sequences')
    .update({ status: 'STOPPED', stop_reason: reason })
    .eq('proposal_id', proposalId)
    .eq('status', 'ACTIVE');

  // Skip all SCHEDULED sends in those sequences
  const { data: sequences } = await db
    .from('sales_followup_sequences')
    .select('id')
    .eq('proposal_id', proposalId);

  if (sequences) {
    const seqIds = sequences.map((s: { id: string }) => s.id);
    if (seqIds.length > 0) {
      await db
        .from('sales_followup_sends')
        .update({ status: 'SKIPPED' })
        .in('sequence_id', seqIds)
        .eq('status', 'SCHEDULED');
    }
  }
}
