# Risk Register (Round 2)

**Date:** 2026-02-19
**Mode:** PLAN_ONLY

---

## Resolved Risks (Round 1)

| ID | Risk | Resolution |
|----|------|-----------|
| R1 | Import path breakage after extraction | RESOLVED — all 7 routes compile, typecheck passes |
| R2 | Behavioral regression in approval workflow | RESOLVED — verbatim extraction, build passes |
| R3 | Rate limiting regression in proposal send | RESOLVED — verbatim extraction |
| R4 | Webhook event processing regression | RESOLVED — verbatim extraction |
| R5 | Circular dependency introduced | RESOLVED — verified clean |
| R6 | Audit logging gap | RESOLVED — audit calls preserved |
| R7 | Permission logic drift | RESOLVED — permissions extracted verbatim |
| R8 | Schedule permission centralization breaks guards | RESOLVED — clean extraction |
| R9 | Build failure due to missing module resolution | RESOLVED — `@/modules/*` resolves correctly |

---

## Active Risks (Round 2)

| ID | Risk | Likelihood | Impact | Mitigation | Batch |
|----|------|-----------|--------|------------|-------|
| R10 | **PDF generation regression** — generate-pdf route touches 10 DB tables + Storage + PDFKit | MEDIUM | CRITICAL | Extract verbatim. Manual test: generate PDF, compare output byte-for-byte. | 10 |
| R11 | **Inline Supabase client migration** — 9 routes create own clients; switching to shared `getServiceClient()` could change auth context | MEDIUM | HIGH | For routes that use `createClient()` with service role key, map to `getServiceClient()`. For routes that use anon client (public routes), create `getAnonClient()` wrapper. Test each. | 10-15 |
| R12 | **Cron auth.admin regression** — cron route calls `supabase.auth.admin` which requires service role | LOW | HIGH | Ensure repository uses service role client. Test: trigger cron endpoint, verify email sent. | 11 |
| R13 | **Public route auth context** — public counts/proposals routes intentionally skip auth | LOW | HIGH | Do NOT add auth guard to public routes. Verify token-based access preserved. | 12, 13 |
| R14 | **Schedule batch size** — 13 routes in one batch is the largest atomic change | MEDIUM | MEDIUM | Can split into sub-batches: (a) periods 4 routes, (b) trades 5 routes, (c) availability 2 routes, (d) conflicts 1 route. Validate each sub-batch. | 14 |
| R15 | **`currentStaffId()` consolidation** — deduplicating helper from 2 files into module could change behavior if implementations differ | LOW | MEDIUM | Diff the 2 implementations. If identical, consolidate. If different, keep both and investigate. | 14 |
| R16 | **Extending existing modules** — batch 17 adds logic to inventory and proposals modules that already work | LOW | MEDIUM | Add new service functions without modifying existing ones. Keep existing barrel exports unchanged. Add new exports. | 17 |
| R17 | **Mobile import path breakage** — renaming PascalCase → kebab-case in mobile app | LOW | LOW | Search all imports for old filenames. Update. Run `pnpm typecheck`. | 18 |
| R18 | **Polymorphic HR entity routing** — workforce HR route handles 6 entity types dynamically | LOW | MEDIUM | Extract the entity-type dispatch table verbatim. Ensure all 6 entity paths still resolve. | 16 |

---

## Constraints

| Constraint | Source | Impact on Reorg |
|-----------|--------|-----------------|
| **Backend Lock** | `.claude/rules/backend-lock.md` | Cannot modify SQL, RLS, RPCs, auth config. Modules are frontend/API-layer only. |
| **URL Stability** | AGENT.md Non-negotiable 1.2 | API route file paths must not change (Next.js routing). Only internal logic is extracted. |
| **No Feature Addition** | AGENT.md Non-negotiable 1.2 | Modules add no new capabilities. They reorganize existing logic. |
| **Behavior Preservation** | AGENT.md Contract 1.1 | Every extracted function must produce identical outputs for identical inputs. |
| **Public Route Security** | Application design | Public routes (counts/proposals) must NOT gain auth requirements during extraction. |

---

## Deferred Items (Future Phases)

| Item | Why Deferred | Risk if Addressed Now |
|------|-------------|----------------------|
| Extract 27 component `.from()` calls (BND-2) | Component boundary violations — largest debt (140+ calls) | Massive scope increase. Needs dedicated "component service layer" phase. |
| Extract 5 thin CRUD routes (P3) | <90 LOC each, already clean | Over-abstraction for simple CRUD |
| Rename `eq-assignments` directory (NAM-1) | Would change URL routing path | URL breakage risk, low value |
| Add `@gleamops/ui` tests | Zero tests currently, orthogonal to structural reorg | Scope creep |
| Server Components migration | Architectural shift beyond structural surgery | Behavior change risk |

---

## Stop Conditions

The reorg will **stop immediately** and revert the current batch if:

1. `pnpm typecheck` fails after a batch
2. `pnpm build:web` fails after a batch
3. Any E2E test fails after a batch
4. Generated PDF output differs from original (batch 10)
5. Public route access breaks (batches 12, 13)
6. Cron email delivery fails (batch 11)
7. Unclear behavior coupling is detected

In stop condition, the batch is reverted and the plan is revised before continuing.
