/**
 * Extended schedule type definitions (v3.1 additions).
 * Base interfaces (SchedulePeriod, ShiftTradeRequest, ScheduleConflict) live in database.ts.
 * This file adds type unions and enums used by the policy-driven conflict engine.
 */

export type SchedulePeriodStatus = 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'ARCHIVED';

export type ShiftTradeStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'APPLIED' | 'CANCELED';

export type ScheduleConflictType =
  | 'OVERLAP'
  | 'PTO_CONFLICT'
  | 'AVAILABILITY_CONFLICT'
  | 'COVERAGE_GAP'
  | 'ROLE_MISMATCH'
  | 'REST_WINDOW_VIOLATION'
  | 'MAX_WEEKLY_HOURS_VIOLATION'
  | 'OVERTIME_THRESHOLD_WARNING'
  | 'SHIFT_OVERLAP_WARNING'
  | 'SUBCONTRACTOR_CAPACITY_VIOLATION';

export type ScheduleConflictSeverity = 'ERROR' | 'WARNING';

export type ShiftTradeRequestType = 'SWAP' | 'RELEASE' | 'OPEN_PICKUP';

/** Channel key for realtime schedule subscriptions */
export function scheduleChannelKey(tenantId: string, periodId: string): string {
  return `schedule-period:${tenantId}:${periodId}`;
}
