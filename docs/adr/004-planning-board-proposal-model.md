# ADR 004: Planning Board Is Proposal Layer, Not Source Of Truth

- Status: Accepted
- Date: 2026-02-18

## Context
Evening planning actions can diverge from published schedule if drag actions mutate assignments directly.

## Decision
Model planning as proposal-first:
- `planning_board_items` represent a ticket lens on a board.
- `planning_item_proposals` store mutable assignment proposals.
- Apply endpoint performs server-side revalidation before assignment mutation.
- `planning_board_conflicts` stores warning/blocking conflicts and resolution audit.

Schedule remains source of truth; board changes apply only through explicit apply actions.

## Consequences
- No silent schedule mutation from board drag.
- Drift is observable and resolvable.
- Apply actions are auditable and permission-gated.
