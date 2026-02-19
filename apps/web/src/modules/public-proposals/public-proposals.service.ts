/**
 * Public proposals service.
 * Business logic extracted verbatim from api/public/proposals/[token]/route.ts and sign/route.ts
 */
import {
  createDb,
  findSendRecordByToken,
  markSendAsOpened,
  findPricingResults,
  findWorkloadResults,
  findBidAreas,
  findTenant,
  findSendRecordForSign,
  uploadSignatureImage,
  getSignaturePublicUrl,
  insertSignatureRecord,
  updateSendStatus,
  updateProposalStatus,
} from './public-proposals.repository';

type GetProposalResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type SignProposalResult =
  | { success: true }
  | { success: false; error: string; status: number };

export async function getPublicProposal(token: string): Promise<GetProposalResult> {
  const db = createDb();

  // Look up send record by public_token
  const { data: sendRecord, error: sendErr } = await findSendRecordByToken(db, token);

  if (sendErr || !sendRecord) {
    return { success: false, error: 'Proposal not found', status: 404 };
  }

  const proposal = sendRecord.proposal as unknown as Record<string, unknown> | null;
  if (!proposal) {
    return { success: false, error: 'Proposal data unavailable', status: 404 };
  }

  // Mark as viewed if currently SENT or DELIVERED
  if (sendRecord.status === 'SENT' || sendRecord.status === 'DELIVERED') {
    await markSendAsOpened(db, sendRecord.id);
  }

  // Fetch pricing results for the bid version
  const bidVersionId = proposal.bid_version_id as string | null;
  let pricing = null;
  let workload = null;
  if (bidVersionId) {
    const [pRes, wRes] = await Promise.all([
      findPricingResults(db, bidVersionId),
      findWorkloadResults(db, bidVersionId),
    ]);
    pricing = pRes.data;
    workload = wRes.data;
  }

  // Fetch areas for scope of work
  let areas: unknown[] = [];
  if (bidVersionId) {
    const { data } = await findBidAreas(db, bidVersionId);
    areas = data ?? [];
  }

  // Fetch tenant branding
  const tenantId = proposal.tenant_id as string;
  const { data: tenant } = await findTenant(db, tenantId);

  return {
    success: true,
    data: {
      send: {
        id: sendRecord.id,
        status: sendRecord.status,
        recipient_name: sendRecord.recipient_name,
        recipient_email: sendRecord.recipient_email,
      },
      proposal: {
        id: proposal.id,
        proposal_code: proposal.proposal_code,
        status: proposal.status,
        notes: proposal.notes,
        pricing_option_count: proposal.pricing_option_count,
      },
      bid: proposal.bid,
      pricing,
      workload,
      areas,
      company: tenant ? {
        name: tenant.name,
        logo_url: tenant.logo_url,
        primary_color: tenant.primary_color,
      } : null,
    },
  };
}

export async function signPublicProposal(
  token: string,
  body: {
    signer_name: string;
    signer_email: string;
    signature_type_code: string;
    signature_data: string;
  },
  ipAddress: string | null,
  userAgent: string | null,
): Promise<SignProposalResult> {
  const db = createDb();

  // Validate token
  const { data: sendRecord, error: sendErr } = await findSendRecordForSign(db, token);
  if (sendErr || !sendRecord) {
    return { success: false, error: 'Proposal not found', status: 404 };
  }

  const tenantId = sendRecord.tenant_id as string;
  const proposalId = sendRecord.proposal_id as string;

  // Upload signature image from base64
  const base64Data = body.signature_data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const uuid = crypto.randomUUID();
  const storagePath = `${tenantId}/signatures/${proposalId}/${uuid}.png`;

  const { error: uploadErr } = await uploadSignatureImage(db, storagePath, buffer);
  if (uploadErr) {
    console.error('[public-sign] Upload error:', uploadErr);
    return { success: false, error: 'Failed to upload signature', status: 500 };
  }

  const { data: urlData } = getSignaturePublicUrl(db, storagePath);
  const signatureUrl = urlData?.publicUrl ?? storagePath;

  // Create signature record
  const { error: sigErr } = await insertSignatureRecord(db, {
    tenant_id: tenantId,
    proposal_id: proposalId,
    signer_name: body.signer_name.trim(),
    signer_email: body.signer_email.trim(),
    signature_type_code: body.signature_type_code ?? 'DRAWN',
    signature_url: signatureUrl,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (sigErr) {
    console.error('[public-sign] Signature insert error:', sigErr);
    return { success: false, error: 'Failed to save signature', status: 500 };
  }

  // Update send status to SIGNED
  await updateSendStatus(db, sendRecord.id, 'SIGNED');

  // Update proposal status to WON
  await updateProposalStatus(db, proposalId, 'WON');

  return { success: true };
}
