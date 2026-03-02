# AI Agent Prompts (Lead AI Developer Pack)
**Version:** vFinal2  
**Date:** 2026-02-12

These prompts are designed for **Claude Code** sessions (Mac Terminal) and for “review agents” in separate AI chats.

Rule: **one agent, one job**. Mixing roles creates half-baked output.

---

## 0) Global context block (paste at the top of every prompt)

```markdown
You are working in the GleamOps monorepo.

Non-negotiables:
- Data continuity: Services → Bids → Proposals → Won conversion → Contracts → Tickets → Time/QA/Inventory/Assets/Safety
- Work Ticket is the nucleus
- RLS-first tenant isolation on all tenant tables
- Soft delete + optimistic locking (version_etag / If-Match)
- Apple-simple UX (progressive disclosure, list→drawer, one primary action)
- OpenAPI 3.1 contract-first
- Problem Details errors (RFC 9457 style) with stable error codes
- Do not implement invoicing/payments/taxes
- No “creative architecture”: follow docs exactly

Sources in repo:
- docs/00_MASTER_DEV_PLAN.md
- spreadsheets/GleamOps_Master_Roadmap_vFinal2.xlsx
- docs/appendices/A_TABLE_CATALOG.md
- docs/07_ERROR_CATALOG.md
```

---

## 1) Agent: Principal Architect (scope + guardrails)

**Goal:** keep the build aligned with roadmap and UX rules.

```markdown
Task: Review the current repo status and produce a “next 3 commits” plan.

Inputs:
- docs/00_MASTER_DEV_PLAN.md
- spreadsheets/GleamOps_Master_Roadmap_vFinal2.xlsx
- current git diff

Output:
1) A prioritized list of the next 3 commits with:
   - exact files to touch
   - acceptance criteria per commit
2) Risks (security/perf/UX) you see in the current diff
3) Any roadmap drift you detected (tables/endpoints/features)
```

---

## 2) Agent: Database + RLS specialist (the “no leaks” person)

```markdown
Task: Generate Supabase migrations for Milestone B (tenant + RLS foundation).

Constraints:
- Every tenant table has tenant_id, created_at, updated_at, archived_at, archived_by, archive_reason, version_etag
- Enable RLS and write policies
- Provide helper SQL functions:
  - current_tenant_id()
  - has_role(role_code)
  - is_site_member(site_id)
- Provide indexes for tenant_id + common filters
- Write minimal seed data for roles + lookups

Deliverables:
- supabase/migrations/*_tenant_and_roles.sql
- supabase/migrations/*_rls_helpers.sql
- docs/appendices/C_INDEX_STRATEGY.sql updated (if needed)

Acceptance criteria:
- Local db reset succeeds
- Example query proves tenant A cannot read tenant B
```

---

## 3) Agent: CleanFlow engine engineer (math + tests)

```markdown
Task: Implement the CleanFlow engine package (packages/cleanflow).

Must include:
- production rate matching (5-priority algorithm)
- workload calculation
- pricing calculation (cost_plus, target_margin, hybrid)
- deterministic results
- tests comparing known fixtures

Deliverables:
- packages/cleanflow/src/*
- packages/cleanflow/tests/*
- docs/08_CLEANFLOW_ENGINE.md updated if implementation reveals gaps

Acceptance criteria:
- pnpm test passes
- engine produces stable numbers for fixture inputs
```

---

## 4) Agent: Proposal + Email engineer (PDF + SendGrid + webhooks)

```markdown
Task: Implement proposal generation + email send + event webhook ingestion.

Rules:
- PDF generation must run in Node runtime (worker), not edge
- Emails are rate-limited + idempotent (Idempotency-Key)
- Webhooks must verify signature (raw body) and be idempotent
- Follow-ups stop on bounce/spam/won/lost/manual stop

Deliverables:
- apps/worker/jobs/generateProposalPdf.ts
- apps/worker/jobs/sendProposal.ts
- supabase/functions/sendgrid-webhook/index.ts (or Next.js route in Node runtime)
- migrations for proposal tables + email event tables
- tests for webhook idempotency + stop rules

Acceptance criteria:
- can send test email
- can ingest webhook event twice without duplicating
```

---

## 5) Agent: Scheduling engineer (tickets + calendar performance)

```markdown
Task: Implement schedule queries + ticket CRUD optimized for speed.

Rules:
- Tickets list view must be light (avoid giant joins)
- Provide indexes: (tenant_id, start_at), (tenant_id, assignee_id, start_at)
- Provide detail endpoint for drawer

Deliverables:
- API endpoints + queries
- schedule UI skeleton (calendar + list)
- perf notes + explain plans for critical queries

Acceptance criteria:
- schedule week view loads fast on realistic data volume
```

---

## 6) Agent: QA / Test engineer (the “ruins everybody’s day” person)

```markdown
Task: Add tests that prevent regressions on the critical path.

Must cover:
- bid workload calculation unit tests
- proposal send flow integration test
- webhook idempotency tests
- won conversion integration test
- RBAC/RLS smoke tests

Deliverables:
- tests/ (unit + integration)
- CI gates updated (fail build on contract drift)

Acceptance criteria:
- CI runs unit + integration tests in under 10 minutes
```

---

## 7) Audit Agent prompt (double-check the whole plan)
Use this to validate the docs pack before building.

```markdown
Task: Audit the GleamOps Dev Pack for missing requirements.

Inputs:
- docs/00_MASTER_DEV_PLAN.md
- docs/03_ROADMAP_MILESTONES.md
- docs/04_DATA_MODEL.md
- docs/05_SECURITY_AND_PERMISSIONS.md
- docs/06_API_CONTRACT.md
- docs/07_ERROR_CATALOG.md
- spreadsheet roadmap file

Check:
- Every module A–H represented in data model
- Ticket nucleus principle is implemented
- RLS policies exist for every tenant table
- Conversion flow is atomic + idempotent
- Email/webhook signature verification is specified
- Rate limiting + notifications exist
- Search + duplicate detection + timezone fields specified
- Out-of-scope items are not accidentally included

Output:
- A list of any missing items
- Concrete edits needed (file/section + proposed text)
- Severity rating per issue
```
