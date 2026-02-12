# GleamOps Master Development Plan (vFinal2)
**Date:** 2026-02-12  
**Owner:** Anderson Cleaning Services  
**Product Name:** GleamOps  
**Internal Engine Name:** CleanFlow (bidding + workloading + pricing)

This document is the “single source of truth” dev plan that merges:
- The v7.0 Blueprint (modules A–H + core schema snippet)
- The standalone roadmap requirements (tickets as the nucleus, offline inspections, timekeeping, scheduling)
- Claude + Gemini inspection findings (constraints, RLS, indexes, conversion, error catalog, rate limits, notifications, search, timezone, duplication control)

If anything conflicts, follow this rule:
1) **Data continuity** wins.  
2) **Security (RLS/tenant isolation)** wins.  
3) **Apple-simple UX** wins.  
4) Everything else negotiates.

---

## 0) North Star

### What we’re building
A modern B2B ERP for commercial cleaning that replaces spreadsheets with a single system where:

**Service Templates → Bids → Proposals → Won Conversion → Contracts → Work Tickets → Time + QA + Inventory + Assets + Safety → Reporting**

No re-typing. No “where did that spreadsheet go.” No mystery math.

### Product boundaries (non-negotiable)
**In scope (v1):**
- **Pipeline:** prospects → bids → proposals → send → tracking → follow-ups → win/loss
- **Service DNA:** tasks + services + service tasks (templates)
- **Operations:** service plans/contracts from won proposals
- **Scheduling:** recurring + one-time work tickets, calendar, drag/drop reschedule/reassign
- **Execution:** ticket checklist, photos, completion states
- **Timekeeping:** geofence check-in/out, exceptions, timesheets, approvals, optional PIN override
- **Quality:** inspections (offline-first), scoring, follow-up tickets from issues
- **Messaging:** controlled 1:1, escalate-to-supervisor workflow
- **Reporting:** ops dashboard, sales dashboard, exports
- **Integrations (optional):** QuickBooks Online timesheet sync only

**Explicitly out of scope (v1):**
- Invoicing, payments, taxes, statements.

### The design principle
**Work Ticket is the nucleus.**  
Everything attaches to tickets (schedule, checklist, photos, timekeeping, inspection issues, follow-up actions).

---

## 1) UX: “Apple simple” and ADHD-friendly (also non-negotiable)

### Navigation (keep it calm)
Top-level app spaces (5 only):
1. **Pipeline** (Sales + Proposals + Follow-ups + Service Templates)
2. **Customers** (Clients + Sites + Contacts + Safety tab + Files)
3. **Schedule** (Tickets + calendar + dispatch)
4. **Team** (Staff + Timekeeping + Inspections + Messaging)
5. **Reports** (Sales + Ops + Quality + Payroll-ready)

Everything else goes in **Settings** (under avatar).

### Screen rules
- One **primary** action per screen (two max).
- Progressive disclosure: show summary first, details in drawers/modals.
- Default views are **lists + detail drawer** (fast browsing, low context switching).
- Use consistent status pills and timelines everywhere.
- Always show: “What’s next?” and “Who owns this?”

### Accessibility + speed
- Keyboard navigation everywhere.
- Avoid dense tables. Use compact cards and quick filters.
- Use optimistic UI updates, but never fake critical status (e.g., “Sent” before provider ack).

(Full UX rules: see `docs/02_UX_RULES_ADHD.md`.)

---

## 2) Architecture (practical + clean)

### Stack
- **Web:** Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui, Lucide
- **DB/Auth/Storage/Realtime:** Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Server logic:**
  - Supabase **Edge Functions** for webhooks + lightweight secure APIs
  - **Node runtime worker** for heavy tasks (PDF generation, follow-ups, integrations)
- **Queue:** Postgres-backed queue (Supabase Queues/pgmq) or Redis if you prefer managed later
- **Email:** SendGrid (event webhook: delivered/open/click/bounce)
- **Error tracking:** Sentry
- **CI/CD:** GitHub Actions + Vercel for web

### Repo layout (single repo, still feels like one product)
```
gleamops/
  apps/
    web/                 # Next.js app (the product)
    worker/              # Background jobs (Node runtime)
    mobile/              # Expo (Phase 2+)
  packages/
    ui/                  # design system components
    shared/              # types, zod schemas, constants
    domain/              # pure business logic (no framework imports)
    cleanflow/           # bid math engine (pure)
  supabase/
    migrations/
    functions/           # Edge functions (webhooks, secure RPC wrappers)
  docs/
```

### Why this split is worth it
Humans love “quick hacks.” Quick hacks are how software becomes an expensive haunted house.

Clean boundaries prevent:
- UI-calculates-money bugs
- duplicate logic in web + mobile
- security leaks when someone “just queries the DB directly”

---

## 3) Data Model: the rules that keep the app sane

### Core patterns (required)
- **Dual keys:** every business entity has:
  - `id` UUID (internal)
  - `*_code` TEXT UNIQUE (public/business)
- **Tenant isolation:** every table that stores tenant data has `tenant_id UUID NOT NULL`
- **Soft delete:** `archived_at`, `archived_by`, `archive_reason`
- **Optimistic locking:** `version_etag` (If-Match on update)
- **Audit events:** write to `audit_events` for critical actions
- **Lookups not enums:** `lookups` table for dropdowns/statuses
- **State machines:** `status_transitions` table prevents invalid status changes
- **Search:** `tsvector` + GIN for text, trigram for fuzzy match
- **Timezones:** tenant default timezone + per-contact override

### The v7.0 schema snippet
The provided v7 schema (clients/sites/tasks/services/service_tasks/sales_bids/etc.) is **canonical** for naming and relationships and must be implemented as a **subset** (same column names and semantics).

In practice, we extend it with standard columns (tenant_id, timestamps, soft delete, etag).  
See `docs/appendices/F_V7_SCHEMA_REFERENCE.sql`.

### Full table catalog
The full app requires ~86 tables across:
CRM, Service DNA, Sales, Ops, Scheduling, Execution, Timekeeping, Quality, Messaging, Inventory, Assets, Safety, System.

(See `docs/appendices/A_TABLE_CATALOG.md` and the spreadsheet in `/spreadsheets`.)

---

## 4) Security model (RLS-first, no exceptions)

### Roles (minimum)
- Owner/Admin
- Manager
- Supervisor
- Cleaner
- Inspector
- Sales (optional)

### Authorization model
- **RBAC** controls feature access.
- **Site scoping** controls which sites users can see.
- **Tenant isolation** enforced by RLS and `tenant_id`.

### RLS policy template (conceptual)
Every tenant table must include:
- SELECT: same tenant + site scope + role
- INSERT: same tenant
- UPDATE: same tenant + permission + If-Match
- DELETE: no hard deletes (soft delete only)

(See `docs/05_SECURITY_AND_PERMISSIONS.md`.)

---

## 5) Core workflows (the spine of the product)

### 5.1 Service DNA → Bid Wizard
- Admin defines tasks + services + service_tasks.
- Bid creation references a service template and copies default scope into bid version/scopes.
- Sales can override tasks per area.

### 5.2 Workloading + pricing (CleanFlow)
- Production rate matching uses **most-specific match first** (task+floor+building → task only).
- Workloading: minutes → hours/visit → monthly hours → cleaners needed.
- Pricing: true cost / (1 - margin) + overhead, plus strategy options.
- Store results server-side; never trust client math.

(See `docs/08_CLEANFLOW_ENGINE.md`.)

### 5.3 Proposals → Send → Track → Follow-ups
- PDF generation is async and deterministic.
- Proposal send is rate-limited and idempotent.
- Webhooks are signature-verified and idempotent.
- Follow-ups stop automatically on: WON/LOST, bounce/spam, manual stop.

(See `docs/10_PROPOSALS_EMAIL.md`.)

### 5.4 Won conversion (“Magic Button”)
Atomic transaction:
1) validate WON  
2) prevent double convert  
3) create service plan/contract  
4) create recurrence rule  
5) generate initial tickets  
6) link assets/inventory templates if selected  
7) emit conversion events + audit  

(See `docs/11_CONVERSION_MAGIC_BUTTON.md`.)

### 5.5 Ticket execution + timekeeping + quality
- Ticket checklist + photos
- Geofence check-in/out creates time entries and exceptions
- Offline inspections sync safely (versioned upsert)
- Inspection issues can generate follow-up tickets

(See `docs/12_TIMEKEEPING.md` and `docs/13_QUALITY_INSPECTIONS.md`.)

---

## 6) API standards (contract-first)

- **OpenAPI 3.1** is the contract source of truth.
- Errors use **Problem Details** (modern RFC 9457) with stable error codes.
- Every write endpoint supports:
  - `Idempotency-Key` for create/send jobs
  - `If-Match` for updates (etag)
- Webhooks:
  - signature verification (raw body)
  - idempotent event ingestion

(See `docs/06_API_CONTRACT.md`, `docs/07_ERROR_CATALOG.md`.)

---

## 7) Roadmap (Milestones A–O)

This is the build order. Each milestone closes only when acceptance criteria are met.

A. Foundation (Repo/CI/CD, Supabase, conventions)  
B. Auth + RBAC + Tenant + Audit  
C. Design system + App shell  
D. CRM core (clients/sites/contacts/files/timeline)  
E. Bidding MVP (wizard + cleanflow + deterministic pricing)  
F. Proposals send + tracking + follow-ups  
G. Won conversion → service plan + recurrence + tickets  
H. Scheduling + dispatch (calendar, drag/drop)  
I. Checklists  
J. Timekeeping (geofence + approvals)  
K. Inspections (offline-first sync)  
L. Messaging + escalation  
M. Dashboards + exports  
N. Integrations (optional QBO)  
O. Hardening + onboarding + imports

The complete milestone breakdown and acceptance criteria are in:
- `docs/03_ROADMAP_MILESTONES.md`
- `docs/04_DATA_MODEL.md`
- Spreadsheet: `spreadsheets/GleamOps_Master_Roadmap_vFinal2.xlsx`

---

## 8) How to build with Claude Code (terminal workflow)

You are using Claude Code through Mac Terminal. The safest pattern is:

1) One task per session  
2) Explicit acceptance criteria  
3) Generate code + tests together  
4) Run the commands locally  
5) Commit small, reviewable changes

See:
- `docs/18_AI_DEVELOPER_RUNBOOK.md`
- `docs/19_AI_AGENT_PROMPTS.md`
- `docs/20_VERIFICATION_CHECKLIST.md`

---

## 9) The one sentence that prevents weeks of rework

**If a dev decision breaks data continuity, weakens security, or adds UI clutter, it’s wrong.**
