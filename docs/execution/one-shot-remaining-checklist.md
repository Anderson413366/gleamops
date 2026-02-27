# One-Shot Remaining Checklist

Last updated: 2026-02-26
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
- [x] Monday replacement Phases 1-8 implemented (routes/load sheet/night bridge/complaints/periodic tasks/field forms/customer portal/owner dashboard).
- [x] PT-BR i18n full backfill completed.
- [x] Supabase Monday replacement migrations `00089` through `00099` created and applied to linked project.
- [x] Shifts/time migration sequence normalized to `00100` through `00109` and applied to linked project.

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

## Mobile deployment follow-up
- [x] Android production EAS build requested (`6e45a8e0-4161-4304-a4a3-a136f22837eb`).
- [ ] iOS production build + App Store submission (explicitly deferred until broader app stabilization and post-UAT hardening).

## Remaining cutover tasks (non-code)
- [ ] Mobile store releases (Play Console + App Store) are intentionally deferred for later program stage.
- [ ] Execute Monday.com manual migration/cutover data entry (sites, route templates, periodic tasks, supply assignments, microfiber enrollments).
- [ ] Run UAT sign-off with operations stakeholders (owner, managers, supervisors, floaters, specialists).

## Cutover package generated
- [x] `scripts/cutover/execute-monday-cutover.ts` created to generate cutover sheets from live Supabase data.
- [x] UAT sign-off template added at `docs/execution/monday-cutover-uat-signoff.md`.
- [x] Cutover workbook generated for tenant `TNT-0001` at `reports/cutover/TNT-0001-2026-02-27T01-18-31.550Z`.
- [x] Weekday route template skeleton (MON-SAT) auto-created for `TNT-0001`.
