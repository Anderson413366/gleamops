/**
 * Proposal Send Worker
 *
 * Polls sales_proposal_sends WHERE status='QUEUED' using the
 * poll_queued_sends() RPC (FOR UPDATE SKIP LOCKED) so multiple
 * workers never grab the same row.
 *
 * Flow per row:
 *   poll_queued_sends()  →  QUEUED → SENDING (atomic, locked)
 *   re-verify status     →  guard against stale/duplicate pickup
 *   check rate limits    →  FAILED if exceeded (no re-queue loop)
 *   fetch proposal info  →  build email subject/body
 *   SendGrid send        →  store provider_message_id
 *   mark SENT            →  upgrade proposal status if first send
 *   on error             →  mark FAILED
 *
 * Rate limits (checked at send time, not just at queue time):
 *   - max 10 sends/hour per tenant
 *   - max 3 sends/day per recipient email
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS   = 5_000;   // 5s between poll cycles
const BATCH_SIZE         = 5;       // max rows per cycle
const MAX_PER_HOUR       = 10;      // per-tenant hourly
const MAX_PER_DAY_EMAIL  = 3;       // per-recipient daily

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
  status: string;
}

// ---------------------------------------------------------------------------
// Rate limit checks (at send time — defense in depth)
// ---------------------------------------------------------------------------
async function isWithinHourlyLimit(db: SupabaseClient, tenantId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['SENDING', 'SENT', 'DELIVERED', 'OPENED'])
    .gte('created_at', cutoff);
  return (count ?? 0) < MAX_PER_HOUR;
}

async function isWithinDailyLimit(
  db: SupabaseClient,
  tenantId: string,
  email: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('recipient_email', email)
    .in('status', ['SENDING', 'SENT', 'DELIVERED', 'OPENED'])
    .gte('created_at', cutoff);
  return (count ?? 0) < MAX_PER_DAY_EMAIL;
}

// ---------------------------------------------------------------------------
// Poll queue: uses poll_queued_sends() RPC (FOR UPDATE SKIP LOCKED)
//
// The RPC atomically:
//   1. Selects up to p_batch_size QUEUED rows, locking them
//   2. Transitions them to SENDING
//   3. Returns the rows
//
// This means returned rows are already SENDING — no separate update needed.
// ---------------------------------------------------------------------------
async function pollQueue(db: SupabaseClient): Promise<QueuedSend[]> {
  const { data, error } = await db.rpc('poll_queued_sends', {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error('[worker] poll_queued_sends RPC error:', error.message);
    return [];
  }

  return (data ?? []) as QueuedSend[];
}

// ---------------------------------------------------------------------------
// Process a single send
// ---------------------------------------------------------------------------
async function processSend(db: SupabaseClient, send: QueuedSend): Promise<void> {
  try {
    // ---- Idempotency guard: re-check status is SENDING ----
    // Protects against duplicate pickup on worker restart / RPC replay
    const { data: current } = await db
      .from('sales_proposal_sends')
      .select('status')
      .eq('id', send.id)
      .single();

    if (!current || current.status !== 'SENDING') {
      console.warn(`[worker] send ${send.id} status is ${current?.status ?? 'missing'}, skipping`);
      return;
    }

    // ---- Rate limits (defense in depth — API also checks) ----
    if (!(await isWithinHourlyLimit(db, send.tenant_id))) {
      console.warn(`[worker] hourly limit reached for tenant ${send.tenant_id}, failing ${send.id}`);
      await markFailed(db, send.id, 'RATE_LIMIT_HOURLY');
      return;
    }

    if (!(await isWithinDailyLimit(db, send.tenant_id, send.recipient_email))) {
      console.warn(`[worker] daily limit reached for ${send.recipient_email}, failing ${send.id}`);
      await markFailed(db, send.id, 'RATE_LIMIT_DAILY');
      return;
    }

    // ---- Fetch proposal ----
    const { data: proposal } = await db
      .from('sales_proposals')
      .select('id, proposal_code, status, bid_version_id')
      .eq('id', send.proposal_id)
      .single();

    if (!proposal) {
      console.error(`[worker] proposal ${send.proposal_id} not found, failing ${send.id}`);
      await markFailed(db, send.id, 'PROPOSAL_NOT_FOUND');
      return;
    }

    // ---- Fetch client name via bid chain ----
    const { data: bidVersion } = await db
      .from('sales_bid_versions')
      .select('id, bid:bid_id(bid_code, client:client_id(name))')
      .eq('id', proposal.bid_version_id)
      .single();

    const clientName = (bidVersion as any)?.bid?.client?.name ?? 'Valued Customer';

    // ---- Send via SendGrid (or simulate) ----
    let providerMessageId: string | null = null;
    const sendgridKey = process.env.SENDGRID_API_KEY;

    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);

      const [response] = await sgMail.send({
        to: send.recipient_email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL ?? 'proposals@gleamops.com',
          name: process.env.SENDGRID_FROM_NAME ?? 'GleamOps Proposals',
        },
        subject: `Proposal ${proposal.proposal_code} for ${clientName}`,
        html: buildEmailHtml(proposal.proposal_code, send.recipient_name ?? clientName),
        headers: {
          'X-Idempotency-Key': send.idempotency_key,
        },
      });

      providerMessageId = response?.headers?.['x-message-id'] ?? null;
    } else {
      // Development: simulate send
      providerMessageId = `sim_${send.idempotency_key}`;
      console.log(`[worker] simulated send ${send.id} → ${send.recipient_email}`);
    }

    // ---- Mark SENT ----
    await db
      .from('sales_proposal_sends')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId,
      })
      .eq('id', send.id)
      .eq('status', 'SENDING'); // only if still SENDING (final guard)

    // ---- Upgrade proposal status on first send ----
    if (proposal.status === 'DRAFT' || proposal.status === 'GENERATED') {
      await db
        .from('sales_proposals')
        .update({ status: 'SENT' })
        .eq('id', send.proposal_id);
    }

    console.log(`[worker] sent ${send.id} → ${send.recipient_email} (provider: ${providerMessageId})`);
  } catch (err: any) {
    console.error(`[worker] send ${send.id} failed:`, err?.message ?? err);
    await markFailed(db, send.id, err?.message ?? 'UNKNOWN_ERROR');
  }
}

async function markFailed(db: SupabaseClient, sendId: string, reason: string): Promise<void> {
  await db
    .from('sales_proposal_sends')
    .update({ status: 'FAILED' })
    .eq('id', sendId);
  // reason is logged, not stored (no column for it — could add later)
  console.error(`[worker] marked ${sendId} FAILED: ${reason}`);
}

function buildEmailHtml(proposalCode: string, recipientName: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Cleaning Service Proposal</h2>
      <p>Dear ${recipientName},</p>
      <p>Please find attached our proposal <strong>${proposalCode}</strong> for cleaning services.</p>
      <p>This proposal includes multiple pricing options for your review.</p>
      <br/>
      <p style="color: #666;">— The GleamOps Team</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Main poll loop — uses setTimeout chain (not setInterval) to prevent
// overlapping cycles when processing takes longer than the interval.
// ---------------------------------------------------------------------------
let running = true;

export async function startSendWorker(): Promise<void> {
  const db = getClient();
  console.log('[worker] proposal send worker started');
  console.log(`[worker] poll interval: ${POLL_INTERVAL_MS}ms, batch size: ${BATCH_SIZE}`);

  async function tick(): Promise<void> {
    if (!running) return;

    try {
      const batch = await pollQueue(db);
      if (batch.length > 0) {
        console.log(`[worker] processing ${batch.length} queued send(s)`);
        // Process sequentially to respect rate limits between sends
        for (const send of batch) {
          if (!running) break;
          await processSend(db, send);
        }
      }
    } catch (err: any) {
      console.error('[worker] poll cycle error:', err?.message ?? err);
    }

    if (running) {
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  }

  // Start the first tick
  await tick();
}

export function stopSendWorker(): void {
  running = false;
  console.log('[worker] send worker stopping...');
}
