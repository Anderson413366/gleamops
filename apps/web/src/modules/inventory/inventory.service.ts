/**
 * Inventory approval workflow service.
 * Business logic extracted verbatim from api/inventory/approvals/route.ts
 */
import type { NextRequest } from 'next/server';
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuditContext } from '@/lib/api/audit';
import { hasApprovalRole } from './inventory.permissions';
import {
  createDb,
  findEntity,
  findWorkflow,
  upsertWorkflow,
  deleteSteps,
  insertSteps,
  updateEntity,
  insertAction,
  findSteps,
  updateStep,
  skipPendingSteps,
  updateWorkflow,
  writeAuditMutation,
  toWorkflowEntityType,
  toEntityTable,
  type EntityType,
} from './inventory.repository';

const INSTANCE = '/api/inventory/approvals';

interface ApprovalInput {
  entityType: EntityType;
  entityId: string;
  action: 'submit' | 'approve' | 'reject';
  notes?: string | null;
}

interface AuthContext {
  tenantId: string;
  userId: string;
  roles: string[];
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

function workflowStepsForEntity(entityType: EntityType, amount: number): string[] {
  if (entityType === 'purchase_order') {
    return amount >= 2000 ? ['WAREHOUSE', 'FINANCE'] : ['WAREHOUSE'];
  }
  return ['WAREHOUSE', 'OPERATIONS'];
}

export async function processApproval(
  auth: AuthContext,
  input: ApprovalInput,
  request: NextRequest,
): Promise<ServiceResult> {
  const { tenantId, userId, roles } = auth;
  const { entityType, entityId, action, notes: notesRaw } = input;
  const notes = notesRaw ?? undefined;
  const workflowEntityType = toWorkflowEntityType(entityType);
  const table = toEntityTable(entityType);
  const nowIso = new Date().toISOString();
  const db = createDb();

  try {
    // Load the entity
    const { data: entityBefore, error: entityBeforeErr } = await findEntity(db, table, tenantId, entityId);
    if (entityBeforeErr || !entityBefore) {
      return {
        success: false,
        error: createProblemDetails('INV_APPROVAL_404', 'Entity not found', 404, `No ${entityType} found for this tenant`, INSTANCE),
      };
    }

    // Find existing workflow
    const { data: workflowExisting, error: workflowFindErr } = await findWorkflow(db, tenantId, workflowEntityType, entityId);
    if (workflowFindErr) {
      return { success: false, error: SYS_002(workflowFindErr.message, INSTANCE) };
    }

    // ---- SUBMIT ----
    if (action === 'submit') {
      return handleSubmit(db, tenantId, userId, entityType, entityId, table, workflowEntityType, entityBefore, workflowExisting, notes, nowIso, request);
    }

    // ---- APPROVE / REJECT ----
    if (!workflowExisting || workflowExisting.status !== 'PENDING') {
      return {
        success: false,
        error: createProblemDetails('INV_APPROVAL_409', 'No pending workflow', 409, 'Submit for approval before approving or rejecting.', INSTANCE),
      };
    }

    const { data: steps, error: stepsErr } = await findSteps(db, tenantId, workflowExisting.id);
    if (stepsErr || !steps || steps.length === 0) {
      return { success: false, error: SYS_002(stepsErr?.message ?? 'Approval steps missing', INSTANCE) };
    }

    const pendingStep = steps.find((step: Record<string, unknown>) => step.status === 'PENDING');
    if (!pendingStep) {
      return {
        success: false,
        error: createProblemDetails('INV_APPROVAL_409', 'No pending step', 409, 'No pending approval step is available.', INSTANCE),
      };
    }

    if (!hasApprovalRole(roles, String(pendingStep.approver_role))) {
      return {
        success: false,
        error: createProblemDetails('INV_APPROVAL_403', 'Forbidden', 403, `This step requires ${String(pendingStep.approver_role)} role.`, INSTANCE),
      };
    }

    const stepStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const { error: stepUpdateErr } = await updateStep(db, tenantId, pendingStep.id, {
      status: stepStatus,
      acted_by_user_id: userId,
      acted_at: nowIso,
      notes,
    });
    if (stepUpdateErr) {
      return { success: false, error: SYS_002(stepUpdateErr.message, INSTANCE) };
    }

    if (action === 'reject') {
      return handleReject(db, tenantId, userId, entityId, table, entityBefore, workflowExisting, pendingStep, notes, nowIso, request);
    }

    // ---- APPROVE: advance or finalize ----
    return handleApprove(db, tenantId, userId, entityId, table, entityBefore, workflowExisting, steps, pendingStep, notes, nowIso, request);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unexpected approval workflow error';
    return { success: false, error: SYS_002(msg, INSTANCE) };
  }
}

// ---- Submit handler ----
async function handleSubmit(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  entityType: EntityType,
  entityId: string,
  table: ReturnType<typeof toEntityTable>,
  workflowEntityType: ReturnType<typeof toWorkflowEntityType>,
  entityBefore: Record<string, unknown>,
  workflowExisting: Record<string, unknown> | null,
  notes: string | undefined,
  nowIso: string,
  request: NextRequest,
): Promise<ServiceResult> {
  if (workflowExisting && (workflowExisting as Record<string, unknown>).status === 'PENDING') {
    return {
      success: true,
      data: { success: true, workflow: workflowExisting, message: 'Workflow already pending approval.' },
    };
  }

  if (workflowExisting && (workflowExisting as Record<string, unknown>).status === 'APPROVED') {
    return {
      success: false,
      error: createProblemDetails('INV_APPROVAL_409', 'Already approved', 409, 'This record is already approved.', INSTANCE),
    };
  }

  const amount = Number((entityBefore as Record<string, unknown>).total ?? 0);
  const rolesForSteps = workflowStepsForEntity(entityType, amount);

  const { data: workflow, error: workflowErr } = await upsertWorkflow(
    db, tenantId, workflowEntityType, entityId, userId, rolesForSteps.length, notes, nowIso,
  );
  if (workflowErr || !workflow) {
    return { success: false, error: SYS_002(workflowErr?.message ?? 'Failed to create approval workflow', INSTANCE) };
  }

  await deleteSteps(db, tenantId, workflow.id);
  const { error: stepErr } = await insertSteps(db, tenantId, workflow.id, rolesForSteps);
  if (stepErr) {
    return { success: false, error: SYS_002(stepErr.message, INSTANCE) };
  }

  const entityPatch: Record<string, unknown> = {
    submitted_for_approval_at: nowIso,
    approval_notes: notes,
  };
  if (entityType === 'purchase_order') {
    entityPatch.status = 'PENDING_APPROVAL';
  }

  const { data: entityAfter, error: entityUpdateErr } = await updateEntity(db, table, tenantId, entityId, entityPatch);
  if (entityUpdateErr || !entityAfter) {
    return { success: false, error: SYS_002(entityUpdateErr?.message ?? 'Failed to update entity state', INSTANCE) };
  }

  await insertAction(db, tenantId, workflow.id, 'SUBMITTED', userId, notes);

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: table,
    entityId,
    action: 'SUBMIT_FOR_APPROVAL',
    before: entityBefore as Record<string, unknown>,
    after: entityAfter as Record<string, unknown>,
    context: extractAuditContext(request, `${table}_submit_for_approval`),
  });

  return { success: true, data: { success: true, workflow, entity: entityAfter } };
}

// ---- Reject handler ----
async function handleReject(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  entityId: string,
  table: ReturnType<typeof toEntityTable>,
  entityBefore: Record<string, unknown>,
  workflowExisting: Record<string, unknown>,
  pendingStep: Record<string, unknown>,
  notes: string | undefined,
  nowIso: string,
  request: NextRequest,
): Promise<ServiceResult> {
  await skipPendingSteps(db, tenantId, (workflowExisting as Record<string, unknown>).id as string);

  const { data: workflowAfter, error: workflowRejectErr } = await updateWorkflow(
    db, tenantId, (workflowExisting as Record<string, unknown>).id as string, {
      status: 'REJECTED',
      decided_at: nowIso,
      decision_notes: notes,
    },
  );
  if (workflowRejectErr || !workflowAfter) {
    return { success: false, error: SYS_002(workflowRejectErr?.message ?? 'Failed to update workflow', INSTANCE) };
  }

  const { data: entityAfter, error: entityRejectErr } = await updateEntity(db, table, tenantId, entityId, {
    status: 'REJECTED',
    approved_at: null,
    approved_by_user_id: null,
    approval_notes: notes,
  });
  if (entityRejectErr || !entityAfter) {
    return { success: false, error: SYS_002(entityRejectErr?.message ?? 'Failed to update entity state', INSTANCE) };
  }

  await insertAction(db, tenantId, (workflowExisting as Record<string, unknown>).id as string, 'REJECTED', userId, notes, pendingStep.id as string);

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: table,
    entityId,
    action: 'REJECT',
    before: entityBefore as Record<string, unknown>,
    after: entityAfter as Record<string, unknown>,
    context: extractAuditContext(request, `${table}_approval_reject`),
  });

  return { success: true, data: { success: true, workflow: workflowAfter, entity: entityAfter } };
}

// ---- Approve handler ----
async function handleApprove(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  entityId: string,
  table: ReturnType<typeof toEntityTable>,
  entityBefore: Record<string, unknown>,
  workflowExisting: Record<string, unknown>,
  steps: Record<string, unknown>[],
  pendingStep: Record<string, unknown>,
  notes: string | undefined,
  nowIso: string,
  request: NextRequest,
): Promise<ServiceResult> {
  const nextPendingStep = steps.find((step) => step.status === 'PENDING' && step.id !== pendingStep.id);
  const workflowId = (workflowExisting as Record<string, unknown>).id as string;

  if (nextPendingStep) {
    const { data: workflowAfter, error: workflowAdvanceErr } = await updateWorkflow(
      db, tenantId, workflowId, { current_step: nextPendingStep.step_order },
    );
    if (workflowAdvanceErr || !workflowAfter) {
      return { success: false, error: SYS_002(workflowAdvanceErr?.message ?? 'Failed to advance workflow', INSTANCE) };
    }

    await insertAction(db, tenantId, workflowId, 'APPROVED', userId, notes, pendingStep.id as string);
    return { success: true, data: { success: true, workflow: workflowAfter, pendingRole: nextPendingStep.approver_role } };
  }

  // Final approval
  const { data: workflowApproved, error: workflowApproveErr } = await updateWorkflow(
    db, tenantId, workflowId, {
      status: 'APPROVED',
      decided_at: nowIso,
      decision_notes: notes,
    },
  );
  if (workflowApproveErr || !workflowApproved) {
    return { success: false, error: SYS_002(workflowApproveErr?.message ?? 'Failed to finalize workflow', INSTANCE) };
  }

  const { data: entityAfter, error: entityApproveErr } = await updateEntity(db, table, tenantId, entityId, {
    status: 'APPROVED',
    approved_at: nowIso,
    approved_by_user_id: userId,
    approval_notes: notes,
  });
  if (entityApproveErr || !entityAfter) {
    return { success: false, error: SYS_002(entityApproveErr?.message ?? 'Failed to update entity state', INSTANCE) };
  }

  await insertAction(db, tenantId, workflowId, 'APPROVED', userId, notes, pendingStep.id as string);

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: table,
    entityId,
    action: 'APPROVE',
    before: entityBefore as Record<string, unknown>,
    after: entityAfter as Record<string, unknown>,
    context: extractAuditContext(request, `${table}_approval_approve`),
  });

  return { success: true, data: { success: true, workflow: workflowApproved, entity: entityAfter } };
}
