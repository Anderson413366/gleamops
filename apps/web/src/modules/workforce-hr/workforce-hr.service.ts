/**
 * Workforce HR service.
 * Business logic for polymorphic HR entity CRUD.
 * Extracted verbatim from api/workforce/hr/[entity]/route.ts
 */
import type { NextRequest } from 'next/server';
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
import type { AuthContext } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { createDb, listRecords, insertRecord } from './workforce-hr.repository';

type EntityName =
  | 'pto-requests'
  | 'performance-reviews'
  | 'goals'
  | 'badges'
  | 'staff-badges'
  | 'staff-documents';

export type HrConfig = {
  table: string;
  schema: ZodSchema;
  orderBy: string;
};

const CONFIG: Record<EntityName, HrConfig> = {
  'pto-requests': { table: 'hr_pto_requests', schema: hrPtoRequestSchema, orderBy: 'created_at' },
  'performance-reviews': { table: 'hr_performance_reviews', schema: hrPerformanceReviewSchema, orderBy: 'created_at' },
  goals: { table: 'hr_goals', schema: hrGoalSchema, orderBy: 'created_at' },
  badges: { table: 'hr_badges', schema: hrBadgeSchema, orderBy: 'created_at' },
  'staff-badges': { table: 'hr_staff_badges', schema: hrStaffBadgeSchema, orderBy: 'awarded_at' },
  'staff-documents': { table: 'hr_staff_documents', schema: hrStaffDocumentSchema, orderBy: 'created_at' },
};

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export function resolveEntity(entity: string): HrConfig | null {
  return CONFIG[entity as EntityName] ?? null;
}

export async function getHrRecords(
  tenantId: string,
  entity: string,
  staffId: string | null,
  status: string | null,
  apiPath: string,
): Promise<ServiceResult<unknown[]>> {
  const config = resolveEntity(entity);
  if (!config) {
    return { success: false, error: createProblemDetails('HR_404', 'Unknown HR entity', 404, `Unsupported HR entity: ${entity}`, apiPath) };
  }

  const db = createDb();
  const { data, error } = await listRecords(db, tenantId, config.table, config.orderBy, staffId, status);
  if (error) return { success: false, error: SYS_002(error.message, apiPath) };
  return { success: true, data: data ?? [] };
}

export async function createHrRecord(
  auth: AuthContext,
  request: NextRequest,
  entity: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<unknown>> {
  const config = resolveEntity(entity);
  if (!config) {
    return { success: false, error: createProblemDetails('HR_404', 'Unknown HR entity', 404, `Unsupported HR entity: ${entity}`, apiPath) };
  }

  const { tenantId, userId } = auth;
  const db = createDb();

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

  const { data, error } = await insertRecord(db, config.table, insertPayload);
  if (error || !data) {
    return { success: false, error: SYS_002(error?.message ?? 'Failed to create HR record', apiPath) };
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

  return { success: true, data };
}
