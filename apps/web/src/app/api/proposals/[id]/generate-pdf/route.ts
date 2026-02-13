import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  createProblemDetails,
  AUTH_001,
  PROPOSAL_005,
  PROPOSAL_007,
  SYS_002,
} from '@gleamops/shared';
import { ProposalPDF } from '@/lib/pdf/proposal-template';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const API_PATH = '/api/proposals/[id]/generate-pdf';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /api/proposals/[id]/generate-pdf
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: proposalId } = await params;

    // ----- Auth -----
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return problemResponse(
        createProblemDetails(
          'AUTH_001',
          'Unauthorized',
          401,
          'Missing authorization header',
          API_PATH,
        ),
      );
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return problemResponse(
        createProblemDetails(
          'AUTH_001',
          'Unauthorized',
          401,
          'Invalid or expired token',
          API_PATH,
        ),
      );
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return problemResponse(
        createProblemDetails(
          'AUTH_003',
          'Tenant scope mismatch',
          403,
          'No tenant in token claims',
          API_PATH,
        ),
      );
    }

    const db = getServiceClient();

    // ----- Fetch proposal -----
    const { data: proposal, error: propErr } = await db
      .from('sales_proposals')
      .select('id, proposal_code, status, tenant_id, bid_version_id, valid_until, notes, created_at')
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .single();

    if (propErr || !proposal) {
      return problemResponse(PROPOSAL_007(API_PATH));
    }

    // ----- Fetch pricing options -----
    const { data: pricingOptions, error: poErr } = await db
      .from('sales_proposal_pricing_options')
      .select('label, monthly_price, is_recommended, description, sort_order')
      .eq('proposal_id', proposal.id)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (poErr) {
      return problemResponse(
        PROPOSAL_005(
          `Failed to fetch pricing options: ${poErr.message}`,
          API_PATH,
        ),
      );
    }

    // ----- Fetch bid version -> bid -> client info -----
    const { data: bidVersion, error: bvErr } = await db
      .from('sales_bid_versions')
      .select('id, bid_id')
      .eq('id', proposal.bid_version_id)
      .eq('tenant_id', tenantId)
      .single();

    if (bvErr || !bidVersion) {
      return problemResponse(
        PROPOSAL_005('Failed to resolve bid version', API_PATH),
      );
    }

    const { data: bid, error: bidErr } = await db
      .from('sales_bids')
      .select('id, bid_code, client_id')
      .eq('id', bidVersion.bid_id)
      .eq('tenant_id', tenantId)
      .single();

    if (bidErr || !bid) {
      return problemResponse(
        PROPOSAL_005('Failed to resolve bid', API_PATH),
      );
    }

    const { data: client, error: clientErr } = await db
      .from('clients')
      .select('id, name')
      .eq('id', bid.client_id)
      .eq('tenant_id', tenantId)
      .single();

    if (clientErr || !client) {
      return problemResponse(
        PROPOSAL_005('Failed to resolve client', API_PATH),
      );
    }

    // ----- Fetch site info (optional — from sales_bid_sites) -----
    let siteName: string | undefined;
    const { data: bidSites } = await db
      .from('sales_bid_sites')
      .select('site_name')
      .eq('bid_version_id', proposal.bid_version_id)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (bidSites?.site_name) {
      siteName = bidSites.site_name;
    }

    // ----- Fetch tenant info for company branding -----
    const { data: tenant } = await db
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

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
      companyName: tenant?.name ?? 'GleamOps',
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderToBuffer(ProposalPDF(pdfProps));
    } catch (renderErr: any) {
      console.error('[generate-pdf] PDF render failed:', renderErr);
      return problemResponse(
        PROPOSAL_005(
          `PDF render failed: ${renderErr?.message ?? 'Unknown error'}`,
          API_PATH,
        ),
      );
    }

    // ----- Upload to Supabase Storage -----
    const storagePath = `${tenantId}/proposals/${proposal.proposal_code}.pdf`;

    const { error: uploadErr } = await db.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[generate-pdf] Storage upload failed:', uploadErr);
      return problemResponse(
        PROPOSAL_005(
          `Storage upload failed: ${uploadErr.message}`,
          API_PATH,
        ),
      );
    }

    // ----- Insert files metadata row -----
    const fileCode = generateFileCode();
    const { data: fileRecord, error: fileErr } = await db
      .from('files')
      .insert({
        tenant_id: tenantId,
        file_code: fileCode,
        entity_type: 'PROPOSAL',
        entity_id: proposal.id,
        bucket: 'documents',
        storage_path: storagePath,
        original_filename: `${proposal.proposal_code}.pdf`,
        mime_type: 'application/pdf',
        size_bytes: pdfBuffer.length,
      })
      .select('id')
      .single();

    if (fileErr || !fileRecord) {
      console.error('[generate-pdf] File record insert failed:', fileErr);
      return problemResponse(
        SYS_002(
          fileErr?.message ?? 'Failed to create file metadata record',
          API_PATH,
        ),
      );
    }

    // ----- Update proposal with pdf_file_id and pdf_generated_at -----
    const { error: updateErr } = await db
      .from('sales_proposals')
      .update({
        pdf_file_id: fileRecord.id,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', proposal.id)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      console.error('[generate-pdf] Proposal update failed:', updateErr);
      return problemResponse(
        SYS_002(
          `Failed to update proposal: ${updateErr.message}`,
          API_PATH,
        ),
      );
    }

    // ----- Return success -----
    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      storageUrl: storagePath,
    });
  } catch (err: any) {
    console.error('[generate-pdf] Unexpected error:', err);
    return problemResponse(
      SYS_002(err?.message ?? 'Unexpected server error', API_PATH),
    );
  }
}
