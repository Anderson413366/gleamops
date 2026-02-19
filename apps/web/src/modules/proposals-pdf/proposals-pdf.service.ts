/**
 * Proposals PDF generation service.
 * Business logic extracted verbatim from api/proposals/[id]/generate-pdf/route.ts
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import {
  createProblemDetails,
  PROPOSAL_005,
  PROPOSAL_007,
  SYS_002,
} from '@gleamops/shared';
import type { ProposalLayoutConfig } from '@gleamops/shared';
import { ProposalPDF } from '@/lib/pdf/proposal-template';
import {
  createDb,
  findProposal,
  findPricingOptions,
  findBidVersion,
  findBid,
  findClient,
  findBidSiteName,
  findTenantName,
  findSignatures,
  findAttachments,
  uploadPdf,
  insertFileRecord,
  updateProposalPdfFile,
  downloadAttachmentPdf,
  type ProposalAttachmentFile,
} from './proposals-pdf.repository';

const INSTANCE = '/api/proposals/[id]/generate-pdf';

type ServiceResult =
  | { success: true; data: { fileId: string; storageUrl: string; attachmentMode: string; appendedAttachmentNames: string[] } }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toLocaleDateString('en-US');
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function generateFileCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FIL-${ts}${rand}`;
}

function isPdfAttachment(file: ProposalAttachmentFile): boolean {
  const mime = file.mime_type?.toLowerCase();
  if (mime === 'application/pdf' || mime === 'application/x-pdf') return true;
  return file.original_filename?.toLowerCase().endsWith('.pdf') ?? false;
}

async function appendAttachmentPdfs(
  db: ReturnType<typeof createDb>,
  basePdfBuffer: Buffer,
  attachments: ProposalAttachmentFile[],
) {
  const mergedPdf = await PDFDocument.load(basePdfBuffer);
  const appendedAttachmentNames: string[] = [];

  for (const attachment of attachments) {
    if (!isPdfAttachment(attachment)) continue;

    try {
      const bytes = await downloadAttachmentPdf(db, attachment.storage_path);
      if (!bytes) {
        console.warn(
          `[generate-pdf] Skipping attachment ${attachment.id}: could not download`,
        );
        continue;
      }

      const attachmentPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(
        attachmentPdf,
        attachmentPdf.getPageIndices(),
      );
      pages.forEach((page) => mergedPdf.addPage(page));

      appendedAttachmentNames.push(
        attachment.original_filename ?? `Attachment ${appendedAttachmentNames.length + 1}`,
      );
    } catch (err) {
      console.warn(
        `[generate-pdf] Skipping attachment ${attachment.id}: failed to append PDF`,
        err,
      );
    }
  }

  if (appendedAttachmentNames.length === 0) {
    return { mergedBuffer: basePdfBuffer, appendedAttachmentNames };
  }

  const mergedBytes = await mergedPdf.save();
  return { mergedBuffer: Buffer.from(mergedBytes), appendedAttachmentNames };
}

export async function generateProposalPdf(
  tenantId: string,
  proposalId: string,
): Promise<ServiceResult> {
  const db = createDb();

  // ----- Fetch proposal -----
  const { data: proposal, error: propErr } = await findProposal(db, tenantId, proposalId);
  if (propErr || !proposal) {
    return { success: false, error: PROPOSAL_007(INSTANCE) };
  }

  // ----- Fetch pricing options -----
  const { data: pricingOptions, error: poErr } = await findPricingOptions(db, tenantId, proposal.id);
  if (poErr) {
    return {
      success: false,
      error: PROPOSAL_005(`Failed to fetch pricing options: ${poErr.message}`, INSTANCE),
    };
  }

  // ----- Fetch bid version -> bid -> client info -----
  const { data: bidVersion, error: bvErr } = await findBidVersion(db, tenantId, proposal.bid_version_id);
  if (bvErr || !bidVersion) {
    return { success: false, error: PROPOSAL_005('Failed to resolve bid version', INSTANCE) };
  }

  const { data: bid, error: bidErr } = await findBid(db, tenantId, bidVersion.bid_id);
  if (bidErr || !bid) {
    return { success: false, error: PROPOSAL_005('Failed to resolve bid', INSTANCE) };
  }

  const { data: client, error: clientErr } = await findClient(db, tenantId, bid.client_id);
  if (clientErr || !client) {
    return { success: false, error: PROPOSAL_005('Failed to resolve client', INSTANCE) };
  }

  // ----- Fetch site info -----
  const siteName = await findBidSiteName(db, tenantId, proposal.bid_version_id);

  // ----- Fetch tenant info for company branding -----
  const tenantName = await findTenantName(db, tenantId);

  // ----- Fetch signatures with signed URLs -----
  const signatureData = await findSignatures(db, tenantId, proposal.id);

  const layoutConfig = (proposal.layout_config as ProposalLayoutConfig | null) ?? null;
  const attachmentMode = layoutConfig?.attachmentMode ?? 'list_only';

  // ----- Fetch attachment files -----
  const { attachmentNames, attachmentFiles } = await findAttachments(db, tenantId, proposal.id);

  // ----- Generate PDF -----
  const pdfProps = {
    proposalCode: proposal.proposal_code,
    clientName: client.name,
    siteName,
    date: formatDate(proposal.created_at ?? null),
    validUntil: proposal.valid_until
      ? formatDate(proposal.valid_until)
      : undefined,
    description: proposal.notes ?? undefined,
    pricingOptions: (pricingOptions ?? []).map((po: {
      label: string;
      monthly_price: number;
      is_recommended: boolean;
      description: string | null;
    }) => ({
      label: po.label,
      monthlyPrice: Number(po.monthly_price),
      isRecommended: po.is_recommended,
      description: po.description ?? undefined,
    })),
    terms: undefined,
    companyName: tenantName ?? 'GleamOps',
    layoutConfig: layoutConfig ?? undefined,
    signatures: signatureData,
    attachmentNames: attachmentMode === 'append' ? undefined : (attachmentNames.length > 0 ? attachmentNames : undefined),
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(ProposalPDF(pdfProps));
  } catch (renderErr: unknown) {
    console.error('[generate-pdf] PDF render failed:', renderErr);
    return {
      success: false,
      error: PROPOSAL_005(
        `PDF render failed: ${renderErr instanceof Error ? renderErr.message : 'Unknown error'}`,
        INSTANCE,
      ),
    };
  }

  let appendedAttachmentNames: string[] = [];
  if (attachmentMode === 'append' && attachmentFiles.length > 0) {
    const merged = await appendAttachmentPdfs(db, pdfBuffer, attachmentFiles);
    pdfBuffer = merged.mergedBuffer;
    appendedAttachmentNames = merged.appendedAttachmentNames;
  }

  // ----- Upload to Supabase Storage -----
  const storagePath = `${tenantId}/proposals/${proposal.proposal_code}.pdf`;

  const { error: uploadErr } = await uploadPdf(db, storagePath, pdfBuffer);
  if (uploadErr) {
    console.error('[generate-pdf] Storage upload failed:', uploadErr);
    return {
      success: false,
      error: PROPOSAL_005(`Storage upload failed: ${uploadErr.message}`, INSTANCE),
    };
  }

  // ----- Insert files metadata row -----
  const fileCode = generateFileCode();
  const { data: fileRecord, error: fileErr } = await insertFileRecord(
    db, tenantId, proposal.id, storagePath, proposal.proposal_code, fileCode, pdfBuffer.length,
  );

  if (fileErr || !fileRecord) {
    console.error('[generate-pdf] File record insert failed:', fileErr);
    return {
      success: false,
      error: SYS_002(fileErr?.message ?? 'Failed to create file metadata record', INSTANCE),
    };
  }

  // ----- Update proposal with pdf_file_id and pdf_generated_at -----
  const { error: updateErr } = await updateProposalPdfFile(db, tenantId, proposal.id, fileRecord.id);
  if (updateErr) {
    console.error('[generate-pdf] Proposal update failed:', updateErr);
    return {
      success: false,
      error: SYS_002(`Failed to update proposal: ${updateErr.message}`, INSTANCE),
    };
  }

  return {
    success: true,
    data: {
      fileId: fileRecord.id,
      storageUrl: storagePath,
      attachmentMode,
      appendedAttachmentNames,
    },
  };
}
