import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/planning/items';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canReadPlanning(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canReadPlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const db = getUserClient(request);
  const boardId = request.nextUrl.searchParams.get('boardId');

  let query = db
    .from('planning_board_items')
    .select('*, proposals:planning_item_proposals(id, apply_state, proposed_staff_id, proposed_subcontractor_id)')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .limit(500);

  if (boardId) query = query.eq('board_id', boardId);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}
