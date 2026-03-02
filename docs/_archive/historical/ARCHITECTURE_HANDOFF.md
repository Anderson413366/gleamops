# Architecture Handoff Plan

**Created:** 2026-02-27
**Status:** ✅ COMPLETE — app is production-stable, all checks green, zero lint warnings.

---

## Current State Summary

GleamOps is a commercial cleaning ERP deployed to production at `https://gleamops.vercel.app`.

### Stack
- **Web:** Next.js 15 (App Router), TypeScript, Tailwind v4, shadcn/ui
- **DB/Auth:** Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Packages:** Monorepo with `apps/web`, `apps/mobile`, `apps/worker`, `packages/shared`, `packages/domain`, `packages/cleanflow`, `packages/ui`
- **CI/CD:** GitHub + Vercel
- **Mobile:** Expo/EAS (Android build submitted, iOS deferred pending Apple Developer enrollment)

### Milestones Completed (A–H + Monday Replacement + Shifts/Time)
- [x] A: Foundation (repo, CI/CD, Supabase, conventions)
- [x] B: Auth + RBAC + Tenant + Audit
- [x] C: Design system + App shell
- [x] D: CRM core (clients/sites/contacts/files/timeline)
- [x] E: Bidding MVP (wizard + CleanFlow + deterministic pricing)
- [x] F: Proposals send + tracking + follow-ups
- [x] G: Won conversion → service plan + recurrence + tickets
- [x] H: Scheduling + dispatch (calendar, drag/drop)
- [x] Monday.com replacement (Phases 1-8: routes, load sheet, night bridge, complaints, periodic tasks, field forms, customer portal, owner dashboard)
- [x] Shifts/Time module (core, paid travel, callout coverage, site books, payroll export, RLS, RPCs)
- [x] P0 Stabilization (feature flags, hard-delete prevention, schema contract, baseline defects documented)
- [x] i18n (EN/ES/PT-BR key parity)
- [x] Cutover tooling (cutover script + weekday route template bootstrap for TNT-0001)

### Database
- 111 migrations applied (through `00111_fix_sites_access_window_constraint.sql`)
- 103+ tables with tenant isolation (RLS)
- 84 business tables protected against hard deletes

### Verification Gates (all green)
- `pnpm typecheck` — 7/7 packages pass
- `pnpm test` — 113/113 tests pass, 0 failures
- `pnpm lint` — 0 warnings, 0 errors
- `pnpm build:web` — successful production build

---

## Completed Handoff Items

### 1. Lint Warning Cleanup ✅
- Fixed 7 ESLint warnings across 4 files:
  - `schedule/recurring/availability-panel.tsx` — escaped unquoted entities
  - `schedule/recurring/shift-trades-panel.tsx` — escaped unquoted entities
  - `route-templates.generate.test.ts` — suppressed unused-vars in mock RPC
  - `shifts-time.travel-capture.test.ts` — suppressed unused-vars in mock RPC

### 2. Placeholder Tests Documented ✅
- 3 placeholder test files exist with `TODO` markers (skeleton tests that `assert.ok(true)`):
  - `complaints.service.test.ts`
  - `public-portal.service.test.ts`
  - `route-templates.service.test.ts`
- These are intentional tracking placeholders for future test expansion, not broken tests.

### 3. Route Architecture Documented ✅
- **Sidebar nav** routes: `/home`, `/operations`, `/crm`, `/pipeline`, `/workforce`, `/inventory`, `/assets`, `/safety`, `/reports`, `/admin`, `/shifts-time`
- **Active secondary routes** (linked from dashboards/home): `/schedule`, `/team`, `/reports`
- **Redirect-only routes**: `/customers` (→ `/crm/clients`)
- **Legacy/dual routes**: `/people`, `/services`, `/employees`, `/employee`, `/equipment`, `/jobs`, `/clients`, `/financial`, `/financial-intelligence`, `/money`, `/subcontractors`, `/vendors`
- Route duplication is documented in `P0_BASELINE_DEFECTS.md` for future consolidation.

---

## Remaining Work (Non-Code / Operational)

These items are outside the codebase and require business stakeholder participation:

1. **Cutover data entry** — Fill generated CSVs with real Monday.com values and import into production tables.
2. **UAT sign-off** — Run stakeholder sessions per `docs/execution/monday-cutover-uat-signoff.md`.
3. **iOS App Store** — Complete Apple Developer enrollment, then build + submit iOS app.
4. **Play Console** — Publish Android build `6e45a8e0-4161-4304-a4a3-a136f22837eb`.

## Future Engineering Work (P1+)

1. **Route consolidation** — Merge orphaned/dual routes into canonical sidebar paths.
2. **Type safety** — Reduce `any` usages from 42 to ≤20.
3. **Test coverage** — Expand placeholder tests into real integration tests.
4. **Zod schema coverage** — Add validation schemas for remaining 9 priority entities (TimeEntry, WorkTicket, etc.).
5. **Milestones I–O** — Checklists, Timekeeping, Inspections, Messaging, Dashboards, Integrations, Hardening.
