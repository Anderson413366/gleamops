import { NextRequest, NextResponse } from 'next/server';
import { SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { generateProposalPdf } from '@/modules/proposals-pdf';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const API_PATH = '/api/proposals/[id]/generate-pdf';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: proposalId } = await params;

    const auth = await extractAuth(request, API_PATH);
    if (isAuthError(auth)) return auth;

    const result = await generateProposalPdf(auth.tenantId, proposalId);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error.status,
        headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
      });
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (err: unknown) {
    console.error('[generate-pdf] Unexpected error:', err);
    const pd = SYS_002(err instanceof Error ? err.message : 'Unexpected server error', API_PATH);
    return NextResponse.json(pd, {
      status: pd.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }
}
