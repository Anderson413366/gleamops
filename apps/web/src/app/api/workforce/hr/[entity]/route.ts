import { NextRequest, NextResponse } from 'next/server';
import {
  createProblemDetails,
  hrBadgeSchema,
  hrGoalSchema,
  hrPerformanceReviewSchema,
  hrPtoRequestSchema,
  hrStaffBadgeSchema,
  hrStaffDocumentSchema,
  SYS_002,
} from '@gleamops/shared';
import type { ZodSchema } from 'zod';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { validateBody } from '@/lib/api/validate-request';

const API_PATH = '/api/workforce/hr/[entity]';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

type EntityName =
  | 'pto-requests'
  | 'performance-reviews'
  | 'goals'
  | 'badges'
  | 'staff-badges'
  | 'staff-documents';

type Config = {
  table: string;
  schema: ZodSchema;
  orderBy: string;
};

const CONFIG: Record<EntityName, Config> = {
  'pto-requests': { table: 'hr_pto_requests', schema: hrPtoRequestSchema, orderBy: 'created_at' },
  'performance-reviews': { table: 'hr_performance_reviews', schema: hrPerformanceReviewSchema, orderBy: 'created_at' },
  goals: { table: 'hr_goals', schema: hrGoalSchema, orderBy: 'created_at' },
  badges: { table: 'hr_badges', schema: hrBadgeSchema, orderBy: 'created_at' },
  'staff-badges': { table: 'hr_staff_badges', schema: hrStaffBadgeSchema, orderBy: 'awarded_at' },
  'staff-documents': { table: 'hr_staff_documents', schema: hrStaffDocumentSchema, orderBy: 'created_at' },
};

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function resolveEntity(entity: string): Config | null {
  return CONFIG[entity as EntityName] ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { tenantId } = auth;
  const { entity } = await params;
  const config = resolveEntity(entity);
  if (!config) {
    return problemResponse(
      createProblemDetails('HR_404', 'Unknown HR entity', 404, `Unsupported HR entity: ${entity}`, API_PATH),
    );
  }

  const db = getServiceClient();
  const staffId = request.nextUrl.searchParams.get('staffId');
  const status = request.nextUrl.searchParams.get('status');

  let query = db
    .from(config.table)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order(config.orderBy, { ascending: false })
    .limit(500);

  if (staffId && ['hr_pto_requests', 'hr_performance_reviews', 'hr_goals', 'hr_staff_badges', 'hr_staff_documents'].includes(config.table)) {
    query = query.eq('staff_id', staffId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return problemResponse(SYS_002(error.message, API_PATH));
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { tenantId, userId } = auth;
  const { entity } = await params;
  const config = resolveEntity(entity);
  if (!config) {
    return problemResponse(
      createProblemDetails('HR_404', 'Unknown HR entity', 404, `Unsupported HR entity: ${entity}`, API_PATH),
    );
  }

  const validation = await validateBody(request, config.schema, API_PATH);
  if (validation.error) return validation.error;
  const payload = validation.data as Record<string, unknown>;
  const db = getServiceClient();

  const insertPayload: Record<string, unknown> = {
    ...payload,
    tenant_id: tenantId,
  };

  if (config.table === 'hr_goals' && !insertPayload.created_by_user_id) {
    insertPayload.created_by_user_id = userId;
  }
  if (config.table === 'hr_staff_badges') {
    insertPayload.awarded_by_user_id = userId;
    if (!insertPayload.awarded_at) insertPayload.awarded_at = new Date().toISOString();
  }
  if (config.table === 'hr_pto_requests') {
    insertPayload.approved_by_user_id = null;
    insertPayload.approved_at = null;
  }

  const { data, error } = await db
    .from(config.table)
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    return problemResponse(SYS_002(error?.message ?? 'Failed to create HR record', API_PATH));
  }

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: config.table,
    entityId: (data as { id?: string }).id ?? null,
    action: 'CREATE',
    before: null,
    after: data as Record<string, unknown>,
    context: extractAuditContext(request, `hr_${entity}_create`),
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
