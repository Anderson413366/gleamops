/**
 * Proposal Send Worker
 *
 * Polls sales_proposal_sends WHERE status='QUEUED',
 * locks rows with FOR UPDATE SKIP LOCKED,
 * sends via SendGrid, updates status.
 *
 * Rate limits enforced before sending:
 *   - max 10 sends/hour/user (per tenant)
 *   - max 3 sends/day/email
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 5_000;    // 5 seconds between polls
const BATCH_SIZE       = 5;         // max rows per poll cycle
const MAX_PER_HOUR     = 10;        // per-tenant hourly limit
const MAX_PER_DAY_EMAIL = 3;        // per-recipient daily limit

// ---------------------------------------------------------------------------
// Supabase service-role client (bypasses RLS)
// ---------------------------------------------------------------------------
function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QueuedSend {
  id: string;
  tenant_id: string;
  proposal_id: string;
  recipient_email: string;
  recipient_name: string | null;
  idempotency_key: string;
}

interface ProposalRow {
  id: string;
  proposal_code: string;
  status: string;
  bid_version_id: string;
}

// ---------------------------------------------------------------------------
// Rate limit checks
// ---------------------------------------------------------------------------
async function checkHourlyLimit(
  db: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED'])
    .gte('created_at', oneHourAgo);
  return (count ?? 0) < MAX_PER_HOUR;
}

async function checkDailyEmailLimit(
  db: SupabaseClient,
  tenantId: string,
  recipientEmail: string,
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('recipient_email', recipientEmail)
    .in('status', ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED'])
    .gte('created_at', oneDayAgo);
  return (count ?? 0) < MAX_PER_DAY_EMAIL;
}

// ---------------------------------------------------------------------------
// Fetch + lock queued rows (FOR UPDATE SKIP LOCKED via raw SQL)
// ---------------------------------------------------------------------------
async function pollQueue(db: SupabaseClient): Promise<QueuedSend[]> {
  // Use rpc to call a raw SQL query with FOR UPDATE SKIP LOCKED
  // Supabase JS doesn't support row-level locking, so we use rpc
  const { data, error } = await db.rpc('poll_queued_sends', {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    // Fallback: if the RPC doesn't exist yet, do a simple select
    if (error.code === '42883') {
      // function does not exist — fallback to plain select + update
      return pollQueueFallback(db);
    }
    console.error('[worker] poll error:', error.message);
    return [];
  }

  return (data ?? []) as QueuedSend[];
}

async function pollQueueFallback(db: SupabaseClient): Promise<QueuedSend[]> {
  // Select QUEUED rows ordered by created_at, then immediately set them to SENDING
  const { data: rows, error } = await db
    .from('sales_proposal_sends')
    .select('id, tenant_id, proposal_id, recipient_email, recipient_name, idempotency_key')
    .eq('status', 'QUEUED')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !rows || rows.length === 0) return [];

  // Atomically mark them SENDING so other workers don't pick them up
  const ids = rows.map((r) => r.id);
  await db
    .from('sales_proposal_sends')
    .update({ status: 'SENDING' })
    .in('id', ids)
    .eq('status', 'QUEUED'); // only update if still QUEUED (optimistic lock)

  return rows as QueuedSend[];
}

// ---------------------------------------------------------------------------
// Process a single send
// ---------------------------------------------------------------------------
async function processSend(db: SupabaseClient, send: QueuedSend): Promise<void> {
  const sendgridKey = process.env.SENDGRID_API_KEY;

  try {
    // Mark SENDING
    await db
      .from('sales_proposal_sends')
      .update({ status: 'SENDING' })
      .eq('id', send.id);

    // Rate limit: hourly
    if (!(await checkHourlyLimit(db, send.tenant_id))) {
      console.warn(`[worker] rate limit: hourly limit reached for tenant ${send.tenant_id}, re-queuing ${send.id}`);
      await db
        .from('sales_proposal_sends')
        .update({ status: 'QUEUED' })
        .eq('id', send.id);
      return;
    }

    // Rate limit: daily per email
    if (!(await checkDailyEmailLimit(db, send.tenant_id, send.recipient_email))) {
      console.warn(`[worker] rate limit: daily limit reached for ${send.recipient_email}, failing ${send.id}`);
      await db
        .from('sales_proposal_sends')
        .update({ status: 'FAILED' })
        .eq('id', send.id);
      return;
    }

    // Fetch proposal info for the email
    const { data: proposal } = await db
      .from('sales_proposals')
      .select('id, proposal_code, status, bid_version_id')
      .eq('id', send.proposal_id)
      .single();

    if (!proposal) {
      console.error(`[worker] proposal ${send.proposal_id} not found, failing send ${send.id}`);
      await db
        .from('sales_proposal_sends')
        .update({ status: 'FAILED' })
        .eq('id', send.id);
      return;
    }

    // Fetch client name via bid chain
    const { data: bidVersion } = await db
      .from('sales_bid_versions')
      .select('id, bid:bid_id(bid_code, client:client_id(name))')
      .eq('id', (proposal as ProposalRow).bid_version_id)
      .single();

    const clientName = (bidVersion as any)?.bid?.client?.name ?? 'Valued Customer';
    const proposalCode = (proposal as ProposalRow).proposal_code;

    // Send via SendGrid or simulate
    let providerMessageId: string | null = null;

    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);

      const [response] = await sgMail.send({
        to: send.recipient_email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL ?? 'proposals@gleamops.com',
          name: process.env.SENDGRID_FROM_NAME ?? 'GleamOps Proposals',
        },
        subject: `Proposal ${proposalCode} for ${clientName}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Cleaning Service Proposal</h2>
            <p>Dear ${send.recipient_name || clientName},</p>
            <p>Please find attached our proposal <strong>${proposalCode}</strong> for cleaning services.</p>
            <p>This proposal includes multiple pricing options for your review.</p>
            <br/>
            <p style="color: #666;">— The GleamOps Team</p>
          </div>
        `,
      });

      providerMessageId = response?.headers?.['x-message-id'] ?? null;
    } else {
      // Development: simulate send
      providerMessageId = `sim_${send.idempotency_key}`;
      console.log(`[worker] simulated send ${send.id} → ${send.recipient_email} (no SENDGRID_API_KEY)`);
    }

    // Update to SENT
    const now = new Date().toISOString();
    await db
      .from('sales_proposal_sends')
      .update({
        status: 'SENT',
        sent_at: now,
        provider_message_id: providerMessageId,
      })
      .eq('id', send.id);

    // Upgrade proposal status if needed
    const pStatus = (proposal as ProposalRow).status;
    if (pStatus === 'DRAFT' || pStatus === 'GENERATED') {
      await db
        .from('sales_proposals')
        .update({ status: 'SENT' })
        .eq('id', send.proposal_id);
    }

    console.log(`[worker] sent ${send.id} → ${send.recipient_email} (provider: ${providerMessageId})`);
  } catch (err: any) {
    console.error(`[worker] send ${send.id} failed:`, err?.message ?? err);
    await db
      .from('sales_proposal_sends')
      .update({ status: 'FAILED' })
      .eq('id', send.id);
  }
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------
export async function startSendWorker(): Promise<void> {
  const db = getClient();
  console.log('[worker] proposal send worker started');

  const poll = async () => {
    try {
      const batch = await pollQueue(db);
      if (batch.length > 0) {
        console.log(`[worker] processing ${batch.length} queued sends`);
        for (const send of batch) {
          await processSend(db, send);
        }
      }
    } catch (err: any) {
      console.error('[worker] poll cycle error:', err?.message ?? err);
    }
  };

  // Initial poll
  await poll();

  // Continuous polling
  setInterval(poll, POLL_INTERVAL_MS);
}
