export type PlanningSyncState = 'synced' | 'draft_change' | 'applied' | 'conflict' | 'dismissed';

const NEXT_STATES: Record<PlanningSyncState, PlanningSyncState[]> = {
  synced: ['draft_change', 'conflict'],
  draft_change: ['applied', 'conflict', 'synced', 'dismissed'],
  applied: ['synced', 'conflict'],
  conflict: ['draft_change', 'dismissed', 'synced'],
  dismissed: ['draft_change', 'synced'],
};

export function canTransitionPlanningSyncState(from: PlanningSyncState, to: PlanningSyncState): boolean {
  return NEXT_STATES[from].includes(to);
}
