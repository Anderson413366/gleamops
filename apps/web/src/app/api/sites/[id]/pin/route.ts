import { NextRequest, NextResponse } from 'next/server';
import { sitePinCodeSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';
import { createSitePin } from '@/modules/sites';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const bodySchema = sitePinCodeSchema.omit({ site_id: true });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const instance = `/api/sites/${siteId}/pin`;

  const auth = await extractAuth(request, instance);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, bodySchema, instance);
  if (validation.error) return validation.error;

  const result = await createSitePin(auth.tenantId, siteId, validation.data, instance);
  if (!result.success) return NextResponse.json(result.error, { status: result.error.status, headers: { 'Content-Type': CONTENT_TYPE_PROBLEM } });
  return NextResponse.json(result.data, { status: 201 });
}
