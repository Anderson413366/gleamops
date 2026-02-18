export type PlanningConflictSeverity = 'blocking' | 'warning';

export interface PlanningConflictRule {
  type: string;
  severity: PlanningConflictSeverity;
  blocks_apply: boolean;
}

export const PLANNING_CONFLICT_RULES: PlanningConflictRule[] = [
  { type: 'double_booking', severity: 'blocking', blocks_apply: true },
  { type: 'in_progress_change', severity: 'blocking', blocks_apply: true },
  { type: 'locked_period', severity: 'blocking', blocks_apply: true },
  { type: 'missing_required_skill', severity: 'blocking', blocks_apply: true },
  { type: 'availability_violation', severity: 'warning', blocks_apply: false },
  { type: 'external_drift', severity: 'warning', blocks_apply: false },
  { type: 'rest_window_violation', severity: 'warning', blocks_apply: false },
  { type: 'max_weekly_hours_violation', severity: 'warning', blocks_apply: false },
];
