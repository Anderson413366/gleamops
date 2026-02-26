# Award-Grade Integration Plan: Shifts & Time (Additive, No Regressions)

## Brief Summary
Integrate a route-first, call-out-aware Scheduling + Timekeeping module by extending existing entities (`work_tickets`, `ticket_assignments`, `schedule_periods`, `time_entries`, `timesheets`) and existing RPC lifecycle (`validate/publish/lock/trade`).  
No removals, no hard deletes, no breaking route changes.  
Canonical tenancy stays `tenant_id`.  
All new UX is gated behind feature flags and released in staged waves.

## Immutable Guardrails
1. Preserve all current behavior and endpoints.
2. Use `tenant_id` in all new DB objects and RLS checks.
3. Additive migrations only.
4. No hard deletes; archive-only pattern.
5. No new plaintext secret storage in new tables.
6. All new UI strings are i18n keys with `en`, `es`, `pt-BR`.
7. Cleaner flows: one primary action per screen and 390px-first layout.

## Existing Foundations We Will Reuse
1. Schedule lifecycle primitives already exist:
- `schedule_periods`, `staff_availability_rules`, `shift_trade_requests`, `schedule_conflicts`.
- RPCs: `fn_validate_schedule_period`, `fn_publish_schedule_period`, `fn_lock_schedule_period`, trade RPCs.
2. Route primitives already exist:
- `routes`, `route_stops` (from enterprise parity migration).
3. Time primitives already exist:
- `time_events`, `time_entries`, `time_exceptions`, `timesheets`, `timesheet_approvals`, `time_punches`, `time_policies`.
4. Access/RLS primitives:
- `current_tenant_id()`, `has_any_role()`, JWT claim hook injecting `tenant_id` and role.

## Detailed Build Plan

## Phase 0: Safety and Compatibility Harness
1. Add feature flags:
- `NEXT_PUBLIC_FF_SHIFTS_TIME_V1`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_CALLOUT_AUTOMATION`
- `NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1`
2. Add regression contracts before any schema mutation:
- Snapshot critical APIs for schedule/timekeeping currently in production.
- Add route-level smoke tests for `/schedule`, `/operations`, `/workforce`, `/api/operations/schedule/*`, `/api/timekeeping/pin-checkin`.
3. Add observability baselines:
- Existing KPI capture for publish success rate, schedule conflicts count, timesheet approval backlog, API latency p95.

## Phase 1: Schema Extensions (Additive)
1. Migration `00089_shifts_time_core.sql`
- Add `route_owner_staff_id`, `period_id`, `published_at`, `locked_at` to `routes` if missing.
- Add `work_ticket_id`, `site_id`, `planned_start_at`, `planned_end_at`, `actual_start_at`, `actual_end_at`, `status` to `route_stops` if missing.
- Add indexes:
- `routes(tenant_id, route_date, route_owner_staff_id)`
- `route_stops(tenant_id, route_id, stop_order)`
2. Migration `00090_shifts_time_paid_travel.sql`
- New `travel_segments`:
- `tenant_id`, `route_id`, `from_stop_id`, `to_stop_id`
- `estimated_minutes`, `actual_minutes`
- `travel_start_at`, `travel_end_at`
- `payable_minutes`, `source` (`AUTO|MANUAL_ADJUST`)
- uniqueness on `(tenant_id, route_id, from_stop_id, to_stop_id)`
3. Migration `00091_shifts_time_callout_coverage.sql`
- `callout_events`: reporter, affected route/stop, reason, status, timestamps, escalation stage.
- `coverage_offers`: candidate staff, offer status, expiry, responded_at, decision metadata.
- `on_call_pool`: date window, eligible staff, stipend rules, assignment outcome.
4. Migration `00092_shifts_time_site_book.sql`
- `site_books`: multilingual safe instructions, flags for sensitive site, checklist template ref, vault reference pointer.
- `site_book_checklist_items`: ordered, translatable checklist rows.
5. Migration `00093_shifts_time_payroll_export.sql`
- `payroll_export_runs`, `payroll_export_items`, `payroll_export_mappings`, `payroll_export_audit`.
- Include fields for regular/overtime/PTO/sick/vacation/holiday/on-call/travel.
6. Migration `00094_shifts_time_policies.sql`
- `attendance_policies`: call-out threshold ladder, no-show definition, grace windows.
- `holiday_calendar`: observed holidays and multiplier.
7. Migration `00095_shifts_time_rls.sql`
- Enable RLS + tenant policies + role/write boundaries on all new tables.
- Archive-only constraints and updated_at triggers.
8. Migration `00096_shifts_time_functions.sql`
- RPCs:
- `fn_route_start_stop`, `fn_route_complete_stop`
- `fn_auto_capture_travel_segment`
- `fn_report_callout`, `fn_offer_coverage`, `fn_accept_coverage`
- `fn_generate_payroll_export_preview`, `fn_finalize_payroll_export`
- All role checks internal to RPC + grant execute to `authenticated`.

## Phase 2: Domain Services and API Contracts
1. Extend `apps/web/src/modules/schedule/*`
- Add route projection service that maps tickets + assignments into cleaner route timelines.
- Add call-out orchestrator service:
- candidate ranking: eligibility, availability, hours, site authorization, distance proxy.
- escalation timers at 30 min and 60 min.
2. Extend `apps/web/src/modules/timekeeping/*`
- Per-stop clock lifecycle:
- clock-in opens active stop
- clock-out closes stop and auto-opens travel window until next clock-in
- travel overrun threshold creates `time_exception`.
3. Add API endpoints (new, additive):
- `/api/operations/schedule/routes`
- `/api/operations/schedule/routes/[id]/stops/[id]/clock-in`
- `/api/operations/schedule/routes/[id]/stops/[id]/clock-out`
- `/api/operations/schedule/callouts`
- `/api/operations/schedule/coverage/offers/[id]/respond`
- `/api/payroll/exports/preview`
- `/api/payroll/exports/finalize`
4. Keep legacy schedule APIs unchanged:
- availability, periods, conflicts, trades remain source-compatible.

## Phase 3: Web UX Integration
1. Keep current schedule/workforce pages intact; add tabs only when flag enabled.
2. New tabs:
- `Tonight Board`
- `Routes`
- `Coverage`
- `Pay Export`
3. Cleaner-facing web flow:
- Current stop card with one CTA only:
- `Clock In` before start
- `Start Checklist` during stop
- `Clock Out` at completion
- `Go to Next Stop` after clock-out
4. Ops-facing board:
- exception-first ordering:
- uncovered sites
- active call-outs
- late arrivals
- unresolved exceptions
5. Co-worker visibility policy:
- first-name-only at same site, no contacts, no full schedules.

## Phase 4: Mobile UX Integration (390px-first)
1. Keep existing tabs but replace content behind flag.
2. `Today` tab becomes route-progress stack with deterministic next action.
3. `Clock` tab becomes context-aware action surface for active stop only.
4. Offline queue:
- clock events, checklist checks, call-out submissions queued locally then synced.
- replay idempotency keys on every mutation.
5. Accessibility defaults:
- no color-only signaling
- larger touch targets
- concise, low-cognitive copy.

## Phase 5: Payroll Automation (Checkwriters-Ready)
1. Preview-first export flow:
- compute payroll lines from approved timesheets + paid travel + leave buckets.
- block final export if unresolved approvals or uncategorized leave.
2. Mapping layer:
- configurable output columns to match provider format without code changes.
3. Export audit:
- store run metadata, actor, checksum, row counts, retry lineage.
4. Future-proof:
- keep CSV and add pluggable connector interface for direct integration later.

## Scenario Stress Tests and Fixes (Executed in Plan)
1. Scenario: Published period edited by mistake.
- Risk: schedule drift and missed notifications.
- Fix: lock enforcement via existing guard triggers + hard API rejection for locked artifacts.
2. Scenario: Duplicate assignments from race during trade apply.
- Risk: double staffing/payroll inflation.
- Fix: trade apply RPC remains transactional + unique active assignment constraint per `(ticket_id, staff_id, assignment_status='ASSIGNED')`.
3. Scenario: Call-out arrives near shift start and no response.
- Risk: uncovered site.
- Fix: automatic escalation chain and on-call pool fallback; board surfaces unresolved in red.
4. Scenario: Travel time inflates due to forgotten clock-in.
- Risk: overpayment.
- Fix: auto-travel cap rule + exception generation + manager approval for capped deltas.
5. Scenario: Multi-stop cross-midnight route.
- Risk: wrong pay-period/day attribution.
- Fix: store UTC timestamps + local service-date dimension; payroll aggregation by policy timezone.
6. Scenario: PTO overlaps assigned route.
- Risk: publish with hidden conflict.
- Fix: period validation always includes PTO conflict check before publish.
7. Scenario: Deon’Jha-like assistant receives sensitive ops notifications.
- Risk: permission breach.
- Fix: explicit notification audience rules by role capability; assistant role excluded from call-out + approvals + payroll.
8. Scenario: Feature flag rollback mid-week.
- Risk: stranded UX/state mismatch.
- Fix: dual-read strategy; writes stay on canonical tables, legacy pages still render from same records.
9. Scenario: Mobile offline clock then reconnect.
- Risk: duplicate punches.
- Fix: idempotency token per mutation + server-side dedupe index.
10. Scenario: Existing behavior regression in schedule/workforce tabs.
- Risk: operational disruption.
- Fix: release only under flags + mandatory smoke suite gate before enabling in production.

## Public API / Interface Additions
1. New request/response DTOs:
- `RouteTimelineDTO`, `RouteStopExecutionDTO`, `CalloutEventDTO`, `CoverageOfferDTO`, `PayrollExportPreviewDTO`.
2. New statuses:
- route stop status: `PENDING|ARRIVED|IN_PROGRESS|COMPLETED|SKIPPED`
- call-out status: `REPORTED|FINDING_COVER|COVERED|UNCOVERED|ESCALATED`
- coverage offer status: `PENDING|ACCEPTED|DECLINED|EXPIRED`.
3. No breaking changes to existing DTOs or route responses.

## Test Plan (Decision Complete)
1. DB tests:
- tenant isolation for each new table.
- role mutation matrix.
- archive-only enforcement.
2. RPC tests:
- publish fails with blocking conflicts.
- lock prevents mutation.
- trade apply atomicity and idempotency.
- paid travel segment creation correctness.
3. API contract tests:
- request validation, role guard, problem-details consistency.
4. UI tests (web):
- 390px primary action visibility.
- board exception prioritization.
- payroll export readiness blocking.
5. Mobile tests:
- offline queue replay, no duplicate punches, route progression integrity.
6. E2E scenarios:
- build period -> publish -> call-out -> coverage -> execute route -> approve -> export.
7. Regression suite:
- legacy schedule/operations/workforce screens and APIs unchanged.

## Rollout Plan
1. Stage A (internal): schema + APIs dark-launched, flag off.
2. Stage B (ops pilot): Paulette + owner workflows only.
3. Stage C (limited cleaners): one crew, nightly monitoring.
4. Stage D (all cleaners): route execution + call-out automation.
5. Stage E (payroll cutover): export preview parallel run, then final switch.
6. Rollback path: disable flags; canonical data remains intact and readable by old screens.

## Key Decisions Locked
1. Canonical tenancy key is `tenant_id`.
2. No behavior removals; only additive integration.
3. Existing secret-bearing legacy fields remain for compatibility; new flows do not write plaintext secrets.
4. Travel time is paid and first-class in payroll calculations.
5. Call-out policy is auto-tracked and auto-escalated, with manager override for excused cases.
6. Same-site co-worker visibility is first-name-only.

## Implementation Order (Exact)
1. Migrations `00089` to `00096`.
2. Shared types update in `packages/shared`.
3. Schedule/timekeeping service + repository extensions.
4. New API routes.
5. Web tabs/components behind flags.
6. Mobile route/clock UX behind flags.
7. Payroll export preview/finalize flow.
8. Full regression + staged rollout enablement.

## Assumptions (Revised)
1. Checkwriters-specific CSV schema is **not required at build time**.
2. Payroll export must ship with a **fully configurable in-app mapping builder**:
- create/edit/save multiple export templates
- map any internal field to any output column
- custom column names, ordering, static values, formulas
- date/time and numeric formatting controls
- conditional transforms (e.g., per role/pay type)
- preview sample rows before export
- validate required mappings before run
3. Admin users can configure and update export mappings later without developer changes.
4. Existing schedule conflict RPC remains authoritative for publish gating.
5. Existing no-hard-delete trigger policy remains unchanged.
