import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDuration,
  formatPositionLabel,
} from '@/app/(dashboard)/schedule/plan/planning-card';
import {
  computeColumnStats,
} from '@/app/(dashboard)/schedule/plan/planning-board';
import {
  computeStaffHours,
  buildConflictKeys,
} from '@/app/(dashboard)/schedule/recurring/schedule-grid';
import type { PlanningTicket } from '@/app/(dashboard)/schedule/plan/planning-card';
import type { PlanningStatus } from '@gleamops/shared';
import type { RecurringScheduleRow } from '@/app/(dashboard)/schedule/recurring/schedule-list';

// ---------------------------------------------------------------------------
// computeDuration
// ---------------------------------------------------------------------------

test('computeDuration returns null when start or end is null', () => {
  assert.equal(computeDuration(null, '17:00'), null);
  assert.equal(computeDuration('09:00', null), null);
  assert.equal(computeDuration(null, null), null);
});

test('computeDuration computes normal day shift', () => {
  assert.equal(computeDuration('09:00', '17:00'), '8h');
  assert.equal(computeDuration('08:00', '12:30'), '4h 30m');
  assert.equal(computeDuration('14:00', '14:45'), '45m');
});

test('computeDuration handles HH:MM:SS format', () => {
  assert.equal(computeDuration('09:00:00', '17:00:00'), '8h');
});

test('computeDuration handles overnight shifts (end < start)', () => {
  assert.equal(computeDuration('22:00', '06:00'), '8h');
  assert.equal(computeDuration('23:00', '07:30'), '8h 30m');
});

test('computeDuration handles same start/end as 24h', () => {
  assert.equal(computeDuration('08:00', '08:00'), '24h');
});

// ---------------------------------------------------------------------------
// formatPositionLabel
// ---------------------------------------------------------------------------

test('formatPositionLabel converts underscore codes to title case', () => {
  assert.equal(formatPositionLabel('FLOOR_SPECIALIST'), 'Floor Specialist');
  assert.equal(formatPositionLabel('RESTROOM_SPECIALIST'), 'Restroom Specialist');
  assert.equal(formatPositionLabel('DAY_PORTER'), 'Day Porter');
});

test('formatPositionLabel handles single word', () => {
  assert.equal(formatPositionLabel('JANITOR'), 'Janitor');
});

// ---------------------------------------------------------------------------
// computeColumnStats
// ---------------------------------------------------------------------------

function makeTicket(overrides: Partial<PlanningTicket> = {}): PlanningTicket {
  return {
    id: overrides.id ?? 'tid-1',
    ticket_code: 'TKT-001',
    scheduled_date: '2026-03-01',
    start_time: '09:00',
    end_time: '17:00',
    status: 'SCHEDULED',
    planning_status: 'NOT_STARTED',
    required_staff_count: 1,
    position_code: null,
    site: null,
    assignments: [],
    notes: null,
    ...overrides,
  };
}

test('computeColumnStats computes correct percentage distribution', () => {
  const tickets = [
    makeTicket({ id: '1', planning_status: 'NOT_STARTED' }),
    makeTicket({ id: '2', planning_status: 'NOT_STARTED' }),
    makeTicket({ id: '3', planning_status: 'IN_PROGRESS' }),
    makeTicket({ id: '4', planning_status: 'READY' }),
  ];
  const grouped: Record<PlanningStatus, PlanningTicket[]> = {
    NOT_STARTED: tickets.filter((t) => t.planning_status === 'NOT_STARTED'),
    IN_PROGRESS: tickets.filter((t) => t.planning_status === 'IN_PROGRESS'),
    READY: tickets.filter((t) => t.planning_status === 'READY'),
  };

  const stats = computeColumnStats(tickets, grouped);

  assert.equal(stats.NOT_STARTED.pct, 50);
  assert.equal(stats.IN_PROGRESS.pct, 25);
  assert.equal(stats.READY.pct, 25);
});

test('computeColumnStats counts staff needed and gaps', () => {
  const tickets = [
    makeTicket({
      id: '1',
      planning_status: 'NOT_STARTED',
      required_staff_count: 3,
      assignments: [
        { id: 'a1', assignment_status: 'ASSIGNED', staff_id: 's1' },
      ],
    }),
    makeTicket({
      id: '2',
      planning_status: 'NOT_STARTED',
      required_staff_count: 2,
      assignments: [
        { id: 'a2', assignment_status: 'ASSIGNED', staff_id: 's2' },
        { id: 'a3', assignment_status: 'ASSIGNED', staff_id: 's3' },
      ],
    }),
  ];
  const grouped: Record<PlanningStatus, PlanningTicket[]> = {
    NOT_STARTED: tickets,
    IN_PROGRESS: [],
    READY: [],
  };

  const stats = computeColumnStats(tickets, grouped);

  assert.equal(stats.NOT_STARTED.staffNeeded, 5); // 3 + 2
  assert.equal(stats.NOT_STARTED.gaps, 1); // first ticket has 1 of 3 assigned
});

test('computeColumnStats handles empty ticket list', () => {
  const grouped: Record<PlanningStatus, PlanningTicket[]> = {
    NOT_STARTED: [],
    IN_PROGRESS: [],
    READY: [],
  };

  const stats = computeColumnStats([], grouped);

  assert.equal(stats.NOT_STARTED.pct, 0);
  assert.equal(stats.NOT_STARTED.staffNeeded, 0);
  assert.equal(stats.NOT_STARTED.gaps, 0);
});

test('computeColumnStats excludes non-ASSIGNED staff from gap check', () => {
  const tickets = [
    makeTicket({
      id: '1',
      planning_status: 'IN_PROGRESS',
      required_staff_count: 2,
      assignments: [
        { id: 'a1', assignment_status: 'ASSIGNED', staff_id: 's1' },
        { id: 'a2', assignment_status: 'CANCELLED', staff_id: 's2' },
      ],
    }),
  ];
  const grouped: Record<PlanningStatus, PlanningTicket[]> = {
    NOT_STARTED: [],
    IN_PROGRESS: tickets,
    READY: [],
  };

  const stats = computeColumnStats(tickets, grouped);

  assert.equal(stats.IN_PROGRESS.gaps, 1); // CANCELLED doesn't count
});

// ---------------------------------------------------------------------------
// computeStaffHours
// ---------------------------------------------------------------------------

function makeScheduleRow(overrides: Partial<RecurringScheduleRow> = {}): RecurringScheduleRow {
  return {
    id: overrides.id ?? 'row-1',
    staffName: 'John Doe',
    positionType: 'FLOOR_SPECIALIST',
    siteName: 'Office A',
    startTime: '09:00',
    endTime: '17:00',
    scheduledDates: ['2026-03-02', '2026-03-03', '2026-03-04'],
    scheduleDays: ['MON', 'TUE', 'WED'],
    status: 'assigned',
    ...overrides,
  };
}

test('computeStaffHours sums hours for visible dates only', () => {
  const rows = [makeScheduleRow({ startTime: '09:00', endTime: '17:00', scheduledDates: ['2026-03-02', '2026-03-03', '2026-03-04'] })];
  const hours = computeStaffHours(rows, ['2026-03-02', '2026-03-03']);
  assert.equal(hours, 16); // 8h * 2 days
});

test('computeStaffHours handles overnight shifts', () => {
  const rows = [makeScheduleRow({ startTime: '22:00', endTime: '06:00', scheduledDates: ['2026-03-02'] })];
  const hours = computeStaffHours(rows, ['2026-03-02']);
  assert.equal(hours, 8);
});

test('computeStaffHours sums multiple assignments', () => {
  const rows = [
    makeScheduleRow({ id: 'r1', startTime: '09:00', endTime: '13:00', scheduledDates: ['2026-03-02'] }),
    makeScheduleRow({ id: 'r2', startTime: '14:00', endTime: '18:00', scheduledDates: ['2026-03-02'] }),
  ];
  const hours = computeStaffHours(rows, ['2026-03-02']);
  assert.equal(hours, 8); // 4h + 4h
});

test('computeStaffHours returns 0 for no matching dates', () => {
  const rows = [makeScheduleRow({ scheduledDates: ['2026-03-05'] })];
  const hours = computeStaffHours(rows, ['2026-03-02']);
  assert.equal(hours, 0);
});

// ---------------------------------------------------------------------------
// buildConflictKeys
// ---------------------------------------------------------------------------

test('buildConflictKeys detects overlapping shifts for same staff', () => {
  const rows = [
    makeScheduleRow({ id: 'r1', staffName: 'Alice', startTime: '09:00', endTime: '15:00', scheduledDates: ['2026-03-02'] }),
    makeScheduleRow({ id: 'r2', staffName: 'Alice', startTime: '14:00', endTime: '18:00', scheduledDates: ['2026-03-02'] }),
  ];
  const conflicts = buildConflictKeys(rows);
  assert.ok(conflicts.has('r1:2026-03-02'));
  assert.ok(conflicts.has('r2:2026-03-02'));
});

test('buildConflictKeys does not flag non-overlapping shifts', () => {
  const rows = [
    makeScheduleRow({ id: 'r1', staffName: 'Alice', startTime: '09:00', endTime: '13:00', scheduledDates: ['2026-03-02'] }),
    makeScheduleRow({ id: 'r2', staffName: 'Alice', startTime: '13:00', endTime: '17:00', scheduledDates: ['2026-03-02'] }),
  ];
  const conflicts = buildConflictKeys(rows);
  assert.equal(conflicts.size, 0);
});

test('buildConflictKeys does not flag different staff with overlapping times', () => {
  const rows = [
    makeScheduleRow({ id: 'r1', staffName: 'Alice', startTime: '09:00', endTime: '17:00', scheduledDates: ['2026-03-02'] }),
    makeScheduleRow({ id: 'r2', staffName: 'Bob', startTime: '09:00', endTime: '17:00', scheduledDates: ['2026-03-02'] }),
  ];
  const conflicts = buildConflictKeys(rows);
  assert.equal(conflicts.size, 0);
});

test('buildConflictKeys only flags shared dates', () => {
  const rows = [
    makeScheduleRow({ id: 'r1', staffName: 'Alice', startTime: '09:00', endTime: '15:00', scheduledDates: ['2026-03-02', '2026-03-03'] }),
    makeScheduleRow({ id: 'r2', staffName: 'Alice', startTime: '14:00', endTime: '18:00', scheduledDates: ['2026-03-03'] }),
  ];
  const conflicts = buildConflictKeys(rows);
  assert.ok(conflicts.has('r1:2026-03-03'));
  assert.ok(conflicts.has('r2:2026-03-03'));
  assert.ok(!conflicts.has('r1:2026-03-02'));
});
