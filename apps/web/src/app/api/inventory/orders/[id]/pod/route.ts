import { NextRequest, NextResponse } from 'next/server';
import { supplyOrderPodSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { getProofOfDelivery, createProofOfDelivery } from '@/modules/inventory-orders';

const API_PATH = '/api/inventory/orders/[id]/pod';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const result = await getProofOfDelivery(auth.tenantId, id, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, proof: result.data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, supplyOrderPodSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const result = await createProofOfDelivery(auth, request, id, validation.data, API_PATH);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json({ success: true, proof: result.data });
}
