# Monday Cutover UAT Sign-Off

Last updated: 2026-02-27

## Scope

This sign-off covers the operational cutover from Monday.com to native GleamOps workflows for:
- Site procedures + access windows
- Weekday route templates
- Periodic tasks
- Supply assignment verification
- Microfiber enrollments

## Pre-UAT Technical Gate (Completed)

- [x] Database migrations in parity through `00111`
- [x] Route templates/periodic tasks/field reports/customer portal/owner dashboard modules deployed
- [x] Build gate passed (`pnpm lint && pnpm typecheck && pnpm build`)
- [x] Cutover workbook generator executed for tenant `TNT-0001`
  - Output set: `reports/cutover/TNT-0001-2026-02-27T01-18-31.550Z`
  - Snapshot: 401 sites, 156 site jobs, 58 cleaner/supervisor staff, 6 weekday route templates

## Current Status

- Stakeholder UAT sessions are not yet executed.
- Signatures are pending and cannot be auto-completed by engineering automation.

## Stakeholder UAT Sessions (To Execute)

### Session 1: Site Data
- Owner/Admin + Manager review:
  - `sites_procedures_access_windows.csv`
  - verify `cleaning_procedures`, `access_window_start`, `access_window_end`
- Acceptance target: 100% site rows marked ready

### Session 2: Routes + Periodic Tasks
- Operations lead + Supervisor review:
  - `route_templates_weekday.csv`
  - `route_template_stops.csv`
  - `route_template_tasks.csv`
  - `periodic_tasks.csv`
- Acceptance target: all weekday templates populated and periodic tasks seeded for active site jobs

### Session 3: Supply + Microfiber
- Inventory lead + Workforce lead review:
  - `supply_assignments_verification.csv`
  - `microfiber_enrollments.csv`
- Acceptance target: no sites without required assignment coverage; microfiber roster finalized

## Operational Sign-Off

- [ ] Owner/Admin sign-off
- [ ] Manager sign-off
- [ ] Supervisor sign-off
- [ ] Inventory sign-off
- [ ] Workforce sign-off

## Signatures

| Role | Name | Date | Signature |
|---|---|---|---|
| Owner/Admin |  |  |  |
| Manager |  |  |  |
| Supervisor |  |  |  |
| Inventory |  |  |  |
| Workforce |  |  |  |
