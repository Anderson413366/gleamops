import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/schedule/policies';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const policySchema = z.object({
  site_id: z.string().uuid().nullable().optional(),
  min_rest_hours: z.number().min(0).optional(),
  max_weekly_hours: z.number().min(0).optional(),
  overtime_warning_at_hours: z.number().min(0).optional(),
  rest_enforcement: z.enum(['warn', 'block', 'override_required']).optional(),
  weekly_hours_enforcement: z.enum(['warn', 'block', 'override_required']).optional(),
  subcontractor_capacity_enforcement: z.enum(['warn', 'block', 'override_required']).optional(),
  availability_enforcement: z.enum(['warn', 'block', 'override_required']).optional(),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canReadPolicy(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS']);
}

function canWritePolicy(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'ADMIN']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canReadPolicy(auth.roles)) {
    return problemResponse(AUTH_002(API_PATH));
  }

  const db = getUserClient(request);
  const siteId = request.nextUrl.searchParams.get('siteId');

  let query = db
    .from('schedule_policies')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canWritePolicy(auth.roles)) {
    return problemResponse(AUTH_002(API_PATH));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const payload = parsed.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const siteId = payload.site_id ?? null;

  let existingQuery = db
    .from('schedule_policies')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .limit(1);

  if (siteId) {
    existingQuery = existingQuery.eq('site_id', siteId);
  } else {
    existingQuery = existingQuery.is('site_id', null);
  }

  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) return problemResponse(SYS_002(existingError.message, API_PATH));

  const existing = existingRows?.[0] ?? null;

  const upsertPayload = {
    tenant_id: auth.tenantId,
    site_id: siteId,
    min_rest_hours: payload.min_rest_hours ?? existing?.min_rest_hours ?? 8,
    max_weekly_hours: payload.max_weekly_hours ?? existing?.max_weekly_hours ?? 40,
    overtime_warning_at_hours: payload.overtime_warning_at_hours ?? existing?.overtime_warning_at_hours ?? 38,
    rest_enforcement: payload.rest_enforcement ?? existing?.rest_enforcement ?? 'warn',
    weekly_hours_enforcement: payload.weekly_hours_enforcement ?? existing?.weekly_hours_enforcement ?? 'warn',
    subcontractor_capacity_enforcement: payload.subcontractor_capacity_enforcement ?? existing?.subcontractor_capacity_enforcement ?? 'warn',
    availability_enforcement: payload.availability_enforcement ?? existing?.availability_enforcement ?? 'warn',
  };

  let saved;
  if (existing) {
    const { data, error } = await db
      .from('schedule_policies')
      .update(upsertPayload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return problemResponse(SYS_002(error.message, API_PATH));
    saved = data;
  } else {
    const { data, error } = await db
      .from('schedule_policies')
      .insert(upsertPayload)
      .select('*')
      .single();
    if (error) return problemResponse(SYS_002(error.message, API_PATH));
    saved = data;
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'schedule_policies',
    entityId: saved?.id ?? null,
    action: existing ? 'UPDATE' : 'CREATE',
    before: existing,
    after: saved,
    context: extractAuditContext(request, 'schedule_policy_upsert'),
  });

  return NextResponse.json({ success: true, data: saved });
}
