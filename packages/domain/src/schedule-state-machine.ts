export type SchedulePeriodState = 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'ARCHIVED';

const ALLOWED_TRANSITIONS: Record<SchedulePeriodState, SchedulePeriodState[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['LOCKED', 'ARCHIVED'],
  LOCKED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionSchedulePeriod(from: SchedulePeriodState, to: SchedulePeriodState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
