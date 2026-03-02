# Target Template Selection

**Date:** 2026-02-18

---

## Selected Template: E (Monorepo) + A (Next.js App Router) — Hybrid

### Rationale

The project is a **Turborepo monorepo** with a **Next.js 15 App Router** web app as the primary product. The monorepo structure (`/apps`, `/packages`) is already correct and does not need changes. The adaptation targets the **web app internal structure** only.

---

## Template Applied To: `apps/web/src/`

### Current Structure
```
apps/web/src/
├── app/           # Routes (pages + API)
├── components/    # UI components
├── hooks/         # Custom hooks
└── lib/           # Utilities + clients
```

### Target Structure (after reorg)
```
apps/web/src/
├── app/           # Routes (pages + API) — UNCHANGED
├── components/    # UI components — UNCHANGED
├── hooks/         # Custom hooks — UNCHANGED
├── lib/           # Utilities + clients — UNCHANGED
└── modules/       # NEW: Domain service + repository layer
```

---

## Why Minimal Changes

The existing structure is **85% correct**. Specifically:

| Layer | Status | Action |
|-------|--------|--------|
| `/app/(dashboard)/` | Correct — mirrors nav modules | NO CHANGE |
| `/app/api/` | Routes stay in place (Next.js convention) | THIN ROUTES (extract logic) |
| `/components/` | Well-organized by type (forms, layout, detail) | NO CHANGE |
| `/hooks/` | 19 focused hooks, single-responsibility | NO CHANGE |
| `/lib/` | Clean separation (api, supabase, utils) | NO CHANGE |
| `/modules/` | Missing — needs creation | CREATE |

### What We Are NOT Doing

- NOT moving page files (Next.js routing depends on file position)
- NOT moving API route files (URL paths must not change)
- NOT reorganizing components (they follow a good pattern)
- NOT reorganizing hooks (already clean)
- NOT restructuring packages (they're exemplary)
- NOT introducing path aliases (keep it simple)

### What We ARE Doing

Adding a **service/repository layer** (`/modules/`) that route handlers delegate to, extracting business logic from oversized route files into testable, reusable modules.

---

## Packages Layer (NO CHANGE)

```
packages/
├── shared/      # Types, constants, validation, errors
├── domain/      # Pure business rules (RBAC, state machine)
├── cleanflow/   # Bid math engine (pure functions)
└── ui/          # 31 React components
```

These packages are the gold standard of the codebase. Health score: 10/10.
