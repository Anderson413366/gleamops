# P0: Stabilization + Scope Lock — Master Index

**Purpose:** Lock the baseline before starting new feature phases.
**Scope:** All additive — no existing code removed or modified (except exports + env vars).

---

## Documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [P0_FEATURE_FLAG_GUIDE.md](./P0_FEATURE_FLAG_GUIDE.md) | How feature flags work, domains, usage, rollout lifecycle |
| 2 | [P0_NO_DELETE_CHECKLIST.md](./P0_NO_DELETE_CHECKLIST.md) | Hard delete prevention, soft delete pattern, emergency procedure |
| 3 | [P0_SCHEMA_CONTRACT.md](./P0_SCHEMA_CONTRACT.md) | Frozen naming conventions, column patterns, FK/status/timestamp rules |
| 4 | [P0_BASELINE_DEFECTS.md](./P0_BASELINE_DEFECTS.md) | Known issues: route duplication, type safety, schema gaps, metrics |
| 5 | [P0_REQUIREMENTS_TRACEABILITY.md](./P0_REQUIREMENTS_TRACEABILITY.md) | Doc-to-feature mapping, entity completeness matrix, flag→domain mapping |
| 6 | This file | Master index + acceptance criteria |

## Code Changes

| # | File | Action | Commit |
|---|------|--------|--------|
| 1 | `packages/shared/src/constants/feature-flags.ts` | NEW | C1 |
| 2 | `apps/web/src/hooks/use-feature-flag.ts` | NEW | C1 |
| 3 | `packages/shared/src/index.ts` | EDIT | C1 |
| 4 | `.env.example` | EDIT | C1 |
| 5 | `apps/worker/.env.example` | NEW | C1 |
| 6 | `docs/P0_FEATURE_FLAG_GUIDE.md` | NEW | C1 |
| 7 | `supabase/migrations/00050_prevent_hard_deletes.sql` | NEW | C2 |
| 8 | `docs/P0_NO_DELETE_CHECKLIST.md` | NEW | C2 |
| 9 | `docs/P0_SCHEMA_CONTRACT.md` | NEW | C3 |
| 10 | `packages/shared/src/constants/entity-codes.ts` | NEW | C3 |
| 11 | `docs/P0_BASELINE_DEFECTS.md` | NEW | C4 |
| 12 | `docs/P0_REQUIREMENTS_TRACEABILITY.md` | NEW | C5 |
| 13 | `docs/P0_INDEX.md` | NEW | C5 |
| 14 | `packages/shared/vitest.config.ts` | NEW | C6 |
| 15 | `packages/shared/package.json` | EDIT | C6 |
| 16 | `packages/shared/src/__tests__/feature-flags.test.ts` | NEW | C6 |
| 17 | `packages/shared/src/__tests__/entity-codes.test.ts` | NEW | C6 |

**Total: 13 new files, 4 edits, 1 migration**

## Acceptance Criteria

- [x] 6 feature flags wired: `useFeatureFlag('domain')` works in web, env vars for worker/mobile
- [x] Hard DELETE blocked on 84 business tables via SQL trigger
- [x] Entity code patterns defined for all 19 entity types
- [x] Baseline defect list captured with severity + metrics snapshot
- [x] Schema naming conventions frozen in doc
- [x] Doc-to-feature mapping with DONE/PARTIAL/NOT_STARTED status
- [x] Entity completeness matrix with 61 entities evaluated
- [ ] `pnpm typecheck` passes (7/7)
- [ ] `pnpm build:web` succeeds
- [ ] `pnpm --filter @gleamops/shared test` passes
- [ ] Migration 00050 has correct table names matching existing migrations
- [ ] `.env.example` has all 6 `NEXT_PUBLIC_FF_*` vars
- [ ] All 6 P0 docs exist and cross-reference correctly
