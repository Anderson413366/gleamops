import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { PROPOSAL_001, PROPOSAL_002, PROPOSAL_003 } from '@gleamops/shared';

// Use service role client for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Rate limit check: max 10 sends/hour/user, max 3/24h to same email
async function checkRateLimit(
  supabase: ReturnType<typeof getServiceClient>,
  tenantId: string,
  userId: string,
  recipientEmail: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check user hourly limit (10/hour)
  const { count: userHourly } = await supabase
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo);

  if ((userHourly ?? 0) >= 10) {
    return { allowed: false, reason: 'Max 10 proposal sends per hour exceeded.' };
  }

  // Check recipient daily limit (3/24h)
  const { count: recipientDaily } = await supabase
    .from('sales_proposal_sends')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('recipient_email', recipientEmail)
    .gte('created_at', oneDayAgo);

  if ((recipientDaily ?? 0) >= 3) {
    return { allowed: false, reason: `Max 3 sends per 24h to ${recipientEmail} exceeded.` };
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate via Supabase auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 403 });
    }

    const body = await request.json();
    const { proposalId, recipientEmail, recipientName } = body;

    if (!proposalId || !recipientEmail) {
      return NextResponse.json({ error: 'Missing proposalId or recipientEmail' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch proposal
    const { data: proposal, error: propErr } = await supabase
      .from('sales_proposals')
      .select('id, proposal_code, status, tenant_id, pdf_generated_at, bid_version_id')
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .single();

    if (propErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Must be in a sendable state
    if (!['DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'OPENED'].includes(proposal.status)) {
      const pd = PROPOSAL_001(`/api/proposals/send`);
      return NextResponse.json(pd, { status: pd.status });
    }

    // Rate limit
    const rateCheck = await checkRateLimit(supabase, tenantId, user.id, recipientEmail);
    if (!rateCheck.allowed) {
      const pd = PROPOSAL_002(`/api/proposals/send`);
      return NextResponse.json({ ...pd, detail: rateCheck.reason }, { status: 429 });
    }

    // Create send record with SENDING status
    const { data: sendRecord, error: sendErr } = await supabase
      .from('sales_proposal_sends')
      .insert({
        tenant_id: tenantId,
        proposal_id: proposal.id,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName?.trim() || null,
        status: 'SENDING',
      })
      .select()
      .single();

    if (sendErr || !sendRecord) {
      return NextResponse.json({ error: 'Failed to create send record' }, { status: 500 });
    }

    // Fetch bid/client info for email content
    const { data: bidVersion } = await supabase
      .from('sales_bid_versions')
      .select('id, bid:bid_id(bid_code, client:client_id(name))')
      .eq('id', proposal.bid_version_id)
      .single();

    const clientName = (bidVersion as any)?.bid?.client?.name ?? 'Valued Customer';

    // Send via SendGrid (or simulate if no API key)
    const sendgridKey = process.env.SENDGRID_API_KEY;
    let providerMessageId: string | null = null;

    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);

      try {
        const [response] = await sgMail.send({
          to: recipientEmail.trim(),
          from: {
            email: process.env.SENDGRID_FROM_EMAIL ?? 'proposals@gleamops.com',
            name: process.env.SENDGRID_FROM_NAME ?? 'GleamOps Proposals',
          },
          subject: `Proposal ${proposal.proposal_code} for ${clientName}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Cleaning Service Proposal</h2>
              <p>Dear ${recipientName || clientName},</p>
              <p>Please find attached our proposal <strong>${proposal.proposal_code}</strong> for cleaning services.</p>
              <p>This proposal includes multiple pricing options for your review. Please don't hesitate to reach out with any questions.</p>
              <br/>
              <p style="color: #666;">— The GleamOps Team</p>
            </div>
          `,
        });

        // Extract message ID from SendGrid response headers
        providerMessageId = response?.headers?.['x-message-id'] ?? null;
      } catch (sgError: any) {
        // Update send record to FAILED
        await supabase
          .from('sales_proposal_sends')
          .update({ status: 'FAILED' })
          .eq('id', sendRecord.id);

        const pd = PROPOSAL_003(sgError?.message ?? 'SendGrid send failed', `/api/proposals/send`);
        return NextResponse.json(pd, { status: 502 });
      }
    } else {
      // No SendGrid key — simulate send for development
      providerMessageId = `sim_${crypto.randomUUID()}`;
    }

    // Update send record to SENT with provider message ID
    await supabase
      .from('sales_proposal_sends')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId,
      })
      .eq('id', sendRecord.id);

    // Update proposal status to SENT if it was DRAFT or GENERATED
    if (proposal.status === 'DRAFT' || proposal.status === 'GENERATED') {
      await supabase
        .from('sales_proposals')
        .update({ status: 'SENT' })
        .eq('id', proposal.id);
    }

    return NextResponse.json({
      success: true,
      sendId: sendRecord.id,
      providerMessageId,
      simulated: !sendgridKey,
    });
  } catch (err: any) {
    console.error('[proposal-send] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
