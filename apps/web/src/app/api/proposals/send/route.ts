import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createProblemDetails,
  PROPOSAL_001,
  PROPOSAL_002,
  PROPOSAL_006,
  PROPOSAL_007,
  SYS_002,
} from '@gleamops/shared';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/proposals/send
 *
 * Inserts a QUEUED row into sales_proposal_sends.
 * The background worker picks it up and sends via SendGrid.
 *
 * Pre-flight checks:
 *   - Auth (Bearer token)
 *   - Proposal exists, is in a sendable state
 *   - Rate limits: 10/hr per tenant, 3/day per recipient email
 */
export async function POST(request: NextRequest) {
  try {
    // ----- Auth -----
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return problemResponse(
        createProblemDetails('AUTH_001', 'Unauthorized', 401, 'Missing authorization header', '/api/proposals/send'),
      );
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return problemResponse(
        createProblemDetails('AUTH_001', 'Unauthorized', 401, 'Invalid or expired token', '/api/proposals/send'),
      );
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return problemResponse(
        createProblemDetails('AUTH_003', 'Tenant scope mismatch', 403, 'No tenant in token claims', '/api/proposals/send'),
      );
    }

    // ----- Body -----
    const body = await request.json();
    const { proposalId, recipientEmail, recipientName } = body as {
      proposalId?: string;
      recipientEmail?: string;
      recipientName?: string;
    };

    if (!proposalId || !recipientEmail) {
      return problemResponse(
        PROPOSAL_006('proposalId and recipientEmail are required', '/api/proposals/send'),
      );
    }

    const db = getServiceClient();

    // ----- Proposal validation -----
    const { data: proposal, error: propErr } = await db
      .from('sales_proposals')
      .select('id, proposal_code, status, tenant_id, bid_version_id')
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .single();

    if (propErr || !proposal) {
      return problemResponse(
        PROPOSAL_007('/api/proposals/send'),
      );
    }

    if (!['DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'OPENED'].includes(proposal.status)) {
      const pd = PROPOSAL_001('/api/proposals/send');
      return problemResponse(pd);
    }

    // ----- Rate limits -----
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const oneDayAgo  = new Date(Date.now() - 86_400_000).toISOString();

    const { count: hourly } = await db
      .from('sales_proposal_sends')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', oneHourAgo);

    if ((hourly ?? 0) >= 10) {
      const pd = PROPOSAL_002('/api/proposals/send');
      return problemResponse({ ...pd, detail: 'Max 10 proposal sends per hour exceeded.' });
    }

    const { count: daily } = await db
      .from('sales_proposal_sends')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('recipient_email', recipientEmail.trim())
      .gte('created_at', oneDayAgo);

    if ((daily ?? 0) >= 3) {
      const pd = PROPOSAL_002('/api/proposals/send');
      return problemResponse({ ...pd, detail: `Max 3 sends per 24h to ${recipientEmail} exceeded.` });
    }

    // ----- Insert QUEUED row -----
    const { data: sendRecord, error: sendErr } = await db
      .from('sales_proposal_sends')
      .insert({
        tenant_id: tenantId,
        proposal_id: proposal.id,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName?.trim() || null,
        status: 'QUEUED',
      })
      .select('id, idempotency_key')
      .single();

    if (sendErr || !sendRecord) {
      return problemResponse(
        SYS_002(sendErr?.message ?? 'Failed to queue send', '/api/proposals/send'),
      );
    }

    // ----- Wire follow-up sequence (if enabled) -----
    const enableFollowups = body.enableFollowups ?? false;
    if (enableFollowups) {
      try {
        // Fetch active follow-up templates for this tenant
        const { data: templates } = await db
          .from('sales_followup_templates')
          .select('id, step_number, delay_days')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('step_number', { ascending: true });

        if (templates && templates.length > 0) {
          // Create the follow-up sequence
          const { data: sequence } = await db
            .from('sales_followup_sequences')
            .insert({
              tenant_id: tenantId,
              proposal_id: proposal.id,
              status: 'ACTIVE',
              total_steps: templates.length,
            })
            .select('id')
            .single();

          if (sequence) {
            // Create individual scheduled sends
            const now = new Date();
            const sends = templates.map((tmpl) => {
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

            await db.from('sales_followup_sends').insert(sends);
          }
        }
      } catch (followupErr) {
        // Log but don't fail the send — follow-ups are best-effort
        console.error('[proposal-send] Follow-up creation failed:', followupErr);
      }
    }

    return NextResponse.json({
      success: true,
      sendId: sendRecord.id,
      idempotencyKey: sendRecord.idempotency_key,
      status: 'QUEUED',
    });
  } catch (err: any) {
    console.error('[proposal-send] Unexpected error:', err);
    return problemResponse(
      SYS_002(err?.message ?? 'Unexpected server error', '/api/proposals/send'),
    );
  }
}
