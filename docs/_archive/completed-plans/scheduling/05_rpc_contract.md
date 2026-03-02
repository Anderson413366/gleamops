# RPC Contract (Supabase Functions)

## fn_current_staff_id()
Returns current tenant staff id for `auth.uid()`.

## fn_validate_schedule_period(p_period_id uuid)
Validates draft period and writes conflict rows.
Checks:
- overlap
- PTO conflict (`hr_pto_requests` approved)
- availability conflict
- coverage gaps
Returns summary counts.

## fn_publish_schedule_period(p_period_id uuid)
Guards:
- tenant match
- manager/admin role
- period status `DRAFT`
- zero blocking conflicts
Effects:
- set period `PUBLISHED`
- stamp publish metadata
- stamp related tickets

## fn_lock_schedule_period(p_period_id uuid)
Guards: manager/admin and status `PUBLISHED`.
Effects: set `LOCKED` and lock metadata.

## fn_request_shift_trade(...)
Create swap/release request from existing assignment.

## fn_accept_shift_trade(p_trade_id uuid)
Target staff accepts request.

## fn_approve_shift_trade(p_trade_id uuid)
Manager/admin approves.

## fn_apply_shift_trade(p_trade_id uuid)
Transactional assignment mutation and status `APPLIED`.
