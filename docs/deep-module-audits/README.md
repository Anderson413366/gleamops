# Phase 2 Deep Module Audits

This folder tracks module-by-module deep audits (full CRUD/validation/connectivity/neuroinclusive checks), beyond route-level smoke.

## Scope Rule
- One module under test (MUT) at a time.
- Roles per run are explicit in each report.
- All created records must be `TEST-` prefixed and listed in report coverage.

## Status Backlog
- Home + Search/⌘K — Done (No-Go, see `2026-03-05-home-search-owner-manager.md`)
- Staff Schedule — Not Started
- Dispatch — Not Started
- Work Orders — Not Started
- Field Tools — Not Started
- Client Hub — Not Started
- Sales Pipeline — Not Started
- Estimating — Not Started
- Sales Admin — Not Started
- Workforce — Not Started
- Time & Pay — Not Started
- Shift Config — Not Started
- Inventory — Not Started
- Procurement — Not Started
- Assets — Not Started
- Compliance — Not Started
- Reports — Not Started
- Service Catalog — Not Started
- Settings — Not Started

## Execution Artifacts
- Machine-readable run artifacts are written to repo root as `.tmp-deep-*.json`.
- Human sign-off reports are stored in this directory with date-based names.
