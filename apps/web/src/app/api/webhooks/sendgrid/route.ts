import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Verify SendGrid Signed Event Webhook signature
// https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
function verifySignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  try {
    // SendGrid signs: timestamp + payload
    const data = timestamp + payload;
    const expectedSignature = createHmac('sha256', publicKey)
      .update(data)
      .digest('base64');
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// Map SendGrid event types to our normalized types
function normalizeEventType(sgEventType: string): string | null {
  const map: Record<string, string> = {
    delivered: 'delivered',
    open: 'open',
    click: 'click',
    bounce: 'bounce',
    dropped: 'bounce',
    spamreport: 'spam',
    unsubscribe: 'spam',
    deferred: 'deferred',
  };
  return map[sgEventType] ?? null;
}

interface SendGridEvent {
  sg_event_id: string;
  sg_message_id: string;
  event: string;
  email: string;
  timestamp: number;
  url?: string;
  reason?: string;
  type?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    // Verify signature if key is configured
    if (verificationKey) {
      const signature = request.headers.get('x-twilio-email-event-webhook-signature') ?? '';
      const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') ?? '';

      if (!signature || !timestamp) {
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
      }

      const valid = verifySignature(verificationKey, rawBody, signature, timestamp);
      if (!valid) {
        console.warn('[sendgrid-webhook] Invalid signature — rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    let events: SendGridEvent[];
    try {
      events = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const supabase = getServiceClient();
    let processed = 0;
    let skipped = 0;

    for (const event of events) {
      const eventType = normalizeEventType(event.event);
      if (!eventType) {
        skipped++;
        continue;
      }

      const providerEventId = event.sg_event_id;
      const providerMessageId = event.sg_message_id?.replace(/\.filter.*$/, '') ?? null;

      if (!providerEventId || !providerMessageId) {
        skipped++;
        continue;
      }

      // Find the send record by provider_message_id
      const { data: sendRecord } = await supabase
        .from('sales_proposal_sends')
        .select('id, tenant_id, proposal_id, status')
        .eq('provider_message_id', providerMessageId)
        .maybeSingle();

      if (!sendRecord) {
        // Message not from our system — skip silently
        skipped++;
        continue;
      }

      // Insert event (idempotent via UNIQUE constraint on provider_event_id)
      const { error: insertErr } = await supabase
        .from('sales_email_events')
        .insert({
          tenant_id: sendRecord.tenant_id,
          proposal_send_id: sendRecord.id,
          provider_event_id: providerEventId,
          event_type: eventType,
          raw_payload: event as Record<string, unknown>,
        });

      if (insertErr) {
        // Likely duplicate (UNIQUE constraint) — that's fine, idempotent
        if (insertErr.code === '23505') {
          skipped++;
          continue;
        }
        console.error('[sendgrid-webhook] Insert error:', insertErr);
        skipped++;
        continue;
      }

      // Update send record status based on event type
      const statusUpdates: Record<string, string> = {
        delivered: 'DELIVERED',
        open: 'OPENED',
        bounce: 'BOUNCED',
        spam: 'BOUNCED',
      };

      const newStatus = statusUpdates[eventType];
      if (newStatus) {
        // Only upgrade status (don't downgrade OPENED back to DELIVERED)
        const statusPriority: Record<string, number> = {
          SENDING: 0, SENT: 1, DELIVERED: 2, OPENED: 3, BOUNCED: 4, FAILED: 5,
        };
        const currentPriority = statusPriority[sendRecord.status] ?? 0;
        const newPriority = statusPriority[newStatus] ?? 0;

        if (newPriority > currentPriority) {
          await supabase
            .from('sales_proposal_sends')
            .update({ status: newStatus })
            .eq('id', sendRecord.id);

          // Also update proposal status for key events
          if (newStatus === 'DELIVERED' || newStatus === 'OPENED') {
            await supabase
              .from('sales_proposals')
              .update({ status: newStatus })
              .eq('id', sendRecord.proposal_id);
          }
        }

        // Bounce/spam → stop follow-up sequences
        if (eventType === 'bounce' || eventType === 'spam') {
          const stopReason = eventType === 'bounce' ? 'BOUNCE' : 'SPAM';
          await supabase
            .from('sales_followup_sequences')
            .update({ status: 'STOPPED', stop_reason: stopReason })
            .eq('proposal_id', sendRecord.proposal_id)
            .eq('status', 'ACTIVE');

          // Skip scheduled follow-up sends
          const { data: sequences } = await supabase
            .from('sales_followup_sequences')
            .select('id')
            .eq('proposal_id', sendRecord.proposal_id);

          if (sequences) {
            for (const seq of sequences) {
              await supabase
                .from('sales_followup_sends')
                .update({ status: 'SKIPPED' })
                .eq('sequence_id', seq.id)
                .eq('status', 'SCHEDULED');
            }
          }
        }
      }

      processed++;
    }

    return NextResponse.json({ ok: true, processed, skipped });
  } catch (err) {
    console.error('[sendgrid-webhook] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
