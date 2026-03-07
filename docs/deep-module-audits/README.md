# Phase 2 Deep Module Audits

This folder is the canonical current-status board for deep certification.

Use this `README.md` to determine the latest module status. Individual module reports and phase sign-off docs remain historical evidence. If an older report conflicts with a later closure rerun or phase sign-off linked below, the latest dated evidence in this file wins.

This folder tracks deep audits beyond route-level smoke:
- full CRUD paths
- validation behavior
- connectivity and cross-module propagation
- role behavior
- neuroinclusive / ADHD release criteria

## Scope Rule
- One module under test (MUT) at a time.
- Roles per run are explicit in each report.
- All created records must be `TEST-` prefixed and listed in report coverage.

## Status Legend
- `GO` — latest verified deep or closure evidence is green for the listed roles.
- `PARTIAL` — some roles are green, but at least one role is blocked or pending re-verification.
- `COVERED` — module is included in a consolidated deep certification rerun, but a dedicated module report has not yet been published in this folder.

## Canonical Status Board

| Module | Current status | Roles / scope | Canonical evidence | Notes |
| --- | --- | --- | --- | --- |
| Home + Search / Command Palette | `GO` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Earlier `NO-GO` in [`2026-03-05-home-search-owner-manager.md`](2026-03-05-home-search-owner-manager.md) is preserved as historical failure evidence and superseded by the 2026-03-06 production rerun. |
| Staff Schedule | `PARTIAL` | `OWNER_ADMIN`, `MANAGER`, `SUPERVISOR` are green; `CLEANER`, `INSPECTOR` are blocked | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Current blocker is `ROLEEXT-STAFF-001` in Leave & Availability for `CLEANER` / `INSPECTOR`. Dedicated module report is still pending migration into this folder. |
| Dispatch | `GO` | `OWNER_ADMIN`, `MANAGER` | [`2026-03-07-dispatch-owner-manager.md`](2026-03-07-dispatch-owner-manager.md) | Latest post-deploy closure after notes-persistence fix (`eb26c32`). |
| Work Orders | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Field Tools | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Client Hub | `GO` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Closure rerun is green after favicon console-noise fix (`1116c61`). |
| Sales Pipeline | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Estimating | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Sales Admin | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Workforce | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Time & Pay | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Shift Config | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Inventory | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Procurement | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Assets | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Compliance | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Reports | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Service Catalog | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |
| Settings | `COVERED` | `OWNER_ADMIN`, `MANAGER` | [`../phase-2-certification-signoff-2026-03-06.md`](../phase-2-certification-signoff-2026-03-06.md) | Included in the consolidated deep remaining-modules rerun; dedicated module report pending. |

## Role Coverage Snapshot
- `OWNER_ADMIN` + `MANAGER`
  - Latest deep certification status is green across Home + Search, Staff Schedule, Dispatch, Client Hub, and the consolidated remaining-modules rerun.
- `SUPERVISOR`
  - Focused Staff Schedule role-control certification is green in the 2026-03-06 addendum.
- `CLEANER` + `INSPECTOR`
  - Broad accelerated production sweep is green in [`../phase-2-certification-signoff-2026-03-04.md`](../phase-2-certification-signoff-2026-03-04.md).
  - Deep Staff Schedule role-extension status remains `NO-GO` until `ROLEEXT-STAFF-001` is fixed and re-verified.

## Historical Supersessions
- [`2026-03-05-home-search-owner-manager.md`](2026-03-05-home-search-owner-manager.md) captures the original Home + Search `NO-GO`; it is not the current module status.
- [`2026-03-07-dispatch-owner-manager.md`](2026-03-07-dispatch-owner-manager.md) is the current Dispatch source of truth and supersedes earlier pre-fix raw artifacts referenced from phase sign-offs.

## Execution Artifacts
- Machine-readable run artifacts are written to repo root as `.tmp-deep-*.json`.
- Human sign-off reports are stored in this directory with date-based names.
