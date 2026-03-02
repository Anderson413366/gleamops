# Shifts & Time Phase 0 Baseline

This checklist is the pre-implementation gate for all Shifts & Time rollout work.

## Feature Flags
- `NEXT_PUBLIC_FF_SHIFTS_TIME_V1`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_CALLOUT_AUTOMATION`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1`

All default to `disabled`.

## Regression Safety Gates

## Gate 1: Auth Route Safety
Ensure the following remain protected by auth middleware:
- `/api/operations/schedule/periods`
- `/api/operations/schedule/trades`
- `/api/timekeeping/pin-checkin`

## Gate 2: Schedule Role Guards
Ensure role checks still enforce:
- `canManageSchedule`: owner_admin/manager/supervisor/admin/operations = true
- `canPublishSchedule`: owner_admin/manager/admin/operations = true
- supervisor = false for publish

## Gate 3: Legacy Surface Health
These pages must render without regression while new flags are OFF:
- `/schedule`
- `/operations`
- `/workforce`

## Observability Baseline (Capture Before Enabling New Flags)
Run and store a baseline snapshot for:
- blocking conflict count (`schedule_conflicts.is_blocking = true`)
- unapproved timesheets count (`timesheets.status in DRAFT,SUBMITTED`)
- late/time exceptions unresolved (`time_exceptions.resolved_at is null`)

Example SQL:

```sql
select count(*) as blocking_conflicts
from schedule_conflicts
where archived_at is null
  and is_blocking = true;

select count(*) as timesheets_pending
from timesheets
where archived_at is null
  and status in ('DRAFT','SUBMITTED');

select count(*) as unresolved_time_exceptions
from time_exceptions
where archived_at is null
  and resolved_at is null;
```

## Enablement Order
1. Enable `NEXT_PUBLIC_FF_SHIFTS_TIME_V1` in preview only.
2. Run full smoke + regression suite.
3. Enable route execution flag for pilot users only.
4. Enable callout automation after pilot stability window.
5. Enable payroll export flag last.
