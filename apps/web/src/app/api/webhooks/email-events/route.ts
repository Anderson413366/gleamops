import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createVerify } from 'crypto';
import { createProblemDetails } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(code: string, title: string, status: number, detail: string) {
  const pd = createProblemDetails(code, title, status, detail, '/webhooks/email-events');
  return NextResponse.json(pd, {
    status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ---------------------------------------------------------------------------
// SendGrid Signed Event Webhook verification (ECDSA on RAW bytes)
//
// SendGrid uses ECDSA P-256 with SHA-256.
// Signature = ECDSA_sign(timestamp + payload)  (raw request body bytes)
// Headers:
//   X-Twilio-Email-Event-Webhook-Signature  (base64-encoded ECDSA signature)
//   X-Twilio-Email-Event-Webhook-Timestamp  (unix-ish timestamp string)
//
// The verification key from SendGrid dashboard is an ECDSA public key
// in base64 DER format.
// ---------------------------------------------------------------------------
function verifySignature(
  publicKeyBase64: string,
  rawPayload: Buffer,
  signatureBase64: string,
  timestamp: string,
): boolean {
  try {
    // Build the PEM from the base64 DER public key
    const pem =
      '-----BEGIN PUBLIC KEY-----\n' +
      publicKeyBase64.match(/.{1,64}/g)!.join('\n') +
      '\n-----END PUBLIC KEY-----';

    // The signed data = timestamp bytes + raw payload bytes
    const timestampBuf = Buffer.from(timestamp, 'utf8');
    const signedData = Buffer.concat([timestampBuf, rawPayload]);

    const verifier = createVerify('SHA256');
    verifier.update(signedData);
    verifier.end();

    return verifier.verify(pem, signatureBase64, 'base64');
  } catch (err) {
    console.error('[webhook] signature verification error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Event type mapping
// ---------------------------------------------------------------------------
function normalizeEventType(sgEvent: string): string | null {
  const map: Record<string, string> = {
    delivered: 'delivered',
    open: 'open',
    click: 'click',
    bounce: 'bounce',
    dropped: 'bounce',
    spamreport: 'spam',
    unsubscribe: 'unsubscribe',
    deferred: 'deferred',
  };
  return map[sgEvent] ?? null;
}

// Status priority — only upgrade, never downgrade
const STATUS_PRIORITY: Record<string, number> = {
  QUEUED: 0, SENDING: 1, SENT: 2, DELIVERED: 3, OPENED: 4, BOUNCED: 5, FAILED: 6,
};

// ---------------------------------------------------------------------------
// POST /api/webhooks/email-events
// ---------------------------------------------------------------------------
interface SendGridEvent {
  sg_event_id?: string;
  sg_message_id?: string;
  event: string;
  email?: string;
  timestamp?: number;
  reason?: string;
  type?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  // Read raw body as Buffer for signature verification
  const rawBytes = Buffer.from(await request.arrayBuffer());
  const rawText = rawBytes.toString('utf8');

  // ----- Signature verification -----
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (verificationKey) {
    const signature = request.headers.get('x-twilio-email-event-webhook-signature') ?? '';
    const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') ?? '';

    if (!signature || !timestamp) {
      return problemResponse('AUTH_001', 'Missing signature', 401, 'Missing X-Twilio-Email-Event-Webhook-Signature or Timestamp headers');
    }

    if (!verifySignature(verificationKey, rawBytes, signature, timestamp)) {
      console.warn('[webhook] invalid ECDSA signature — rejecting');
      return problemResponse('AUTH_001', 'Invalid signature', 401, 'ECDSA signature verification failed against raw request bytes');
    }
  }

  // ----- Parse body -----
  let events: SendGridEvent[];
  try {
    events = JSON.parse(rawText);
  } catch {
    return problemResponse('SYS_001', 'Invalid JSON', 400, 'Request body is not valid JSON');
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }

  const db = getServiceClient();
  let processed = 0;
  let skipped = 0;

  for (const event of events) {
    try {
      const eventType = normalizeEventType(event.event);
      if (!eventType) { skipped++; continue; }

      // Dedupe key: prefer sg_event_id, fall back to message_id+event+timestamp
      const providerEventId = event.sg_event_id
        ?? `${event.sg_message_id ?? ''}_${event.event}_${event.timestamp ?? ''}`;
      const providerMessageId = event.sg_message_id?.replace(/\.filter.*$/, '') ?? null;

      if (!providerMessageId) { skipped++; continue; }

      // Find the send record by provider_message_id
      const { data: sendRecord } = await db
        .from('sales_proposal_sends')
        .select('id, tenant_id, proposal_id, status')
        .eq('provider_message_id', providerMessageId)
        .maybeSingle();

      if (!sendRecord) { skipped++; continue; }

      // Idempotent insert (UNIQUE on provider_event_id)
      const { error: insertErr } = await db
        .from('sales_email_events')
        .insert({
          tenant_id: sendRecord.tenant_id,
          proposal_send_id: sendRecord.id,
          provider_event_id: providerEventId,
          event_type: eventType,
          raw_payload: event as Record<string, unknown>,
        });

      if (insertErr) {
        if (insertErr.code === '23505') { skipped++; continue; } // duplicate — idempotent
        console.error('[webhook] insert error:', insertErr.message);
        skipped++;
        continue;
      }

      // ----- Update send record status -----
      const statusMap: Record<string, string> = {
        delivered: 'DELIVERED',
        open: 'OPENED',
        bounce: 'BOUNCED',
        spam: 'BOUNCED',
      };

      const newStatus = statusMap[eventType];
      if (newStatus) {
        const curPriority = STATUS_PRIORITY[sendRecord.status] ?? 0;
        const newPriority = STATUS_PRIORITY[newStatus] ?? 0;

        if (newPriority > curPriority) {
          await db
            .from('sales_proposal_sends')
            .update({ status: newStatus })
            .eq('id', sendRecord.id);

          // Upgrade proposal status for delivery / open events
          if (newStatus === 'DELIVERED' || newStatus === 'OPENED') {
            await db
              .from('sales_proposals')
              .update({ status: newStatus })
              .eq('id', sendRecord.proposal_id);
          }
        }
      }

      // ----- Follow-up stop rules -----

      // Rule 1: hard bounce or spam → stop sequences
      if (eventType === 'bounce' || eventType === 'spam') {
        const stopReason = eventType === 'bounce' ? 'BOUNCE' : 'SPAM';
        await stopFollowups(db, sendRecord.proposal_id, stopReason);
      }

      // Rule 2: check if proposal is WON or LOST → stop sequences
      const { data: proposalRow } = await db
        .from('sales_proposals')
        .select('status')
        .eq('id', sendRecord.proposal_id)
        .single();

      if (proposalRow && (proposalRow.status === 'WON' || proposalRow.status === 'LOST')) {
        await stopFollowups(db, sendRecord.proposal_id, proposalRow.status);
      }

      processed++;
    } catch (evtErr: any) {
      console.error('[webhook] event processing error:', evtErr?.message ?? evtErr);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, processed, skipped });
}

// ---------------------------------------------------------------------------
// Stop follow-up sequences + skip scheduled sends
// ---------------------------------------------------------------------------
async function stopFollowups(
  db: ReturnType<typeof getServiceClient>,
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
    const seqIds = sequences.map((s) => s.id);
    if (seqIds.length > 0) {
      await db
        .from('sales_followup_sends')
        .update({ status: 'SKIPPED' })
        .in('sequence_id', seqIds)
        .eq('status', 'SCHEDULED');
    }
  }
}
