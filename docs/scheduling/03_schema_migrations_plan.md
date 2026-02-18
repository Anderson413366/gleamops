# Schema Migration Plan (Approved Sequence)

## 00075_schedule_periods.sql
Create `schedule_periods` with lifecycle status and publish/lock metadata.

## 00076_staff_availability_rules.sql
Create `staff_availability_rules` supporting:
- recurring weekday windows
- one-off date/time windows
- available/unavailable/preferred mode

## 00077_shift_trade_requests.sql
Create trade/release workflow table with manager approval states.

## 00078_schedule_conflicts.sql
Create conflict storage table keyed to period and ticket/staff context.

## 00079_schedule_core_alterations.sql
Alter `work_tickets` and `ticket_assignments` with schedule governance fields.

## 00080_schedule_rls.sql
Enable RLS and add tenant + role + self-service policy matrix.

## 00081_schedule_functions.sql
Add RPC functions:
- validate period
- publish period
- lock period
- trade request/accept/approve/apply

## 00082_schedule_notifications.sql
Attach triggers/functions to notify impacted users on publish, PTO approvals affecting schedule, and trade transitions.

## 00083_schedule_lock_enforcement.sql
Add hard guards/triggers so locked schedule tickets and their assignments cannot be mutated.

## 00084_schedule_trade_cancel_permissions.sql
Expand `fn_cancel_shift_trade` so manager roles can cancel requests in workflow states prior to apply.
