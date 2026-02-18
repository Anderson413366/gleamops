# ADR 003: Policy-Driven Schedule Conflict Enforcement

- Status: Accepted
- Date: 2026-02-18

## Context
Schedule conflict severities were mostly static and not tenant configurable.

## Decision
Add tenant/site policy table `schedule_policies` and enforce policy at validation/publish time.
Conflict types include policy-driven severities:
- `rest_window_violation`
- `max_weekly_hours_violation`
- `overtime_threshold_warning`
- `subcontractor_capacity_violation`

Publish path re-validates conflicts server-side and blocks on blocking conflicts.

## Consequences
- Enforcement can be tuned by tenant policy (`warn`, `block`, `override_required`).
- Conflict handling is deterministic and auditable.
- Schedule publish behavior matches labor-rule expectations.
