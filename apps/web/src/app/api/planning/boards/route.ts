import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/planning/boards';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const createBoardSchema = z.object({
  board_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supervisor_staff_id: z.string().uuid().nullable().optional(),
  workspace_scope: z.enum(['SUPERVISOR', 'REGION', 'GLOBAL']).default('SUPERVISOR'),
  title: z.string().min(1).max(200),
  notes: z.string().nullable().optional(),
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
  const url = request.nextUrl;
  const boardDate = url.searchParams.get('date');
  const status = url.searchParams.get('status');

  let query = db
    .from('planning_boards')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('board_date', { ascending: false })
    .limit(100);

  if (boardDate) query = query.eq('board_date', boardDate);
  if (status) query = query.eq('status', status);

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

  const parsed = createBoardSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data, error } = await db
    .from('planning_boards')
    .insert({
      tenant_id: auth.tenantId,
      board_date: parsed.data.board_date,
      supervisor_staff_id: parsed.data.supervisor_staff_id ?? null,
      workspace_scope: parsed.data.workspace_scope,
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      status: 'DRAFT',
    })
    .select('*')
    .single();

  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'planning_boards',
    entityId: data?.id ?? null,
    action: 'CREATE',
    before: null,
    after: data,
    context: extractAuditContext(request, 'planning_board_create'),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
