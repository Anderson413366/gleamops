# Risks and Backout Plan

## Risks
- Existing operations UI paths may bypass RPC and mutate rows directly
- Route/fleet and planning logic can drift if lock rules are not centralized
- `hr_pto_requests` and scheduling state can diverge without conflict refresh hooks

## Mitigations
- enforce critical transitions via RPC only
- centralize conflict generation in `fn_validate_schedule_period`
- log schedule lifecycle events for audit and rollback visibility

## Backout
- Disable planning feature flag
- Revert app-level planner routes
- Keep additive schema intact
- Prevent new period publish by temporarily revoking publish RPC execute grants
