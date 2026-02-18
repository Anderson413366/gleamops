# Scheduling Current State Analysis (Post-Phase 3)

## Scope audited
- Operations module: calendar, tickets, jobs, routes/fleet, geofences, alerts, messages
- Workforce module: staff/timekeeping/timesheets/exceptions/payroll/hr-lite
- Shared types and Supabase migrations through `00074`

## Confirmed architecture
- Scheduling nucleus is ticket-centric: `work_tickets` + `ticket_assignments`
- Time lifecycle is established: `time_events` -> `time_entries` -> `time_exceptions` -> `timesheets`
- Tenant/RLS baseline exists and uses `current_tenant_id()` and `has_any_role(...)`
- UI already treats operations as the scheduling home, not a separate app shell

## New baseline changes already merged
- `routes` and `route_stops` UI and workflows are live in Operations
- Fleet execution workflows (DVIR/fuel/checkout) are live
- HR Lite is live in Workforce and includes PTO requests (`hr_pto_requests`)

## Constraints for implementation
- Do not create a parallel shift universe
- Extend `work_tickets` and `ticket_assignments` for publish/lock/swap semantics
- Reuse `hr_pto_requests` for leave conflicting rather than creating duplicate leave table
- Preserve StandardColumns and no-hard-delete patterns
