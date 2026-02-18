# ADR 001: Canonical Navigation And Module Routing

- Status: Accepted
- Date: 2026-02-18

## Context
Legacy module routes (`/home`, `/pipeline`, `/crm`, `/operations`, etc.) created cognitive load and inconsistent workflow entry points.

## Decision
Use canonical module routes as primary entry points:
`/command`, `/schedule`, `/planning`, `/work`, `/customers`, `/sales`, `/people`, `/supplies`, `/insights`, `/platform`.

Legacy paths are redirected to canonical paths by middleware using a typed redirect map.

## Consequences
- New navigation uses canonical module names.
- Bookmarks and deep links continue to work through redirects.
- URL ownership is explicit and module-scoped.
