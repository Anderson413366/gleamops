export type AssignableType = 'staff' | 'subcontractor';

export interface Assignable {
  tenant_id: string;
  assignable_type: AssignableType;
  assignable_id: string;
  display_name: string;
  reference_code: string | null;
}

export interface TicketAssignmentPayload {
  ticket_id: string;
  staff_id?: string | null;
  subcontractor_id?: string | null;
  role?: string | null;
  assignment_status?: 'ASSIGNED' | 'RELEASED' | 'CANCELED';
  assignment_type?: 'DIRECT' | 'SWAP' | 'RELEASE' | 'OPEN_PICKUP';
}

export function isValidAssigneePair(staffId: string | null | undefined, subcontractorId: string | null | undefined): boolean {
  return Boolean(staffId) !== Boolean(subcontractorId);
}
