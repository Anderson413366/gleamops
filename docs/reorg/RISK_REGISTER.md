# Risk Register

**Date:** 2026-02-18
**Mode:** PLAN_ONLY

---

## Risk Table

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| R1 | **Import path breakage after extraction** | MEDIUM | HIGH | Run `turbo typecheck` after each batch. Fix imports immediately. | OPEN |
| R2 | **Behavioral regression in approval workflow** | LOW | CRITICAL | Extract logic verbatim (copy, not rewrite). Run E2E `p0-workflows.spec.ts`. Manual test. | OPEN |
| R3 | **Rate limiting regression in proposal send** | LOW | HIGH | Extract verbatim. Run E2E `proposal-send.spec.ts`. | OPEN |
| R4 | **Webhook event processing regression** | LOW | HIGH | Extract verbatim. Test with SendGrid webhook replay. | OPEN |
| R5 | **Circular dependency introduced** | LOW | MEDIUM | Modules import from `lib/` and `@gleamops/*` only. Routes import from modules. No reverse deps. Verify with import graph check. | OPEN |
| R6 | **Audit logging gap** | LOW | HIGH | Ensure `writeAuditMutation()` calls are preserved in service layer. Verify audit records still created after each batch. | OPEN |
| R7 | **Permission logic drift** | LOW | MEDIUM | Extract permission functions verbatim. Unit test each extracted permission function. | OPEN |
| R8 | **Schedule permission centralization breaks existing guards** | LOW | MEDIUM | Keep original `role-guard.ts` functions as pass-through wrappers initially. Remove after validation. | OPEN |
| R9 | **Build failure due to missing module resolution** | LOW | MEDIUM | Verify `@/modules/*` resolves correctly in Next.js tsconfig paths. Test with `turbo build`. | OPEN |

---

## Constraints

| Constraint | Source | Impact on Reorg |
|-----------|--------|-----------------|
| **Backend Lock** | `.claude/rules/backend-lock.md` | Cannot modify SQL, RLS, RPCs, auth config. Modules are frontend/API-layer only. |
| **URL Stability** | AGENT.md Non-negotiable 1.2 | API route file paths must not change (Next.js routing). Only internal logic is extracted. |
| **No Feature Addition** | AGENT.md Non-negotiable 1.2 | Modules add no new capabilities. They reorganize existing logic. |
| **Behavior Preservation** | AGENT.md Contract 1.1 | Every extracted function must produce identical outputs for identical inputs. |

---

## Deferred Items (Future Phases)

| Item | Why Deferred | Risk if Addressed Now |
|------|-------------|----------------------|
| Centralize ALL permission checks into modules | Some routes use thin permission wrappers that work fine | Could break guards that cross module boundaries |
| Extract all remaining route DB access | Some routes are thin CRUD (<80 LOC) | Over-abstraction for simple CRUD |
| Add component-level unit tests | Orthogonal to structural reorg | Scope creep |
| Server Components for static pages | Architectural shift beyond structural surgery | Behavior change risk |
| Path aliases (`@/modules/*`) | May need tsconfig changes | Build risk if not configured correctly |

---

## Stop Conditions (from AGENT.md Section 1.3)

The reorg will **stop immediately** and revert the current batch if:

1. `turbo build` fails after a batch
2. `turbo typecheck` fails after a batch
3. Any E2E test fails after a batch
4. Unclear behavior coupling is detected (e.g., route rename affects navigation)
5. Import updates cannot be done confidently

In stop condition, the batch is reverted and the plan is revised before continuing.
