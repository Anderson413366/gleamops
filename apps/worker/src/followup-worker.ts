/**
 * Follow-up Sequence Worker
 *
 * Polls sales_followup_sends WHERE status='SCHEDULED' AND scheduled_at <= now()
 * using the poll_scheduled_followups() RPC (FOR UPDATE SKIP LOCKED) so multiple
 * workers never grab the same row.
 *
 * Flow per row:
 *   poll_scheduled_followups() → SCHEDULED → SENDING (atomic, locked)
 *   re-verify status           → guard against stale/duplicate pickup
 *   fetch sequence             → get proposal_id, status, total_steps
 *   if sequence not ACTIVE     → mark send as SKIPPED
 *   fetch proposal + bid chain → get proposal_code, client_name
 *   fetch follow-up template   → get subject_template, body_template_markdown
 *   fetch last proposal send   → get recipient_email, recipient_name
 *   render template            → replace {{proposal_code}}, {{client_name}}, {{recipient_name}}
 *   SendGrid send (or sim)     → store provider_message_id
 *   mark SENT                  → update sent_at
 *   if last step               → mark sequence COMPLETED
 *   on error                   → mark FAILED
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 30_000; // 30s between poll cycles
const BATCH_SIZE = 5;            // max rows per cycle

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
interface FollowupSend {
  id: string;
  tenant_id: string;
  sequence_id: string;
  step_number: number;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
}

interface FollowupSequence {
  id: string;
  tenant_id: string;
  proposal_id: string;
  status: string;
  total_steps: number;
}

interface FollowupTemplate {
  id: string;
  template_code: string;
  name: string;
  step_number: number;
  subject_template: string;
  body_template_markdown: string;
  delay_days: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Poll queue: uses poll_scheduled_followups() RPC (FOR UPDATE SKIP LOCKED)
//
// The RPC atomically:
//   1. Selects up to p_batch_size SCHEDULED rows whose scheduled_at <= now()
//   2. Locks them (SKIP LOCKED)
//   3. Transitions them to SENDING
//   4. Returns the rows
// ---------------------------------------------------------------------------
async function pollQueue(db: SupabaseClient): Promise<FollowupSend[]> {
  const { data, error } = await db.rpc('poll_scheduled_followups', {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error('[followup-worker] poll_scheduled_followups RPC error:', error.message);
    return [];
  }

  return (data ?? []) as FollowupSend[];
}

// ---------------------------------------------------------------------------
// Process a single follow-up send
// ---------------------------------------------------------------------------
async function processSend(db: SupabaseClient, send: FollowupSend): Promise<void> {
  try {
    // ---- Idempotency guard: re-check status is SENDING ----
    const { data: current } = await db
      .from('sales_followup_sends')
      .select('status')
      .eq('id', send.id)
      .single();

    if (!current || current.status !== 'SENDING') {
      console.warn(`[followup-worker] send ${send.id} status is ${current?.status ?? 'missing'}, skipping`);
      return;
    }

    // ---- Fetch the sequence ----
    const { data: sequence } = await db
      .from('sales_followup_sequences')
      .select('id, tenant_id, proposal_id, status, total_steps')
      .eq('id', send.sequence_id)
      .single();

    if (!sequence) {
      console.error(`[followup-worker] sequence ${send.sequence_id} not found, failing ${send.id}`);
      await markFailed(db, send.id, 'SEQUENCE_NOT_FOUND');
      return;
    }

    // ---- If sequence is not ACTIVE, skip ----
    if (sequence.status !== 'ACTIVE') {
      console.warn(`[followup-worker] sequence ${send.sequence_id} status is ${sequence.status}, skipping send ${send.id}`);
      await markSkipped(db, send.id);
      return;
    }

    // ---- Fetch the proposal ----
    const { data: proposal } = await db
      .from('sales_proposals')
      .select('id, proposal_code, status, bid_version_id')
      .eq('id', sequence.proposal_id)
      .single();

    if (!proposal) {
      console.error(`[followup-worker] proposal ${sequence.proposal_id} not found, failing ${send.id}`);
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

    // ---- Fetch the follow-up template for this step_number ----
    // Use the tenant's first active template matching this step
    const { data: template } = await db
      .from('sales_followup_templates')
      .select('id, template_code, name, step_number, subject_template, body_template_markdown, delay_days, is_active')
      .eq('tenant_id', send.tenant_id)
      .eq('step_number', send.step_number)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!template) {
      console.error(`[followup-worker] no active template for step ${send.step_number}, tenant ${send.tenant_id}, failing ${send.id}`);
      await markFailed(db, send.id, 'TEMPLATE_NOT_FOUND');
      return;
    }

    // ---- Fetch the last successful proposal send to get recipient info ----
    const { data: lastSend } = await db
      .from('sales_proposal_sends')
      .select('recipient_email, recipient_name')
      .eq('proposal_id', sequence.proposal_id)
      .in('status', ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'])
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastSend) {
      console.error(`[followup-worker] no successful proposal send found for proposal ${sequence.proposal_id}, failing ${send.id}`);
      await markFailed(db, send.id, 'NO_RECIPIENT_FOUND');
      return;
    }

    const recipientEmail = lastSend.recipient_email;
    const recipientName = lastSend.recipient_name ?? clientName;

    // ---- Render template: replace placeholders ----
    const subject = renderTemplate(template.subject_template, {
      proposal_code: proposal.proposal_code,
      client_name: clientName,
      recipient_name: recipientName,
    });

    const bodyMarkdown = renderTemplate(template.body_template_markdown, {
      proposal_code: proposal.proposal_code,
      client_name: clientName,
      recipient_name: recipientName,
    });

    // ---- Send via SendGrid (or simulate in dev) ----
    let providerMessageId: string | null = null;
    const sendgridKey = process.env.SENDGRID_API_KEY;

    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);

      const [response] = await sgMail.send({
        to: recipientEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL ?? 'followup@gleamops.com',
          name: process.env.SENDGRID_FROM_NAME ?? 'GleamOps Follow-ups',
        },
        subject,
        html: markdownToHtml(bodyMarkdown),
      });

      providerMessageId = response?.headers?.['x-message-id'] ?? null;
    } else {
      // Development: simulate send
      providerMessageId = `sim_followup_${send.id}`;
      console.log(`[followup-worker] simulated send ${send.id} step ${send.step_number} → ${recipientEmail}`);
    }

    // ---- Mark SENT ----
    await db
      .from('sales_followup_sends')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', send.id)
      .eq('status', 'SENDING'); // only if still SENDING (final guard)

    console.log(`[followup-worker] sent ${send.id} step ${send.step_number}/${sequence.total_steps} → ${recipientEmail} (provider: ${providerMessageId})`);

    // ---- If this was the last step, mark sequence as COMPLETED ----
    if (send.step_number >= sequence.total_steps) {
      await db
        .from('sales_followup_sequences')
        .update({ status: 'COMPLETED' })
        .eq('id', sequence.id)
        .eq('status', 'ACTIVE'); // only if still ACTIVE

      console.log(`[followup-worker] sequence ${sequence.id} COMPLETED (all ${sequence.total_steps} steps sent)`);
    }
  } catch (err: any) {
    console.error(`[followup-worker] send ${send.id} failed:`, err?.message ?? err);
    await markFailed(db, send.id, err?.message ?? 'UNKNOWN_ERROR');
  }
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
async function markFailed(db: SupabaseClient, sendId: string, reason: string): Promise<void> {
  await db
    .from('sales_followup_sends')
    .update({ status: 'FAILED' })
    .eq('id', sendId);
  console.error(`[followup-worker] marked ${sendId} FAILED: ${reason}`);
}

async function markSkipped(db: SupabaseClient, sendId: string): Promise<void> {
  await db
    .from('sales_followup_sends')
    .update({ status: 'SKIPPED' })
    .eq('id', sendId);
  console.log(`[followup-worker] marked ${sendId} SKIPPED (sequence not ACTIVE)`);
}

// ---------------------------------------------------------------------------
// Template rendering — replaces {{key}} placeholders
// ---------------------------------------------------------------------------
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Minimal markdown-to-HTML converter for email body
// ---------------------------------------------------------------------------
function markdownToHtml(md: string): string {
  // Wrap in styled container matching the send-worker email style
  const bodyHtml = md
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Paragraphs: double newline
    .replace(/\n\n/g, '</p><p>')
    // Single newline → <br>
    .replace(/\n/g, '<br/>');

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${bodyHtml}</p>
      <br/>
      <p style="color: #666;">&mdash; The GleamOps Team</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Main poll loop — uses setTimeout chain (not setInterval) to prevent
// overlapping cycles when processing takes longer than the interval.
// ---------------------------------------------------------------------------
let running = true;

export async function startFollowupWorker(): Promise<void> {
  const db = getClient();
  console.log('[followup-worker] follow-up sequence worker started');
  console.log(`[followup-worker] poll interval: ${POLL_INTERVAL_MS}ms, batch size: ${BATCH_SIZE}`);

  async function tick(): Promise<void> {
    if (!running) return;

    try {
      const batch = await pollQueue(db);
      if (batch.length > 0) {
        console.log(`[followup-worker] processing ${batch.length} scheduled follow-up(s)`);
        // Process sequentially to keep ordering predictable
        for (const send of batch) {
          if (!running) break;
          await processSend(db, send);
        }
      }
    } catch (err: any) {
      console.error('[followup-worker] poll cycle error:', err?.message ?? err);
    }

    if (running) {
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  }

  // Start the first tick
  await tick();
}

export function stopFollowupWorker(): void {
  running = false;
  console.log('[followup-worker] follow-up worker stopping...');
}
