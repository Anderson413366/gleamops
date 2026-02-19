# Architecture Smell Audit (Round 2)

**Date:** 2026-02-19
**Target:** apps/web/src (primary focus)

---

## Issue List

### STRUCTURAL

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| STR-1 | No service/module layer exists | ~~HIGH~~ | — | ✅ FIXED (round 1: 8 modules created) |
| STR-2 | Business logic in route handlers | HIGH | 29/36 routes still have inline logic | OPEN |
| STR-3 | Schedule module is a stub | MEDIUM | `modules/schedule/` has no service/repository | OPEN |
| STR-4 | No error boundary | ~~LOW~~ | — | ✅ FIXED (round 1) |
| STR-5 | 5 FAT routes remain (>150 LOC) | HIGH | generate-pdf (443), cron (300), public-counts (182), orders/pod (174), workforce/hr (157) | NEW |
| STR-6 | `components/modules/` directory is empty | LOW | `components/modules/` exists but has no files | NEW |

### NAMING

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| NAM-1 | `eq-assignments` abbreviation | LOW | `(dashboard)/assets/eq-assignments/` | OPEN |
| NAM-2 | 3 PascalCase files in mobile | LOW | `ChecklistItem.tsx`, `SyncStatusBar.tsx`, `TicketCard.tsx` | NEW |

### BOUNDARIES

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| BND-1 | 9 routes create own Supabase client | HIGH | generate-pdf, cron, signature, 3x public/counts, 2x public/proposals, orders/pod | OPEN |
| BND-2 | 27 component files with direct `.from()` calls | HIGH | forms/ (140+ calls), header.tsx (12 calls) | NEW — largest debt category |
| BND-3 | `currentStaffId()` duplicated in 2 schedule routes | LOW | availability/route.ts, availability/[id]/archive/route.ts | NEW |

### DEPTH

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| DEP-1 | API routes nest to 7-8 levels | LOW | All Next.js convention — no action needed |

### DUPLICATION

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| DUP-1 | 9 inline `createClient()` definitions | MEDIUM | Routes bypassing shared `getServiceClient()` | NEW |
| DUP-2 | `currentStaffId()` duplicated in 2 files | LOW | schedule availability routes | NEW |

### IMPORT/EXPORT HAZARDS

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| IMP-1 | No circular dependencies | N/A | CLEAR |
| IMP-2 | Package barrels clean | N/A | CLEAR |
| IMP-3 | Module -> lib imports are clean | N/A | CLEAR (verified) |

---

## Repo Health Score (0-100)

| Category | Round 1 | Round 2 | Max | Rationale |
|----------|---------|---------|-----|-----------|
| **Symmetry** | 14 | 15 | 20 | +1: modules layer exists. -5: only 7/36 routes delegate. |
| **Naming Clarity** | 18 | 18 | 20 | Unchanged. Excellent kebab-case. Minor: eq-abbreviation, 3 mobile PascalCase. |
| **Boundary Integrity** | 10 | 12 | 20 | +2: 7 routes now properly layered. -8: 27 components with DB calls, 9 inline clients. |
| **Depth Control** | 8 | 10 | 10 | +2: all deep nesting is Next.js convention, zero arbitrary depth. |
| **Duplication Control** | 10 | 8 | 10 | -2: 9 inline createClient, 1 duplicated helper. |
| **Discoverability** | 7 | 8 | 10 | +1: modules layer helps. Most domains still hidden in routes. |
| **Build/Test Stability** | 8 | 7 | 10 | -1: deeper audit shows packages/ui has 0 tests, shared is sparse. |
| **TOTAL** | **75** | **78** | **100** | **+3 from round 1** |

### Score Interpretation

**Current: 78/100 — Production-solid, targeted improvements needed**

Round 1 addressed the 7 worst routes. The deeper round 2 audit uncovered additional issues (component boundary violations, inline Supabase clients, schedule stub) that weren't visible in round 1. The net improvement is +3 points after accounting for newly discovered issues.

**Projected after round 2: 90/100** (if all P0-P2 routes extracted + schedule completed)
