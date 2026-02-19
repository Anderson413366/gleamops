import { NextRequest, NextResponse } from 'next/server';
import { signatureSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { createProposalSignature } from '@/modules/proposals';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const API_PATH = '/api/proposals/[id]/signature';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, signatureSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const result = await createProposalSignature(auth.tenantId, id, validation.data, request, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json(result.data);
}
