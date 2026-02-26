import { NextRequest, NextResponse } from 'next/server';
import { routeTemplatePatchSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { getRouteTemplate, patchRouteTemplate } from '@/modules/route-templates';

const API_PATH = '/api/operations/route-templates/[id]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const result = await getRouteTemplate(getUserClient(request), auth, id, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, routeTemplatePatchSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const result = await patchRouteTemplate(getUserClient(request), auth, id, validation.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
