import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, procurementApprovalActionSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { validateBody } from '@/lib/api/validate-request';

const INSTANCE = '/api/inventory/approvals';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

type EntityType = 'purchase_order' | 'supply_request';
type EntityTable = 'purchase_orders' | 'supply_requests';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function toWorkflowEntityType(entityType: EntityType): 'PURCHASE_ORDER' | 'SUPPLY_REQUEST' {
  return entityType === 'purchase_order' ? 'PURCHASE_ORDER' : 'SUPPLY_REQUEST';
}

function toEntityTable(entityType: EntityType): EntityTable {
  return entityType === 'purchase_order' ? 'purchase_orders' : 'supply_requests';
}

function hasApprovalRole(userRoles: string[], requiredRole: string): boolean {
  const normalizedRoles = userRoles.map((role) => role.toUpperCase());
  return normalizedRoles.includes('ADMIN') || normalizedRoles.includes(requiredRole.toUpperCase());
}

function workflowStepsForEntity(entityType: EntityType, amount: number): string[] {
  if (entityType === 'purchase_order') {
    return amount >= 2000 ? ['WAREHOUSE', 'FINANCE'] : ['WAREHOUSE'];
  }
  return ['WAREHOUSE', 'OPERATIONS'];
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, INSTANCE);
  if (isAuthError(auth)) return auth;

  const { tenantId, userId, roles } = auth;
  const db = getServiceClient();

  const validation = await validateBody(request, procurementApprovalActionSchema, INSTANCE);
  if (validation.error) return validation.error;

  const { entityType, entityId, action, notes } = validation.data;
  const workflowEntityType = toWorkflowEntityType(entityType);
  const table = toEntityTable(entityType);
  const nowIso = new Date().toISOString();

  try {
    const { data: entityBefore, error: entityBeforeErr } = await db
      .from(table)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', entityId)
      .single();

    if (entityBeforeErr || !entityBefore) {
      return problemResponse(
        createProblemDetails('INV_APPROVAL_404', 'Entity not found', 404, `No ${entityType} found for this tenant`, INSTANCE),
      );
    }

    const { data: workflowExisting, error: workflowFindErr } = await db
      .from('procurement_approval_workflows')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', workflowEntityType)
      .eq('entity_id', entityId)
      .is('archived_at', null)
      .maybeSingle();

    if (workflowFindErr) {
      return problemResponse(SYS_002(workflowFindErr.message, INSTANCE));
    }

    if (action === 'submit') {
      if (workflowExisting && workflowExisting.status === 'PENDING') {
        return NextResponse.json({
          success: true,
          workflow: workflowExisting,
          message: 'Workflow already pending approval.',
        });
      }

      if (workflowExisting && workflowExisting.status === 'APPROVED') {
        return problemResponse(
          createProblemDetails('INV_APPROVAL_409', 'Already approved', 409, 'This record is already approved.', INSTANCE),
        );
      }

      const amount = Number((entityBefore.total ?? 0));
      const rolesForSteps = workflowStepsForEntity(entityType, amount);

      const { data: workflow, error: workflowErr } = await db
        .from('procurement_approval_workflows')
        .upsert({
          tenant_id: tenantId,
          entity_type: workflowEntityType,
          entity_id: entityId,
          status: 'PENDING',
          current_step: 1,
          total_steps: rolesForSteps.length,
          created_by_user_id: userId,
          submitted_at: nowIso,
          decided_at: null,
          decision_notes: notes,
        }, { onConflict: 'tenant_id,entity_type,entity_id' })
        .select('*')
        .single();

      if (workflowErr || !workflow) {
        return problemResponse(SYS_002(workflowErr?.message ?? 'Failed to create approval workflow', INSTANCE));
      }

      await db
        .from('procurement_approval_steps')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('workflow_id', workflow.id);

      const { error: stepErr } = await db
        .from('procurement_approval_steps')
        .insert(
          rolesForSteps.map((role, index) => ({
            tenant_id: tenantId,
            workflow_id: workflow.id,
            step_order: index + 1,
            approver_role: role,
            status: 'PENDING',
          })),
        );

      if (stepErr) {
        return problemResponse(SYS_002(stepErr.message, INSTANCE));
      }

      const entityPatch: Record<string, unknown> = {
        submitted_for_approval_at: nowIso,
        approval_notes: notes,
      };
      if (entityType === 'purchase_order') {
        entityPatch.status = 'PENDING_APPROVAL';
      }

      const { data: entityAfter, error: entityUpdateErr } = await db
        .from(table)
        .update(entityPatch)
        .eq('tenant_id', tenantId)
        .eq('id', entityId)
        .select('*')
        .single();

      if (entityUpdateErr || !entityAfter) {
        return problemResponse(SYS_002(entityUpdateErr?.message ?? 'Failed to update entity state', INSTANCE));
      }

      await db.from('procurement_approval_actions').insert({
        tenant_id: tenantId,
        workflow_id: workflow.id,
        action: 'SUBMITTED',
        actor_user_id: userId,
        notes,
      });

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

      return NextResponse.json({ success: true, workflow, entity: entityAfter });
    }

    if (!workflowExisting || workflowExisting.status !== 'PENDING') {
      return problemResponse(
        createProblemDetails('INV_APPROVAL_409', 'No pending workflow', 409, 'Submit for approval before approving or rejecting.', INSTANCE),
      );
    }

    const { data: steps, error: stepsErr } = await db
      .from('procurement_approval_steps')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('workflow_id', workflowExisting.id)
      .is('archived_at', null)
      .order('step_order', { ascending: true });

    if (stepsErr || !steps || steps.length === 0) {
      return problemResponse(SYS_002(stepsErr?.message ?? 'Approval steps missing', INSTANCE));
    }

    const pendingStep = steps.find((step) => step.status === 'PENDING');
    if (!pendingStep) {
      return problemResponse(
        createProblemDetails('INV_APPROVAL_409', 'No pending step', 409, 'No pending approval step is available.', INSTANCE),
      );
    }

    if (!hasApprovalRole(roles, String(pendingStep.approver_role))) {
      return problemResponse(
        createProblemDetails(
          'INV_APPROVAL_403',
          'Forbidden',
          403,
          `This step requires ${String(pendingStep.approver_role)} role.`,
          INSTANCE,
        ),
      );
    }

    const stepStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const { error: stepUpdateErr } = await db
      .from('procurement_approval_steps')
      .update({
        status: stepStatus,
        acted_by_user_id: userId,
        acted_at: nowIso,
        notes,
      })
      .eq('tenant_id', tenantId)
      .eq('id', pendingStep.id);

    if (stepUpdateErr) {
      return problemResponse(SYS_002(stepUpdateErr.message, INSTANCE));
    }

    if (action === 'reject') {
      await db
        .from('procurement_approval_steps')
        .update({ status: 'SKIPPED' })
        .eq('tenant_id', tenantId)
        .eq('workflow_id', workflowExisting.id)
        .eq('status', 'PENDING');

      const { data: workflowAfter, error: workflowRejectErr } = await db
        .from('procurement_approval_workflows')
        .update({
          status: 'REJECTED',
          decided_at: nowIso,
          decision_notes: notes,
        })
        .eq('tenant_id', tenantId)
        .eq('id', workflowExisting.id)
        .select('*')
        .single();

      if (workflowRejectErr || !workflowAfter) {
        return problemResponse(SYS_002(workflowRejectErr?.message ?? 'Failed to update workflow', INSTANCE));
      }

      const rejectStatus = entityType === 'purchase_order' ? 'REJECTED' : 'REJECTED';
      const { data: entityAfter, error: entityRejectErr } = await db
        .from(table)
        .update({
          status: rejectStatus,
          approved_at: null,
          approved_by_user_id: null,
          approval_notes: notes,
        })
        .eq('tenant_id', tenantId)
        .eq('id', entityId)
        .select('*')
        .single();

      if (entityRejectErr || !entityAfter) {
        return problemResponse(SYS_002(entityRejectErr?.message ?? 'Failed to update entity state', INSTANCE));
      }

      await db.from('procurement_approval_actions').insert({
        tenant_id: tenantId,
        workflow_id: workflowExisting.id,
        step_id: pendingStep.id,
        action: 'REJECTED',
        actor_user_id: userId,
        notes,
      });

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

      return NextResponse.json({ success: true, workflow: workflowAfter, entity: entityAfter });
    }

    const nextPendingStep = steps.find((step) => step.status === 'PENDING' && step.id !== pendingStep.id);

    if (nextPendingStep) {
      const { data: workflowAfter, error: workflowAdvanceErr } = await db
        .from('procurement_approval_workflows')
        .update({ current_step: nextPendingStep.step_order })
        .eq('tenant_id', tenantId)
        .eq('id', workflowExisting.id)
        .select('*')
        .single();

      if (workflowAdvanceErr || !workflowAfter) {
        return problemResponse(SYS_002(workflowAdvanceErr?.message ?? 'Failed to advance workflow', INSTANCE));
      }

      await db.from('procurement_approval_actions').insert({
        tenant_id: tenantId,
        workflow_id: workflowExisting.id,
        step_id: pendingStep.id,
        action: 'APPROVED',
        actor_user_id: userId,
        notes,
      });

      return NextResponse.json({ success: true, workflow: workflowAfter, pendingRole: nextPendingStep.approver_role });
    }

    const { data: workflowApproved, error: workflowApproveErr } = await db
      .from('procurement_approval_workflows')
      .update({
        status: 'APPROVED',
        decided_at: nowIso,
        decision_notes: notes,
      })
      .eq('tenant_id', tenantId)
      .eq('id', workflowExisting.id)
      .select('*')
      .single();

    if (workflowApproveErr || !workflowApproved) {
      return problemResponse(SYS_002(workflowApproveErr?.message ?? 'Failed to finalize workflow', INSTANCE));
    }

    const { data: entityAfter, error: entityApproveErr } = await db
      .from(table)
      .update({
        status: 'APPROVED',
        approved_at: nowIso,
        approved_by_user_id: userId,
        approval_notes: notes,
      })
      .eq('tenant_id', tenantId)
      .eq('id', entityId)
      .select('*')
      .single();

    if (entityApproveErr || !entityAfter) {
      return problemResponse(SYS_002(entityApproveErr?.message ?? 'Failed to update entity state', INSTANCE));
    }

    await db.from('procurement_approval_actions').insert({
      tenant_id: tenantId,
      workflow_id: workflowExisting.id,
      step_id: pendingStep.id,
      action: 'APPROVED',
      actor_user_id: userId,
      notes,
    });

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

    return NextResponse.json({ success: true, workflow: workflowApproved, entity: entityAfter });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unexpected approval workflow error';
    return problemResponse(SYS_002(msg, INSTANCE));
  }
}
