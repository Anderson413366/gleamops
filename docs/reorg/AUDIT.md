# Architecture Smell Audit

**Date:** 2026-02-18
**Target:** apps/web/src (primary focus)

---

## Issue List

### STRUCTURAL (folder ownership ambiguity)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| STR-1 | No service/module layer exists | HIGH | `apps/web/src/` has no `modules/` directory |
| STR-2 | Business logic lives directly in route handlers | HIGH | 5+ route files with 188-394 LOC of inline logic |
| STR-3 | Repository layer is vestigial | MEDIUM | `lib/repositories/` has 1 file (`enterprise-mappers.ts`) |
| STR-4 | No error boundary component | LOW | No React Error Boundary in app shell |

### NAMING (abbreviations, unclear names, duplicates)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| NAM-1 | `lib/` files lack domain descriptors | LOW | `auth-guard.ts` vs `auth.guard.ts` — functional but inconsistent with module convention |
| NAM-2 | `eq-assignments` abbreviation | LOW | `(dashboard)/assets/eq-assignments/` — "eq" is short for "equipment" |

**Note:** Overall naming is excellent. Consistent kebab-case, `use-` prefix on hooks, `{entity}-form.tsx` on forms. No mixed casing.

### BOUNDARIES (data in UI, domain in routes, etc.)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| BND-1 | Direct Supabase access in ALL route handlers | HIGH | 12/12 sampled routes import `getServiceClient()` directly |
| BND-2 | Workflow state machines embedded in routes | HIGH | `api/inventory/approvals/route.ts` (394 LOC) |
| BND-3 | Rate limiting logic embedded in route | HIGH | `api/proposals/send/route.ts` (188 LOC) |
| BND-4 | Event normalization in webhook route | HIGH | `api/webhooks/sendgrid/route.ts` (247 LOC) |
| BND-5 | Date calculation in public route | MEDIUM | `api/public/counts/[token]/submit/route.ts` (222 LOC) |
| BND-6 | DVIR calculation in fleet route | MEDIUM | `api/operations/fleet/workflow/route.ts` (190 LOC) |
| BND-7 | Inline permission checks in 2 routes | MEDIUM | `hasApprovalRole()` in inventory, `canManageSchedule()` in schedule |

### DEPTH (nesting >3)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| DEP-1 | API routes nest to 8 levels | LOW | `api/operations/schedule/periods/[id]/publish/route.ts` |
| DEP-2 | Schedule trades nest to 8 levels | LOW | `api/operations/schedule/trades/[id]/approve/route.ts` |

**Note:** Nesting is driven by Next.js file conventions + RESTful resource hierarchy. Semantically correct — no arbitrary depth.

### DUPLICATION (constants/types/utils)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| DUP-1 | None detected | N/A | Types, constants, status colors all centralized in `@gleamops/shared` |

**Note:** Package architecture successfully prevents duplication. 23 status color maps in one file, all types in `@gleamops/shared`, validation schemas shared between client and server.

### IMPORT/EXPORT HAZARDS (barrels, circular deps, hidden exports)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| IMP-1 | No circular dependencies detected | N/A | Dependency flow: domain -> shared; cleanflow -> shared; ui -> shared; web -> all |
| IMP-2 | Package barrels are clean and explicit | N/A | Each package `index.ts` uses named exports only |

---

## Repo Health Score (0-100)

| Category | Score | Max | Rationale |
|----------|-------|-----|-----------|
| **Symmetry** | 14 | 20 | Packages are symmetrical. Route handlers are not (no module layer). |
| **Naming Clarity** | 18 | 20 | Excellent consistency. Minor: `eq-assignments`, lib file descriptors. |
| **Boundary Integrity** | 10 | 20 | Packages respect boundaries. API routes violate them (DB + logic + permissions inline). |
| **Depth Control** | 8 | 10 | Deep nesting is framework-driven, not arbitrary. Minor deduction for 8-level API routes. |
| **Duplication Control** | 10 | 10 | Zero duplication detected. Single source of truth for all shared concerns. |
| **Discoverability** | 7 | 10 | A new dev can navigate modules and pages quickly. Business logic in routes is harder to find. |
| **Build/Test Stability** | 8 | 10 | Turbo pipeline works. 15 E2E specs + 13 unit tests. Component-level tests missing. |
| **TOTAL** | **75** | **100** | |

### Score Interpretation
- 90-100: Award-grade
- 75-89: Production-solid, targeted improvements needed
- 60-74: Functional but disorganized
- <60: Needs significant restructuring

**Current: 75/100 — Production-solid**

The codebase is well-built. The package layer (shared/domain/cleanflow/ui) is exemplary. The deficit is concentrated in the API route layer, which acts as a monolithic controller pattern instead of delegating to service/repository modules.
