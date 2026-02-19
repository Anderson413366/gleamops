/**
 * Proposals PDF data access layer.
 * All Supabase queries for the PDF generation domain.
 * Extracted from api/proposals/[id]/generate-pdf/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export type ProposalAttachmentFile = {
  id: string;
  original_filename: string | null;
  storage_path: string;
  mime_type: string | null;
};

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findProposal(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
) {
  return db
    .from('sales_proposals')
    .select('id, proposal_code, status, tenant_id, bid_version_id, valid_until, notes, created_at, layout_config')
    .eq('id', proposalId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function findPricingOptions(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
) {
  return db
    .from('sales_proposal_pricing_options')
    .select('label, monthly_price, is_recommended, description, sort_order')
    .eq('proposal_id', proposalId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });
}

export async function findBidVersion(
  db: SupabaseClient,
  tenantId: string,
  bidVersionId: string,
) {
  return db
    .from('sales_bid_versions')
    .select('id, bid_id')
    .eq('id', bidVersionId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function findBid(
  db: SupabaseClient,
  tenantId: string,
  bidId: string,
) {
  return db
    .from('sales_bids')
    .select('id, bid_code, client_id')
    .eq('id', bidId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function findClient(
  db: SupabaseClient,
  tenantId: string,
  clientId: string,
) {
  return db
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single();
}

export async function findBidSiteName(
  db: SupabaseClient,
  tenantId: string,
  bidVersionId: string,
): Promise<string | undefined> {
  const { data: bidSites } = await db
    .from('sales_bid_sites')
    .select('site_name')
    .eq('bid_version_id', bidVersionId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  return bidSites?.site_name ?? undefined;
}

export async function findTenantName(
  db: SupabaseClient,
  tenantId: string,
): Promise<string | undefined> {
  const { data: tenant } = await db
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single();

  return tenant?.name ?? undefined;
}

export async function findSignatures(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
): Promise<Array<{ signerName: string; signatureImageUrl?: string; signedAt: string }> | undefined> {
  const { data: sigRecords } = await db
    .from('sales_proposal_signatures')
    .select('signer_name, signature_file_id, signed_at')
    .eq('proposal_id', proposalId)
    .eq('tenant_id', tenantId)
    .order('signed_at', { ascending: true });

  if (!sigRecords || sigRecords.length === 0) return undefined;

  const signatureData: Array<{ signerName: string; signatureImageUrl?: string; signedAt: string }> = [];
  for (const sig of sigRecords) {
    let signatureImageUrl: string | undefined;
    if (sig.signature_file_id) {
      const { data: fileRec } = await db
        .from('files')
        .select('storage_path')
        .eq('id', sig.signature_file_id)
        .single();

      if (fileRec?.storage_path) {
        const { data: signedUrl } = await db.storage
          .from('documents')
          .createSignedUrl(fileRec.storage_path, 300); // 5 min expiry
        if (signedUrl?.signedUrl) {
          signatureImageUrl = signedUrl.signedUrl;
        }
      }
    }
    signatureData.push({
      signerName: sig.signer_name,
      signatureImageUrl,
      signedAt: sig.signed_at ?? new Date().toISOString(),
    });
  }

  return signatureData;
}

export async function findAttachments(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
): Promise<{ attachmentNames: string[]; attachmentFiles: ProposalAttachmentFile[] }> {
  const { data: attRecords } = await db
    .from('sales_proposal_attachments')
    .select('file_id')
    .eq('proposal_id', proposalId)
    .eq('tenant_id', tenantId)
    .order('sort_order');

  if (!attRecords || attRecords.length === 0) {
    return { attachmentNames: [], attachmentFiles: [] };
  }

  const fileIds = attRecords.map((a: { file_id: string }) => a.file_id);
  const { data: files } = await db
    .from('files')
    .select('id, original_filename, storage_path, mime_type')
    .in('id', fileIds);

  if (!files) {
    return { attachmentNames: [], attachmentFiles: [] };
  }

  // Maintain sort order
  const fileMap = new Map(
    files.map(
      (f: {
        id: string;
        original_filename: string | null;
        storage_path: string;
        mime_type: string | null;
      }) => [f.id, f],
    ),
  );

  const attachmentFiles = attRecords
    .map((a: { file_id: string }) => fileMap.get(a.file_id))
    .filter((f): f is ProposalAttachmentFile => !!f);

  const attachmentNames = attRecords
    .map((a: { file_id: string }) => fileMap.get(a.file_id)?.original_filename ?? null)
    .filter((n): n is string => !!n);

  return { attachmentNames, attachmentFiles };
}

export async function createSignedUrl(
  db: SupabaseClient,
  storagePath: string,
  expiresIn: number = 300,
) {
  return db.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresIn);
}

export async function uploadPdf(
  db: SupabaseClient,
  storagePath: string,
  pdfBuffer: Buffer,
) {
  return db.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
}

export async function insertFileRecord(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
  storagePath: string,
  proposalCode: string,
  fileCode: string,
  sizeBytes: number,
) {
  return db
    .from('files')
    .insert({
      tenant_id: tenantId,
      file_code: fileCode,
      entity_type: 'PROPOSAL',
      entity_id: proposalId,
      bucket: 'documents',
      storage_path: storagePath,
      original_filename: `${proposalCode}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: sizeBytes,
    })
    .select('id')
    .single();
}

export async function updateProposalPdfFile(
  db: SupabaseClient,
  tenantId: string,
  proposalId: string,
  fileId: string,
) {
  return db
    .from('sales_proposals')
    .update({
      pdf_file_id: fileId,
      pdf_generated_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .eq('tenant_id', tenantId);
}

export async function downloadAttachmentPdf(
  db: SupabaseClient,
  storagePath: string,
): Promise<ArrayBuffer | null> {
  const { data: signedUrlData, error: signedErr } = await db.storage
    .from('documents')
    .createSignedUrl(storagePath, 300);

  if (signedErr || !signedUrlData?.signedUrl) return null;

  const response = await fetch(signedUrlData.signedUrl);
  if (!response.ok) return null;

  return response.arrayBuffer();
}
