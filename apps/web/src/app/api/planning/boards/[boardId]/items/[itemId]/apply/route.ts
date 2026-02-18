import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/planning/boards/[boardId]/items/[itemId]/apply';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const applySchema = z.object({
  proposal_id: z.string().uuid(),
  acknowledged_warning_ids: z.array(z.string().uuid()).default([]),
  override_locked_period: z.boolean().default(false),
  override_reason: z.string().nullable().default(null),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canApplyPlanning(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'ADMIN', 'OPERATIONS']);
}

function canOverrideLocked(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'ADMIN']);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; itemId: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canApplyPlanning(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const payload = parsed.data;
  const { boardId, itemId } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: boardItem, error: itemError } = await db
    .from('planning_board_items')
    .select('id, board_id, ticket_id, sync_state')
    .eq('id', itemId)
    .eq('board_id', boardId)
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .single();

  if (itemError || !boardItem) {
    return problemResponse(SYS_002(itemError?.message ?? 'Planning board item not found', API_PATH));
  }

  const { data: proposal, error: proposalError } = await db
    .from('planning_item_proposals')
    .select('id, board_item_id, proposed_staff_id, proposed_subcontractor_id, apply_state')
    .eq('id', payload.proposal_id)
    .eq('board_item_id', itemId)
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .single();

  if (proposalError || !proposal) {
    return problemResponse(SYS_002(proposalError?.message ?? 'Proposal not found', API_PATH));
  }

  const { data: unresolvedConflicts, error: conflictError } = await db
    .from('planning_board_conflicts')
    .select('id, conflict_type, severity, description, affected_staff_id, affected_ticket_id')
    .eq('tenant_id', auth.tenantId)
    .eq('board_id', boardId)
    .eq('card_id', itemId)
    .is('resolved_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (conflictError) return problemResponse(SYS_002(conflictError.message, API_PATH));

  const conflicts = unresolvedConflicts ?? [];
  const blockingConflicts = conflicts.filter((row) => row.severity === 'blocking');

  if (blockingConflicts.length > 0) {
    return NextResponse.json({
      code: 'PLANNING_APPLY_BLOCKED',
      blocking_conflicts: blockingConflicts.map((row) => ({
        conflict_type: row.conflict_type,
        description: row.description,
        staff_id: row.affected_staff_id,
        ticket_id: row.affected_ticket_id,
      })),
    }, { status: 409 });
  }

  const warningIds = conflicts.filter((row) => row.severity === 'warning').map((row) => row.id);
  const unacknowledgedWarnings = warningIds.filter((id) => !payload.acknowledged_warning_ids.includes(id));

  if (unacknowledgedWarnings.length > 0) {
    return NextResponse.json({
      code: 'PLANNING_ACK_REQUIRED',
      warning_conflict_ids: unacknowledgedWarnings,
    }, { status: 409 });
  }

  const ticketId = boardItem.ticket_id as string | null;
  if (!ticketId) {
    return problemResponse(createProblemDetails('PLN_001', 'Invalid planning item', 400, 'Planning item is not linked to a ticket', API_PATH));
  }

  const { data: isLocked, error: lockedError } = await db.rpc('fn_is_ticket_locked', { p_ticket_id: ticketId });
  if (lockedError) return problemResponse(SYS_002(lockedError.message, API_PATH));

  if (isLocked && !payload.override_locked_period) {
    return NextResponse.json({
      code: 'PLANNING_APPLY_BLOCKED',
      blocking_conflicts: [{
        conflict_type: 'locked_period',
        description: 'This ticket belongs to a locked schedule period',
        staff_id: null,
        ticket_id: ticketId,
      }],
    }, { status: 409 });
  }

  if (isLocked && payload.override_locked_period) {
    if (!canOverrideLocked(auth.roles)) {
      return problemResponse(AUTH_002(API_PATH));
    }
    if (!payload.override_reason || payload.override_reason.trim().length === 0) {
      return problemResponse(createProblemDetails('PLN_002', 'Override reason required', 400, 'Override reason is required for locked period applies', API_PATH));
    }
  }

  const { data: existingAssignment, error: existingAssignmentError } = await db
    .from('ticket_assignments')
    .select('id, ticket_id, staff_id, subcontractor_id')
    .eq('tenant_id', auth.tenantId)
    .eq('ticket_id', ticketId)
    .eq('assignment_status', 'ASSIGNED')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingAssignmentError) return problemResponse(SYS_002(existingAssignmentError.message, API_PATH));

  const assignmentPayload = {
    tenant_id: auth.tenantId,
    ticket_id: ticketId,
    staff_id: proposal.proposed_staff_id,
    subcontractor_id: proposal.proposed_subcontractor_id,
    role: 'CLEANER',
    assignment_status: 'ASSIGNED',
    assignment_type: 'DIRECT',
  };

  if ((existingAssignment?.length ?? 0) > 0) {
    const { error } = await db
      .from('ticket_assignments')
      .update(assignmentPayload)
      .eq('id', existingAssignment![0].id)
      .eq('tenant_id', auth.tenantId);
    if (error) return problemResponse(SYS_002(error.message, API_PATH));
  } else {
    const { error } = await db
      .from('ticket_assignments')
      .insert(assignmentPayload);
    if (error) return problemResponse(SYS_002(error.message, API_PATH));
  }

  const { error: itemUpdateError } = await db
    .from('planning_board_items')
    .update({
      sync_state: 'applied',
      current_assignee_staff_id: proposal.proposed_staff_id,
      current_assignee_subcontractor_id: proposal.proposed_subcontractor_id,
    })
    .eq('id', itemId)
    .eq('tenant_id', auth.tenantId);

  if (itemUpdateError) return problemResponse(SYS_002(itemUpdateError.message, API_PATH));

  const { error: proposalUpdateError } = await db
    .from('planning_item_proposals')
    .update({
      apply_state: 'applied',
      applied_at: new Date().toISOString(),
      created_by: auth.userId,
    })
    .eq('id', payload.proposal_id)
    .eq('tenant_id', auth.tenantId);

  if (proposalUpdateError) return problemResponse(SYS_002(proposalUpdateError.message, API_PATH));

  let assignedStaffName: string | null = null;
  let notificationsSent = false;
  if (proposal.proposed_staff_id) {
    const { data: assignedStaff } = await db
      .from('staff')
      .select('id, user_id, full_name')
      .eq('tenant_id', auth.tenantId)
      .eq('id', proposal.proposed_staff_id)
      .is('archived_at', null)
      .maybeSingle();

    assignedStaffName = assignedStaff?.full_name ?? null;

    if (assignedStaff?.user_id) {
      const { error: notifyError } = await db
        .from('notifications')
        .insert({
          tenant_id: auth.tenantId,
          user_id: assignedStaff.user_id,
          title: "Tonight's assignment updated",
          body: 'Your assignment was updated from evening planning. Check your schedule for details.',
          link: `/work?ticket=${ticketId}`,
        });
      notificationsSent = !notifyError;
    }
  }

  const previousStaffId = existingAssignment?.[0]?.staff_id as string | null | undefined;
  if (previousStaffId && previousStaffId !== proposal.proposed_staff_id) {
    const { data: previousStaff } = await db
      .from('staff')
      .select('id, user_id')
      .eq('tenant_id', auth.tenantId)
      .eq('id', previousStaffId)
      .is('archived_at', null)
      .maybeSingle();

    if (previousStaff?.user_id) {
      const { error: notifyError } = await db
        .from('notifications')
        .insert({
          tenant_id: auth.tenantId,
          user_id: previousStaff.user_id,
          title: "Tonight's assignment updated",
          body: 'A supervisor reassigned this ticket during evening planning.',
          link: `/work?ticket=${ticketId}`,
        });
      if (!notifyError) notificationsSent = true;
    }
  }

  if (conflicts.length > 0) {
    const { error: conflictResolveError } = await db
      .from('planning_board_conflicts')
      .update({
        resolution: payload.acknowledged_warning_ids.length > 0 ? 'applied_anyway' : 'applied',
        resolved_by: auth.userId,
        resolved_at: new Date().toISOString(),
      })
      .in('id', conflicts.map((row) => row.id))
      .eq('tenant_id', auth.tenantId);

    if (conflictResolveError) return problemResponse(SYS_002(conflictResolveError.message, API_PATH));
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'planning_board_items',
    entityId: itemId,
    action: 'APPLY',
    before: { sync_state: boardItem.sync_state },
    after: {
      sync_state: 'applied',
      ticket_id: ticketId,
      staff_id: proposal.proposed_staff_id,
      subcontractor_id: proposal.proposed_subcontractor_id,
      override_locked_period: payload.override_locked_period,
      override_reason: payload.override_reason,
    },
    context: extractAuditContext(request, 'planning_apply'),
  });

  return NextResponse.json({
    board_item_id: itemId,
    sync_state: 'applied',
    ticket_id: ticketId,
    new_assignment: {
      staff_id: proposal.proposed_staff_id,
      subcontractor_id: proposal.proposed_subcontractor_id,
      staff_name: assignedStaffName,
    },
    conflicts_logged: conflicts,
    notifications: {
      in_app: notificationsSent,
      push: notificationsSent,
    },
  });
}
