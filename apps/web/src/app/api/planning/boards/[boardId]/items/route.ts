import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/planning/boards/[boardId]/items';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const createItemSchema = z.object({
  item_kind: z.enum(['TICKET', 'NOTE', 'TASK']).default('TICKET'),
  ticket_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  current_assignee_staff_id: z.string().uuid().nullable().optional(),
  current_assignee_subcontractor_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canReadPlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const { boardId } = await params;
  const db = getUserClient(request);

  const { data, error } = await db
    .from('planning_board_items')
    .select('*, proposals:planning_item_proposals(id, apply_state, proposed_staff_id, proposed_subcontractor_id)')
    .eq('tenant_id', auth.tenantId)
    .eq('board_id', boardId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true });

  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canWritePlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const { boardId } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const staffId = parsed.data.current_assignee_staff_id ?? null;
  const subId = parsed.data.current_assignee_subcontractor_id ?? null;
  const hasStaff = !!staffId;
  const hasSub = !!subId;

  if (hasStaff && hasSub) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Exactly one of staff_id or subcontractor_id must be set', API_PATH));
  }

  const { data, error } = await db
    .from('planning_board_items')
    .insert({
      tenant_id: auth.tenantId,
      board_id: boardId,
      item_kind: parsed.data.item_kind,
      ticket_id: parsed.data.ticket_id ?? null,
      title: parsed.data.title,
      sync_state: 'synced',
      current_assignee_staff_id: staffId,
      current_assignee_subcontractor_id: subId,
      sort_order: parsed.data.sort_order,
    })
    .select('*')
    .single();

  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'planning_board_items',
    entityId: data?.id ?? null,
    action: 'CREATE',
    before: null,
    after: data,
    context: extractAuditContext(request, 'planning_board_item_create'),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
