import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProblemDetails, SYS_002, signatureSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const API_PATH = '/api/proposals/[id]/signature';

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
 * POST /api/proposals/[id]/signature
 *
 * Creates a signature record server-side to capture IP address and user agent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: proposalId } = await params;

    // ----- Auth -----
    const auth = await extractAuth(request, API_PATH);
    if (isAuthError(auth)) return auth;
    const { tenantId } = auth;

    // ----- Body -----
    const validation = await validateBody(request, signatureSchema, API_PATH);
    if (validation.error) return validation.error;
    const {
      signerName,
      signerEmail,
      signatureTypeCode,
      signatureFileId,
      signatureFontName,
    } = validation.data;

    // Capture IP + user agent from request headers
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null;
    const userAgent = request.headers.get('user-agent') ?? null;

    const db = getServiceClient();

    // Verify proposal exists and belongs to tenant
    const { data: proposal, error: propErr } = await db
      .from('sales_proposals')
      .select('id')
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .single();

    if (propErr || !proposal) {
      return problemResponse(
        createProblemDetails('PROPOSAL_007', 'Proposal not found', 404, 'Proposal not found or access denied', API_PATH),
      );
    }

    // Insert signature record
    const { data: signature, error: sigErr } = await db
      .from('sales_proposal_signatures')
      .insert({
        tenant_id: tenantId,
        proposal_id: proposalId,
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim(),
        signature_type_code: signatureTypeCode,
        signature_file_id: signatureFileId || null,
        signature_font_name: signatureFontName || null,
        signed_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('*')
      .single();

    if (sigErr || !signature) {
      return problemResponse(
        SYS_002(sigErr?.message ?? 'Failed to create signature record', API_PATH),
      );
    }

    return NextResponse.json({ success: true, signature });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[proposal-signature] Unexpected error:', msg);
    return problemResponse(SYS_002(msg, API_PATH));
  }
}
