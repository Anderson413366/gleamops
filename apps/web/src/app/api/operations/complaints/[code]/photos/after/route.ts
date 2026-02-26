import { NextRequest, NextResponse } from 'next/server';
import { complaintPhotoSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { validateBody } from '@/lib/api/validate-request';
import { addComplaintPhotoAfter } from '@/modules/complaints';

const API_PATH = '/api/operations/complaints/[code]/photos/after';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const validation = await validateBody(request, complaintPhotoSchema, API_PATH);
  if (validation.error) return validation.error;

  const { code } = await params;
  const result = await addComplaintPhotoAfter(getUserClient(request), auth, code, validation.data.photo_url, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, {
      status: result.error.status,
      headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
    });
  }

  return NextResponse.json({ success: true, data: result.data });
}
