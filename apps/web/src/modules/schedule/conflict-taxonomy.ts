export const SCHEDULE_CONFLICT_TAXONOMY = [
  'OVERLAP',
  'PTO_CONFLICT',
  'AVAILABILITY_CONFLICT',
  'COVERAGE_GAP',
  'ROLE_MISMATCH',
  'REST_WINDOW_WARNING',
  'MAX_WEEKLY_HOURS_WARNING',
  'rest_window_violation',
  'max_weekly_hours_violation',
  'overtime_threshold_warning',
  'shift_overlap_warning',
  'subcontractor_capacity_violation',
] as const;

export type ScheduleConflictType = (typeof SCHEDULE_CONFLICT_TAXONOMY)[number];
