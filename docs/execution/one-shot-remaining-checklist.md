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
- [ ] Procurement approvals: multi-step approval workflow for purchase orders and supply requests.
- [ ] Fleet execution: add DVIR + fuel log + odometer workflow linked to vehicles/routes.
- [ ] HR Lite core: PTO requests, performance reviews, goals, badges, and employee docs vault.
- [ ] Offline parity for newly added modules: queue/retry/conflict handling + audit events.

### P1 (hardening)
- [ ] Add end-to-end tests for new P0 workflows.
- [ ] Add dashboard widgets for POD exceptions, approval backlogs, and overdue DVIR.
- [ ] Add CSV/PDF exports for new P0 modules.

## Verification gates
- [ ] `pnpm --filter @gleamops/web typecheck`
- [ ] `pnpm --filter @gleamops/web lint`
- [ ] `pnpm build:web`
- [ ] `DATABASE_URL=linked pnpm audit:schema-parity`
- [ ] `pnpm audit:ui-fields`
- [ ] `vercel inspect gleamops.vercel.app --scope team_hyR74DI2FH5SWn4oawyNlltR`
