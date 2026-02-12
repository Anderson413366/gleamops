# AI Developer Runbook (Claude Code via Mac Terminal)
**Version:** vFinal2  
**Date:** 2026-02-12

This is the practical “do this, then this” playbook for the Lead AI Developer to execute in a terminal using Claude Code.

The goal: generate clean, reviewable commits without drifting from the roadmap.

---

## 1) Local prerequisites

### Required tooling
- Node.js LTS (>= 20)
- pnpm
- Supabase CLI
- Docker (for local Postgres when needed)
- GitHub CLI (optional)

### Repo conventions
- `main` is protected
- feature branches per milestone (e.g., `milestone-a-foundation`)
- commits: small and descriptive (avoid giant “dump” commits)

---

## 2) Greenfield strategy (recommended)
You have an existing prototype app, but **build GleamOps as a clean new repo** and cut over later (Strangler Fig).

Why:
- RLS-first + tenant isolation is hard to retrofit
- “Service DNA → Sales → Ops” chain is relational; legacy drift is painful

---

## 3) Create repo + install

```bash
mkdir gleamops && cd gleamops
pnpm init
git init
```

### Add monorepo scaffolding (recommended)
Use Turborepo (or Nx). Keep it simple.

Folders required:
- `apps/web` (Next.js)
- `apps/worker` (Node jobs)
- `packages/shared` (types/zod/constants)
- `packages/domain` (pure business rules)
- `packages/cleanflow` (bid math engine)
- `packages/ui` (design system components)
- `supabase/` (migrations + edge functions)
- `docs/`

---

## 4) Supabase setup

### Create / link Supabase project
- create a new Supabase project (prod will be separate later)
- store credentials in `.env.local` for web and `.env` for worker

### Initialize Supabase folder
```bash
supabase init
```

### Start local Supabase (optional)
```bash
supabase start
```

---

## 5) Milestone execution pattern (repeatable)

For each milestone:

1) **Paste the milestone prompt** into Claude Code  
2) Claude generates:
   - migrations + RLS policies
   - API skeleton (OpenAPI + route handlers or edge functions)
   - tests
3) You run:
   - `pnpm lint`
   - `pnpm test`
   - `supabase db reset` (locally)
4) You review diff
5) You commit

---

## 6) Milestone A checklist (Foundation)

### Deliverables
- Next.js app shell (sidebar + top nav)
- Supabase client setup (server + client)
- design tokens + base UI primitives
- OpenAPI skeleton in repo
- Problem Details helper
- Basic CI pipeline (typecheck + lint + unit tests)

### Commands
```bash
pnpm -w lint
pnpm -w test
pnpm -w typecheck
```

---

## 7) Milestone B checklist (Auth, RLS, tenant)

### Deliverables
- Supabase Auth wired
- tenant model + `tenant_id` enforced via RLS
- roles + site scoping
- audit_events table + helper function

### Verification
- run a test user from tenant A
- confirm tenant A cannot read tenant B records (attempt should return empty)

---

## 8) Job queue + worker (for PDFs/follow-ups)
Avoid doing heavy work in edge functions.

Pattern:
- web/edge function inserts a job row in queue table
- worker polls queue and executes
- worker writes status + artifacts (storage)

Queue options:
- Postgres queue (pgmq / Supabase Queues)
- Redis (Upstash) later if needed

---

## 9) How to handle “AI drift”
Claude Code will happily invent architecture if you let it.

Guardrails:
- always paste: roadmap doc + constraints + acceptance criteria
- forbid new tables unless explicitly added to table catalog
- require migrations for every schema change
- require tests for every critical workflow

---

## 10) Release discipline
- Stage deploy per milestone (don’t stack 6 milestones locally)
- demo flows weekly:
  - create bid → generate PDF → send → webhook open → mark won → convert → generate tickets
