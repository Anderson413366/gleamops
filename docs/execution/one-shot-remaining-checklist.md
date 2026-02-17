# One-Shot Remaining Checklist

Last updated: 2026-02-17
Branch: main

## Completed in this sprint window
- [x] Client Sites & Service Plans hierarchy on client detail.
- [x] Site Active Jobs + assigned resources/supplies foundations.
- [x] Cross-module EntityLink + broad linking rollout.
- [x] Money module tabs and KPI surfaces.
- [x] Lookups table/hooks/select integration and UI management.
- [x] Table width/layout system-wide normalization.
- [x] Operations Forms Builder tab.
- [x] Operations Routes & Fleet tab.
- [x] Inventory Forecasting tab.
- [x] Inventory Warehouse tab.
- [x] Settings notification preferences + quiet hours.

## Remaining to finish full one-shot scope

### P0 (must complete)
- [x] Document generator: implement “Append to PDF” behavior in proposal layout editor.
- [x] Delivery & Proof-of-Delivery: add POD capture workflow (signature/photo/GPS stamp) tied to supply orders.
- [x] Procurement approvals: multi-step approval workflow for purchase orders and supply requests.
- [x] Fleet execution: add DVIR + fuel log + odometer workflow linked to vehicles/routes.
- [x] HR Lite core: PTO requests, performance reviews, goals, badges, and employee docs vault.
- [x] Offline parity for newly added modules: queue/retry/conflict handling + audit events.

### P1 (hardening)
- [x] Add end-to-end tests for new P0 workflows.
- [x] Add dashboard widgets for POD exceptions, approval backlogs, and overdue DVIR.
- [x] Add CSV/PDF exports for new P0 modules.

## Verification gates
- [x] `pnpm --filter @gleamops/web typecheck`
- [x] `pnpm --filter @gleamops/web lint`
- [x] `pnpm build:web`
- [x] `DATABASE_URL=linked pnpm audit:schema-parity`
- [x] `pnpm audit:ui-fields`
- [x] `vercel inspect gleamops.vercel.app --scope team_hyR74DI2FH5SWn4oawyNlltR`
