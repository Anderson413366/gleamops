import { NextRequest, NextResponse } from 'next/server';
import { routeTemplateStopPatchSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { patchRouteTemplateStop } from '@/modules/route-templates';

const API_PATH = '/api/operations/route-templates/stops/[id]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, routeTemplateStopPatchSchema, API_PATH);
  if (validation.error) return validation.error;

  const { id } = await params;
  const result = await patchRouteTemplateStop(getUserClient(request), auth, id, validation.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
