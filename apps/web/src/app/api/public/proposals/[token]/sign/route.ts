import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/public/proposals/[token]/sign
 *
 * Public endpoint — no auth required.
 * Records the client's signature on a proposal and marks it as WON.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  let body: {
    signer_name: string;
    signer_email: string;
    signature_type_code: string;
    signature_data: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.signer_name?.trim() || !body.signer_email?.trim() || !body.signature_data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getServiceClient();

  // Validate token
  const { data: sendRecord, error: sendErr } = await db
    .from('sales_proposal_sends')
    .select('id, proposal_id, tenant_id, status')
    .eq('public_token', token)
    .single();

  if (sendErr || !sendRecord) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const tenantId = sendRecord.tenant_id as string;
  const proposalId = sendRecord.proposal_id as string;

  // Upload signature image from base64
  const base64Data = body.signature_data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const uuid = crypto.randomUUID();
  const storagePath = `${tenantId}/signatures/${proposalId}/${uuid}.png`;

  const { error: uploadErr } = await db.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });

  if (uploadErr) {
    console.error('[public-sign] Upload error:', uploadErr);
    return NextResponse.json({ error: 'Failed to upload signature' }, { status: 500 });
  }

  const { data: urlData } = db.storage.from('documents').getPublicUrl(storagePath);
  const signatureUrl = urlData?.publicUrl ?? storagePath;

  // Create signature record
  const { error: sigErr } = await db
    .from('sales_proposal_signatures')
    .insert({
      tenant_id: tenantId,
      proposal_id: proposalId,
      signer_name: body.signer_name.trim(),
      signer_email: body.signer_email.trim(),
      signature_type_code: body.signature_type_code ?? 'DRAWN',
      signature_url: signatureUrl,
      ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
    });

  if (sigErr) {
    console.error('[public-sign] Signature insert error:', sigErr);
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
  }

  // Update send status to SIGNED
  await db
    .from('sales_proposal_sends')
    .update({ status: 'SIGNED' })
    .eq('id', sendRecord.id);

  // Update proposal status to WON
  await db
    .from('sales_proposals')
    .update({ status: 'WON' })
    .eq('id', proposalId);

  return NextResponse.json({ success: true });
}
