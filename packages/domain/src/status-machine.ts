/**
 * Status transition validation (pure function).
 * Mirrors the status_transitions table logic for client-side pre-validation.
 */

type TransitionMap = Record<string, string[]>;

const BID_TRANSITIONS: TransitionMap = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['READY_FOR_REVIEW', 'DRAFT'],
  READY_FOR_REVIEW: ['APPROVED', 'IN_PROGRESS'],
  APPROVED: ['SENT'],
  SENT: ['WON', 'LOST'],
  // WON and LOST are terminal
};

const PROPOSAL_TRANSITIONS: TransitionMap = {
  DRAFT: ['GENERATED'],
  GENERATED: ['SENT'],
  SENT: ['DELIVERED', 'OPENED', 'WON', 'LOST', 'EXPIRED'],
  DELIVERED: ['OPENED', 'WON', 'LOST', 'EXPIRED'],
  OPENED: ['WON', 'LOST', 'EXPIRED'],
  // WON, LOST, EXPIRED are terminal
};

const TICKET_TRANSITIONS: TransitionMap = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['VERIFIED'],
  // VERIFIED and CANCELLED are terminal
};

const ENTITY_TRANSITIONS: Record<string, TransitionMap> = {
  bid: BID_TRANSITIONS,
  proposal: PROPOSAL_TRANSITIONS,
  ticket: TICKET_TRANSITIONS,
};

export function canTransitionStatus(
  entityType: string,
  fromStatus: string,
  toStatus: string
): boolean {
  const transitions = ENTITY_TRANSITIONS[entityType];
  if (!transitions) return false;
  const allowed = transitions[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}
