# Supabase Gap Matrix: Existing vs Missing

## Existing and reusable
- `work_tickets`: date/time/status execution object
- `ticket_assignments`: crew assignment join
- `recurrence_rules`: schedule generation basis
- `time_events`, `time_entries`, `time_exceptions`, `alerts`, `timesheets`
- `hr_pto_requests`: PTO request/approval lifecycle starter
- `message_threads`, `message_thread_members`, `messages`
- `geofences`, `site_pin_codes`

## Missing for Humanity-grade scheduling
- `schedule_periods` for DRAFT/PUBLISHED/LOCKED lifecycle
- `staff_availability_rules` for recurring and one-off constraints
- `shift_trade_requests` for release/swap approvals
- `schedule_conflicts` for explicit publish gate diagnostics
- `work_tickets` fields: `required_staff_count`, `position_code`, `schedule_period_id`, `published_at/by`, `locked_at/by`
- `ticket_assignments` fields: `assignment_status`, `assignment_type`, `overtime_flag`, `released_at/by`

## RLS gaps
- Transition-sensitive operations need RPC enforcement
- Staff self-service needs explicit own-record checks for availability/trades/PTO links

## Workflow gaps
- No publish gate with conflict validation
- No schedule lock behavior
- No shift swap atomic apply flow
