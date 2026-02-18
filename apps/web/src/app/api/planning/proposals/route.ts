import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/planning/proposals';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const createProposalSchema = z.object({
  item_id: z.string().uuid(),
  proposed_staff_id: z.string().uuid().nullable().optional(),
  proposed_subcontractor_id: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).optional(),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canReadPlanning(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS']);
}

function canWritePlanning(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canReadPlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const db = getUserClient(request);
  const itemId = request.nextUrl.searchParams.get('itemId');
  const applyState = request.nextUrl.searchParams.get('applyState');

  let query = db
    .from('planning_item_proposals')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (itemId) query = query.eq('item_id', itemId);
  if (applyState) query = query.eq('apply_state', applyState);

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canWritePlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = createProposalSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const staffId = parsed.data.proposed_staff_id ?? null;
  const subId = parsed.data.proposed_subcontractor_id ?? null;

  if (!!staffId && !!subId) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Exactly one of proposed_staff_id or proposed_subcontractor_id must be set', API_PATH));
  }

  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data, error } = await db
    .from('planning_item_proposals')
    .insert({
      tenant_id: auth.tenantId,
      item_id: parsed.data.item_id,
      proposed_staff_id: staffId,
      proposed_subcontractor_id: subId,
      note: parsed.data.note ?? null,
      apply_state: 'PENDING',
    })
    .select('*')
    .single();

  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'planning_item_proposals',
    entityId: data?.id ?? null,
    action: 'CREATE',
    before: null,
    after: data,
    context: extractAuditContext(request, 'planning_proposal_create'),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
