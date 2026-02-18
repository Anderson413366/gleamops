# ADR 002: Domain Boundaries And Module Contracts

- Status: Accepted
- Date: 2026-02-18

## Context
Feature logic was spread across route pages and ad-hoc helpers.

## Decision
Adopt a module contract per domain under `apps/web/src/modules/<domain>/`:
- `types.ts`
- `queries.ts`
- `commands.ts`
- `policies.ts`
- `selectors.ts`
- `next-best-action.ts`
- `telemetry.ts`

Introduce shared type contracts in `packages/shared/src/types` and pure state machines in `packages/domain/src`.

## Consequences
- Business logic is discoverable and testable.
- Shared contracts reduce drift across web/mobile/backend.
- Domain ownership is explicit for future extraction.
