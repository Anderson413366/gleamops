# Reorganization Plan (Round 2)

**Date:** 2026-02-19
**Mode:** PLAN_ONLY
**Branch:** `chore/reorg-20260218` (continuing from round 1)

---

## Summary

Round 2 extracts business logic from the remaining 24 oversized API route handlers into new and existing `modules/` service + repository files. Completes the schedule module (currently a stub). Fixes naming inconsistencies and cleans up empty directories.

**Files created:** ~21 new module files
**Files modified:** ~24 route handlers
**Files moved/renamed:** 3 (mobile PascalCase → kebab-case)
**Files deleted:** 1 (empty directory)

---

## Batch Execution Plan

### Batch 10 — Proposals PDF Generation (443 LOC — FATTEST FILE)
**What:** Extract PDF generation, merge, upload logic from the largest remaining route.
**Source:** `api/proposals/[id]/generate-pdf/route.ts`
**Creates:**
- `modules/proposals-pdf/proposals-pdf.service.ts` — PDF generation + merge + upload logic
- `modules/proposals-pdf/proposals-pdf.repository.ts` — proposal/bid/client/tenant/signature queries + Storage ops
- `modules/proposals-pdf/index.ts` — barrel
**Modifies:** `api/proposals/[id]/generate-pdf/route.ts` (443 → ~40 LOC)
**Risk:** HIGH — touches 10 DB tables + Storage, creates own Supabase client
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
3. Manual: generate a test PDF, verify output matches
**Rollback:** `git checkout -- apps/web/src/app/api/proposals/[id]/generate-pdf/route.ts` + delete module

### Batch 11 — Cron Reminders (300 LOC)
**What:** Extract reminder logic, email template, notification from cron route.
**Source:** `api/cron/inventory-count-reminders/route.ts`
**Creates:**
- `modules/cron/cron.service.ts` — reminder logic + email template + notification
- `modules/cron/cron.repository.ts` — site/count/membership/notification queries + auth.admin calls
- `modules/cron/index.ts` — barrel
**Modifies:** `api/cron/inventory-count-reminders/route.ts` (300 → ~30 LOC)
**Risk:** HIGH — creates own Supabase client, calls auth.admin, sends emails via SendGrid
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + delete module

### Batch 12 — Public Counts Read + Save (317 LOC)
**What:** Extract count hydration, detail mapping, fallback logic, and save/partial update logic.
**Sources:**
- `api/public/counts/[token]/route.ts` (182 LOC)
- `api/public/counts/[token]/save/route.ts` (135 LOC)
**Creates:**
- `modules/public-counts/public-counts.service.ts` — count hydration + detail mapping + save logic
- `modules/public-counts/public-counts.repository.ts` — count/detail/supply queries
- `modules/public-counts/index.ts` — barrel
**Modifies:** Both routes to thin delegates
**Risk:** MEDIUM — creates own Supabase client, public-facing (no auth)
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + delete module

### Batch 13 — Public Proposals Read + Sign (241 LOC)
**What:** Extract proposal fetch, hydration, signature validation + storage.
**Sources:**
- `api/public/proposals/[token]/route.ts` (132 LOC)
- `api/public/proposals/[token]/sign/route.ts` (109 LOC)
**Creates:**
- `modules/public-proposals/public-proposals.service.ts` — proposal hydration + signature validation
- `modules/public-proposals/public-proposals.repository.ts` — proposal/signature queries
- `modules/public-proposals/index.ts` — barrel
**Modifies:** Both routes to thin delegates
**Risk:** MEDIUM — creates own Supabase client, public-facing (no auth)
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + delete module

### Batch 14 — Schedule (881 LOC, 13 routes — MOST FILES)
**What:** Complete the schedule module (currently a stub with permissions only). Extract all period, trade, and availability logic.
**Sources:** 13 route files under `api/operations/schedule/`
**Creates:**
- `modules/schedule/schedule.service.ts` — period/trade/availability logic, `currentStaffId()` (deduplicated)
- `modules/schedule/schedule.repository.ts` — all schedule Supabase queries + RPCs
**Modifies:** All 13 schedule route files to thin delegates
**Risk:** HIGH — largest batch by file count, RPC-heavy, shared `currentStaffId()` helper duplicated in 2 files
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
3. E2E: any schedule-related specs
**Rollback:** `git checkout -- apps/web/src/app/api/operations/schedule/` + revert module changes

### Batch 15 — Inventory Orders/POD (174 LOC)
**What:** Extract POD upsert, status update, file validation logic.
**Source:** `api/inventory/orders/[id]/pod/route.ts`
**Creates:**
- `modules/inventory-orders/inventory-orders.service.ts` — POD upsert + status + file validation
- `modules/inventory-orders/inventory-orders.repository.ts` — delivery/order/file queries
- `modules/inventory-orders/index.ts` — barrel
**Modifies:** `api/inventory/orders/[id]/pod/route.ts` (174 → ~35 LOC)
**Risk:** MEDIUM — creates own Supabase client, handles file uploads
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + delete module

### Batch 16 — Workforce HR (157 LOC)
**What:** Extract polymorphic entity handler + audit trail.
**Source:** `api/workforce/hr/[entity]/route.ts`
**Creates:**
- `modules/workforce-hr/workforce-hr.service.ts` — polymorphic entity handler + audit
- `modules/workforce-hr/workforce-hr.repository.ts` — 6 HR table queries
- `modules/workforce-hr/index.ts` — barrel
**Modifies:** `api/workforce/hr/[entity]/route.ts` (157 → ~35 LOC)
**Risk:** MEDIUM — polymorphic routing across 6 entity types
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + delete module

### Batch 17 — Medium Routes (314 LOC: warehouse 105 + signature 105 + pin 104)
**What:** Extract remaining medium-complexity routes into existing or new modules.
**Sources:**
- `api/inventory/warehouse/route.ts` (105 LOC) → add to existing `modules/inventory/`
- `api/proposals/[id]/signature/route.ts` (105 LOC) → add to existing `modules/proposals/`
- `api/sites/[id]/pin/route.ts` (104 LOC) → new `modules/sites/`
**Creates:**
- `modules/sites/sites.service.ts` — PIN management logic
- `modules/sites/sites.repository.ts` — sites repository
- `modules/sites/index.ts` — barrel
**Modifies:**
- `modules/inventory/inventory.service.ts` — add warehouse transfer logic
- `modules/proposals/proposals.service.ts` — add signature capture logic
- All 3 route files to thin delegates
**Risk:** MEDIUM — extends existing modules (must preserve existing exports)
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git checkout` + revert module changes + delete new module

### Batch 18 — Naming Fixes
**What:** Normalize 3 PascalCase mobile component files to kebab-case.
**Renames:**
- `apps/mobile/src/components/ChecklistItem.tsx` → `checklist-item.tsx`
- `apps/mobile/src/components/SyncStatusBar.tsx` → `sync-status-bar.tsx`
- `apps/mobile/src/components/TicketCard.tsx` → `ticket-card.tsx`
**Note:** `eq-assignments` rename deferred (low risk, would change URL routing)
**Risk:** LOW — mobile components, update all imports
**Validation:**
1. `pnpm typecheck`
2. `pnpm build:web`
**Rollback:** `git mv` back to PascalCase

### Batch 19 — Cleanup
**What:** Remove empty `components/modules/` directory.
**Deletes:** `apps/web/src/components/modules/` (empty directory)
**Risk:** LOW — directory has no files
**Validation:** `ls` confirms directory is gone
**Rollback:** `mkdir`

---

## Deferred Routes (P3 — thin CRUD, <90 LOC)

These routes are already thin enough that extraction provides minimal benefit:

| Route | LOC | Why Deferred |
|-------|-----|-------------|
| `contracts/route.ts` | 77 | Simple CRUD |
| `finance/invoices/route.ts` | 81 | Simple CRUD |
| `payroll/runs/route.ts` | 77 | Simple CRUD |
| `integrations/connections/route.ts` | 77 | Simple CRUD |
| `issues/route.ts` | 86 | Simple CRUD |

---

## Validation Commands (run after each batch)

```bash
# TypeScript check (fastest feedback)
pnpm typecheck

# Full build
pnpm build:web

# Lint
pnpm lint

# Unit tests
pnpm test

# E2E (after high-impact batches)
pnpm --filter @gleamops/web e2e
```

---

## Post-Reorg Health Score (Projected)

| Category | Round 1 (actual) | Round 2 (projected) | Max | Delta |
|----------|-----------------|-------------------|-----|-------|
| Symmetry | 15/20 | 19/20 | 20 | +4 |
| Naming Clarity | 18/20 | 19/20 | 20 | +1 |
| Boundary Integrity | 12/20 | 17/20 | 20 | +5 |
| Depth Control | 10/10 | 10/10 | 10 | 0 |
| Duplication Control | 8/10 | 10/10 | 10 | +2 |
| Discoverability | 8/10 | 9/10 | 10 | +1 |
| Build/Test Stability | 7/10 | 7/10 | 10 | 0 |
| **TOTAL** | **78/100** | **91/100** | **100** | **+13** |

---

## Definition of Done

- [ ] `docs/reorg/` artifacts updated for round 2
- [ ] 6 new modules created under `modules/`
- [ ] Schedule module completed (service + repository)
- [ ] All new module files follow Golden Module structure
- [ ] 31/36 route handlers are <50 LOC (5 deferred P3)
- [ ] All 9 inline `createClient()` calls eliminated
- [ ] `currentStaffId()` duplication resolved
- [ ] `turbo build` passes
- [ ] `turbo typecheck` passes
- [ ] `pnpm lint` passes
- [ ] No circular dependencies introduced
- [ ] No orphaned files
- [ ] No behavior change detected
- [ ] Mobile naming conventions normalized
- [ ] Empty `components/modules/` removed
