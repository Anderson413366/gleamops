# Reorganization Plan

**Date:** 2026-02-18
**Mode:** PLAN_ONLY
**Branch:** `chore/reorg-20260218` (to be created in APPLY mode)

---

## Summary

Extract business logic from 8 oversized API route handlers into a new `modules/` service + repository layer. Routes become thin delegates (<50 LOC). No file moves — only logic extraction and route refactoring.

**Files created:** ~25 new module files
**Files modified:** ~8 route handlers
**Files moved:** 0
**Files deleted:** 0

---

## Batch Execution Plan

### Batch 1 — Scaffolding (ZERO RISK)
**What:** Create empty `modules/` directory with 8 module folders and placeholder `index.ts` files.
**Files created:** 8 `index.ts` files
**Validation:** `turbo typecheck` (no new imports yet, nothing should break)
**Rollback:** Delete `modules/` directory

### Batch 2 — Inventory Approvals (HIGHEST IMPACT)
**What:** Extract the largest route handler (394 LOC) into service + repository + permissions.
**Source:** `api/inventory/approvals/route.ts`
**Creates:**
- `modules/inventory/inventory.service.ts`
- `modules/inventory/inventory.repository.ts`
- `modules/inventory/inventory.permissions.ts`
**Modifies:** `api/inventory/approvals/route.ts` (394 → ~40 LOC)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
3. E2E: `pnpm --filter @gleamops/web e2e -- --grep "approval"` (if test exists) or manual test
**Rollback:** `git checkout -- apps/web/src/app/api/inventory/approvals/route.ts` + delete module files

### Batch 3 — SendGrid Webhooks
**What:** Extract webhook event processing (247 LOC).
**Source:** `api/webhooks/sendgrid/route.ts`
**Creates:**
- `modules/webhooks/webhooks.service.ts`
- `modules/webhooks/webhooks.repository.ts`
**Modifies:** `api/webhooks/sendgrid/route.ts` (247 → ~30 LOC)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
3. Unit test: `lib/__tests__/sendgrid-webhook-verify.test.ts` still passes
**Rollback:** `git checkout -- apps/web/src/app/api/webhooks/sendgrid/route.ts` + delete module files

### Batch 4 — Proposal Send
**What:** Extract rate limiting + follow-up wiring (188 LOC).
**Source:** `api/proposals/send/route.ts`
**Creates:**
- `modules/proposals/proposals.service.ts`
- `modules/proposals/proposals.repository.ts`
**Modifies:** `api/proposals/send/route.ts` (188 → ~35 LOC)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
3. E2E: `proposal-send.spec.ts`
**Rollback:** `git checkout -- apps/web/src/app/api/proposals/send/route.ts` + delete module files

### Batch 5 — Public Count Submission
**What:** Extract count submission + due date calc (222 LOC).
**Source:** `api/public/counts/[token]/submit/route.ts`
**Creates:**
- `modules/counts/counts.service.ts`
- `modules/counts/counts.repository.ts`
**Modifies:** `api/public/counts/[token]/submit/route.ts` (222 → ~35 LOC)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
**Rollback:** `git checkout` + delete module files

### Batch 6 — Fleet DVIR
**What:** Extract DVIR checklist calculation (190 LOC).
**Source:** `api/operations/fleet/workflow/route.ts`
**Creates:**
- `modules/fleet/fleet.service.ts`
- `modules/fleet/fleet.repository.ts`
**Modifies:** `api/operations/fleet/workflow/route.ts` (190 → ~35 LOC)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
**Rollback:** `git checkout` + delete module files

### Batch 7 — Schedule Permissions
**What:** Centralize schedule permission functions into module.
**Source:** `lib/api/role-guard.ts` (move schedule-specific functions)
**Creates:**
- `modules/schedule/schedule.permissions.ts`
**Modifies:**
- `lib/api/role-guard.ts` (remove schedule-specific functions, or keep as re-exports initially)
- `api/operations/schedule/trades/[id]/approve/route.ts` (update import)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
**Rollback:** `git checkout` + delete module files

### Batch 8 — Messages + Timekeeping (LOW IMPACT)
**What:** Extract remaining moderate-complexity routes.
**Sources:**
- `api/messages/route.ts` (136 LOC)
- `api/timekeeping/pin-checkin/route.ts` (147 LOC)
**Creates:**
- `modules/messages/messages.service.ts`
- `modules/messages/messages.repository.ts`
- `modules/timekeeping/timekeeping.service.ts`
- `modules/timekeeping/timekeeping.repository.ts`
**Modifies:** Both route files
**Validation:**
1. `turbo typecheck`
2. `turbo build`
**Rollback:** `git checkout` + delete module files

### Batch 9 — Error Boundary (ADDITIVE)
**What:** Add React Error Boundary component to app shell.
**Creates:**
- `components/layout/error-boundary.tsx`
**Modifies:**
- `components/layout/app-shell.tsx` (wrap children with error boundary)
**Validation:**
1. `turbo typecheck`
2. `turbo build`
3. Manual: throw test error in dev → verify boundary catches it
**Rollback:** `git checkout -- apps/web/src/components/layout/app-shell.tsx` + delete error-boundary.tsx

---

## Validation Commands (run after each batch)

```bash
# TypeScript check (fastest feedback)
pnpm typecheck

# Full build
pnpm build:web

# Unit tests
pnpm test

# E2E (after high-impact batches)
pnpm --filter @gleamops/web e2e
```

---

## Post-Reorg Health Score (Projected)

| Category | Before | After | Delta |
|----------|--------|-------|-------|
| Symmetry | 14/20 | 18/20 | +4 |
| Naming Clarity | 18/20 | 18/20 | 0 |
| Boundary Integrity | 10/20 | 17/20 | +7 |
| Depth Control | 8/10 | 8/10 | 0 |
| Duplication Control | 10/10 | 10/10 | 0 |
| Discoverability | 7/10 | 9/10 | +2 |
| Build/Test Stability | 8/10 | 8/10 | 0 |
| **TOTAL** | **75/100** | **88/100** | **+13** |

---

## Definition of Done

- [ ] `docs/reorg/` artifacts created
- [ ] `modules/` directory exists with 8 domain modules
- [ ] All module files follow Golden Module structure
- [ ] All targeted route handlers are <50 LOC
- [ ] `turbo build` passes
- [ ] `turbo typecheck` passes
- [ ] `turbo test` passes
- [ ] All 15 E2E specs pass
- [ ] No circular dependencies introduced
- [ ] No orphaned files
- [ ] No behavior change detected
- [ ] Error boundary catches component errors
