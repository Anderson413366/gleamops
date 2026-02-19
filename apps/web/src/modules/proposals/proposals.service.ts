/**
 * Proposal send service.
 * Rate limiting, follow-up wiring, send orchestration.
 * Extracted verbatim from api/proposals/send/route.ts
 */
import {
  createProblemDetails,
  PROPOSAL_001,
  PROPOSAL_002,
  PROPOSAL_007,
  SYS_002,
} from '@gleamops/shared';
import {
  createDb,
  findProposal,
  countHourlySends,
  countDailySendsToRecipient,
  insertSendRecord,
  fetchFollowUpTemplates,
  insertFollowUpSequence,
  insertFollowUpSends,
} from './proposals.repository';

const INSTANCE = '/api/proposals/send';

interface SendInput {
  proposalId: string;
  recipientEmail: string;
  recipientName?: string;
  enableFollowups?: boolean;
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function sendProposal(
  tenantId: string,
  input: SendInput,
): Promise<ServiceResult> {
  const { proposalId, recipientEmail, recipientName, enableFollowups } = input;
  const db = createDb();

  try {
    // ----- Proposal validation -----
    const { data: proposal, error: propErr } = await findProposal(db, proposalId, tenantId);
    if (propErr || !proposal) {
      return { success: false, error: PROPOSAL_007(INSTANCE) };
    }

    if (!['DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'OPENED'].includes(proposal.status)) {
      return { success: false, error: PROPOSAL_001(INSTANCE) };
    }

    // ----- Rate limits -----
    const { count: hourly } = await countHourlySends(db, tenantId);
    if ((hourly ?? 0) >= 10) {
      const pd = PROPOSAL_002(INSTANCE);
      return { success: false, error: { ...pd, detail: 'Max 10 proposal sends per hour exceeded.' } };
    }

    const { count: daily } = await countDailySendsToRecipient(db, tenantId, recipientEmail);
    if ((daily ?? 0) >= 3) {
      const pd = PROPOSAL_002(INSTANCE);
      return { success: false, error: { ...pd, detail: `Max 3 sends per 24h to ${recipientEmail} exceeded.` } };
    }

    // ----- Insert QUEUED row -----
    const { data: sendRecord, error: sendErr } = await insertSendRecord(
      db, tenantId, proposal.id, recipientEmail, recipientName ?? null,
    );
    if (sendErr || !sendRecord) {
      return { success: false, error: SYS_002(sendErr?.message ?? 'Failed to queue send', INSTANCE) };
    }

    const portalUrl = sendRecord.public_token
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/proposal/${sendRecord.public_token}`
      : null;

    // ----- Wire follow-up sequence (if enabled) -----
    if (enableFollowups) {
      try {
        await wireFollowUpSequence(db, tenantId, proposal.id);
      } catch (followupErr) {
        // Log but don't fail the send — follow-ups are best-effort
        console.error('[proposal-send] Follow-up creation failed:', followupErr);
      }
    }

    return {
      success: true,
      data: {
        success: true,
        sendId: sendRecord.id,
        idempotencyKey: sendRecord.idempotency_key,
        status: 'QUEUED',
        portalUrl,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[proposal-send] Unexpected error:', err);
    return { success: false, error: SYS_002(message, INSTANCE) };
  }
}

async function wireFollowUpSequence(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  proposalId: string,
): Promise<void> {
  const { data: templates } = await fetchFollowUpTemplates(db, tenantId);
  if (!templates || templates.length === 0) return;

  const { data: sequence } = await insertFollowUpSequence(db, tenantId, proposalId, templates.length);
  if (!sequence) return;

  const now = new Date();
  const sends = templates.map((tmpl: { step_number: number; delay_days: number }) => {
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + tmpl.delay_days);
    // Schedule for 9 AM business hours
    scheduledAt.setHours(9, 0, 0, 0);
    return {
      tenant_id: tenantId,
      sequence_id: sequence.id,
      step_number: tmpl.step_number,
      status: 'SCHEDULED',
      scheduled_at: scheduledAt.toISOString(),
    };
  });

  await insertFollowUpSends(db, sends);
}
