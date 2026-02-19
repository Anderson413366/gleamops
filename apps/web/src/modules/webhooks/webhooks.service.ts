/**
 * SendGrid webhook event processing service.
 * Business logic extracted verbatim from api/webhooks/sendgrid/route.ts
 */
import {
  createDb,
  findSendRecord,
  insertEmailEvent,
  updateSendStatus,
  updateProposalStatus,
  getProposalStatus,
  stopFollowups,
} from './webhooks.repository';

// Event type mapping
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

export interface SendGridEvent {
  sg_event_id?: string;
  sg_message_id?: string;
  event: string;
  email?: string;
  timestamp?: number;
  reason?: string;
  type?: string;
  [key: string]: unknown;
}

export interface ProcessResult {
  processed: number;
  skipped: number;
}

export async function processEvents(events: SendGridEvent[]): Promise<ProcessResult> {
  const db = createDb();
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
      const { data: sendRecord } = await findSendRecord(db, providerMessageId);
      if (!sendRecord) { skipped++; continue; }

      // Idempotent insert (UNIQUE constraint on provider_event_id)
      const { error: insertErr } = await insertEmailEvent(
        db,
        sendRecord.tenant_id,
        sendRecord.id,
        providerEventId,
        eventType,
        event as Record<string, unknown>,
      );

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
          await updateSendStatus(db, sendRecord.id, newStatus);

          // Upgrade proposal status for delivery / open events
          if (newStatus === 'DELIVERED' || newStatus === 'OPENED') {
            await updateProposalStatus(db, sendRecord.proposal_id, newStatus);
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
      const { data: proposalRow } = await getProposalStatus(db, sendRecord.proposal_id);
      if (proposalRow && (proposalRow.status === 'WON' || proposalRow.status === 'LOST')) {
        await stopFollowups(db, sendRecord.proposal_id, proposalRow.status);
      }

      processed++;
    } catch (evtErr: unknown) {
      const msg = evtErr instanceof Error ? evtErr.message : String(evtErr);
      console.error('[webhook] event processing error:', msg);
      skipped++;
    }
  }

  return { processed, skipped };
}
