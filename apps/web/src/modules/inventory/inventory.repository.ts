/**
 * Inventory data access layer.
 * All Supabase queries for the inventory approval domain.
 * Extracted from api/inventory/approvals/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';
import { writeAuditMutation } from '@/lib/api/audit';

export type EntityType = 'purchase_order' | 'supply_request';
export type EntityTable = 'purchase_orders' | 'supply_requests';
export type WorkflowEntityType = 'PURCHASE_ORDER' | 'SUPPLY_REQUEST';

export function toWorkflowEntityType(entityType: EntityType): WorkflowEntityType {
  return entityType === 'purchase_order' ? 'PURCHASE_ORDER' : 'SUPPLY_REQUEST';
}

export function toEntityTable(entityType: EntityType): EntityTable {
  return entityType === 'purchase_order' ? 'purchase_orders' : 'supply_requests';
}

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findEntity(
  db: SupabaseClient,
  table: EntityTable,
  tenantId: string,
  entityId: string,
) {
  return db
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', entityId)
    .single();
}

export async function findWorkflow(
  db: SupabaseClient,
  tenantId: string,
  workflowEntityType: WorkflowEntityType,
  entityId: string,
) {
  return db
    .from('procurement_approval_workflows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', workflowEntityType)
    .eq('entity_id', entityId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function upsertWorkflow(
  db: SupabaseClient,
  tenantId: string,
  workflowEntityType: WorkflowEntityType,
  entityId: string,
  userId: string,
  totalSteps: number,
  notes: string | undefined,
  nowIso: string,
) {
  return db
    .from('procurement_approval_workflows')
    .upsert({
      tenant_id: tenantId,
      entity_type: workflowEntityType,
      entity_id: entityId,
      status: 'PENDING',
      current_step: 1,
      total_steps: totalSteps,
      created_by_user_id: userId,
      submitted_at: nowIso,
      decided_at: null,
      decision_notes: notes,
    }, { onConflict: 'tenant_id,entity_type,entity_id' })
    .select('*')
    .single();
}

export async function deleteSteps(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
) {
  return db
    .from('procurement_approval_steps')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('workflow_id', workflowId);
}

export async function insertSteps(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
  roles: string[],
) {
  return db
    .from('procurement_approval_steps')
    .insert(
      roles.map((role, index) => ({
        tenant_id: tenantId,
        workflow_id: workflowId,
        step_order: index + 1,
        approver_role: role,
        status: 'PENDING',
      })),
    );
}

export async function updateEntity(
  db: SupabaseClient,
  table: EntityTable,
  tenantId: string,
  entityId: string,
  patch: Record<string, unknown>,
) {
  return db
    .from(table)
    .update(patch)
    .eq('tenant_id', tenantId)
    .eq('id', entityId)
    .select('*')
    .single();
}

export async function insertAction(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
  action: string,
  userId: string,
  notes: string | undefined,
  stepId?: string,
) {
  return db.from('procurement_approval_actions').insert({
    tenant_id: tenantId,
    workflow_id: workflowId,
    step_id: stepId,
    action,
    actor_user_id: userId,
    notes,
  });
}

export async function findSteps(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
) {
  return db
    .from('procurement_approval_steps')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('workflow_id', workflowId)
    .is('archived_at', null)
    .order('step_order', { ascending: true });
}

export async function updateStep(
  db: SupabaseClient,
  tenantId: string,
  stepId: string,
  patch: Record<string, unknown>,
) {
  return db
    .from('procurement_approval_steps')
    .update(patch)
    .eq('tenant_id', tenantId)
    .eq('id', stepId);
}

export async function skipPendingSteps(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
) {
  return db
    .from('procurement_approval_steps')
    .update({ status: 'SKIPPED' })
    .eq('tenant_id', tenantId)
    .eq('workflow_id', workflowId)
    .eq('status', 'PENDING');
}

export async function updateWorkflow(
  db: SupabaseClient,
  tenantId: string,
  workflowId: string,
  patch: Record<string, unknown>,
) {
  return db
    .from('procurement_approval_workflows')
    .update(patch)
    .eq('tenant_id', tenantId)
    .eq('id', workflowId)
    .select('*')
    .single();
}

export { writeAuditMutation };
