# CLAUDE.md — GleamOps AI Development Context

> **Read this file first** every time you start a new session.

---

## TL;DR

GleamOps is a **B2B SaaS ERP for commercial cleaning** that replaces spreadsheets.

**Data continuity spine:** Service DNA → Bids → Proposals → Won → Contracts → Tickets → Time/QA/Inventory/Assets/Safety

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + RLS + Auth + Storage + Realtime)
- **Math Engine**: CleanFlow (packages/cleanflow) — pure functions, no DB calls
- **Deploy**: Vercel (web) + worker TBD

---

## Non-Negotiables

1. **Data continuity wins.** Services → Bids → Proposals → Won → Contracts → Tickets.
2. **Security (RLS/tenant isolation) wins.** Every tenant table has `tenant_id` + RLS.
3. **Apple-simple UX wins.** One primary action per screen, progressive disclosure.
4. **Work Ticket is the nucleus.** Everything attaches to tickets.
5. **No invoicing/payments/taxes.** Ever.
6. **Deterministic math.** CleanFlow runs server-side, explainable pricing.
7. **Soft delete everywhere.** `archived_at`, `archived_by`, `archive_reason`.
8. **Optimistic locking.** `version_etag` + If-Match on updates.
9. **Problem Details errors.** RFC 9457 style, stable error codes.
10. **No creative architecture.** Follow the docs exactly.

---

## GleamOps UI Refresh (Backend Locked)

### Non-negotiables
- DO NOT change Supabase schema, migrations, RLS policies, edge functions, storage rules, or auth flows.
- DO NOT rename tables/columns or modify database queries beyond UI needs (e.g. selecting extra fields for display is ok).
- This is a UI/UX + design system migration only.

### Goal
Make GleamOps visually and behaviorally match the older "Anderson Cleaning App" UI/UX style, with improvements:
- Old token system: semantic CSS variables (shadcn-like HSL tokens).
- Old geometry: rounded-lg default, rounded-xl for overlays.
- Old elevation: shadow-sm cards, shadow-xl/2xl overlays.
- Old interactions: transition: all 0.2s ease; clear active states.
- Keep GleamOps component architecture, routing, and backend.

### Visual targets (Old App)
- Primary: Blue-600 (#3b82f6) and hover Blue-700 (#2563eb)
- Dark mode: dark blue-gray (NOT true black by default)
- Status badges: 7 semantic colors (green/red/yellow/blue/orange/purple/gray) with border+bg and optional dot
- Card anatomy: Card/Header/Title/Description/Content; optional hover shadow
- CollapsibleCard: persisted collapse state in localStorage; keyboard accessible
- ChipTabs: pill tabs w active blue fill + counts; overflow scroll

### Implementation approach (high level)
1) Token layer + aliasing to avoid breaking existing code
2) Reskin packages/ui components to match old system
3) Update layout shell (sidebar/header) for old feel
4) Page-by-page cleanup to remove hard-coded styling in pages
5) Add optional True Black mode toggle (keep off by default)

### Definition of done
- App builds and runs locally
- Lint/typecheck pass
- Visual parity for: Login, Dashboard, Pipeline/CRM list pages, SlideOver + forms
- No backend changes

---

## Quick Commands

```bash
pnpm dev             # Start web dev server
pnpm build           # Production build
pnpm typecheck       # TypeScript check
pnpm test            # Run tests
pnpm db:reset        # Reset local Supabase DB
```

---

## Project Root

```
/Users/andersongomes/claude_sandbox/gleamops_dev_pack/
```

---

## Architecture

```
gleamops_dev_pack/
├── apps/
│   ├── web/                    # Next.js 15 (the product)
│   │   └── src/app/
│   │       ├── (auth)/login/   # Login page
│   │       └── (dashboard)/    # Nav spaces
│   │           ├── home/       # Dashboard
│   │           ├── pipeline/   # Prospects, Bids, Proposals, Follow-ups
│   │           ├── crm/        # Clients, Sites, Contacts
│   │           ├── operations/ # Calendar, Dispatch, Tickets
│   │           ├── workforce/  # Staff, Timekeeping, Inspections
│   │           ├── inventory/  # Supplies, Kits, Counts, Orders
│   │           ├── assets/     # Equipment, Keys, Vehicles, Maintenance
│   │           ├── vendors/    # Subcontractors, Supply Vendors
│   │           ├── safety/     # Safety module
│   │           └── admin/      # Settings, Lookups
│   ├── worker/                 # Background jobs (PDFs, follow-ups)
│   └── mobile/                 # Expo React Native (future)
├── packages/
│   ├── shared/                 # Types, Zod schemas, constants, error catalog
│   ├── domain/                 # Pure business rules (status machine, permissions)
│   ├── cleanflow/              # Bid math engine (pure functions)
│   └── ui/                     # Design system components
├── supabase/
│   ├── migrations/             # SQL migration files (ordered)
│   └── functions/              # Edge Functions (Deno)
├── docs/                       # Dev pack documentation (23+ files)
├── openapi/                    # OpenAPI 3.1 contract
└── CLAUDE.md                   # This file
```

---

## Database Patterns

### Dual-key pattern
Every entity has `id UUID` (internal) + `*_code TEXT` (human-readable, unique).

### Standard columns (every business table)
- `tenant_id UUID NOT NULL`
- `created_at`, `updated_at` (TIMESTAMPTZ)
- `archived_at`, `archived_by`, `archive_reason` (soft delete)
- `version_etag UUID` (optimistic locking)

### Entity code formats
```
CLI-1001   (client)       SIT-2050   (site)
TSK-001    (task)         SER-0001   (service)
BID-000123 (bid)          PRP-000456 (proposal)
JOB-2026-A (job)          TKT-XXXX   (ticket)
PRO-XXXX   (prospect)     OPP-XXXX   (opportunity)
STF-XXXX   (staff)        CON-XXXX   (contact)
```

### Helper functions (SQL)
- `current_tenant_id()` — from JWT claims
- `has_role(user_id, role_code)` — check role in tenant
- `has_any_role(user_id, roles[])` — check multiple roles
- `user_can_access_site(user_id, site_id)` — site scoping
- `next_code(tenant_id, prefix, padding)` — generate entity codes
- `validate_status_transition(tenant_id, entity, from, to)` — state machine

---

## Roles (RBAC)
OWNER_ADMIN, MANAGER, SUPERVISOR, CLEANER, INSPECTOR, SALES

RBAC = what you can do. Site scoping = where you can do it.

---

## Navigation (10 spaces)
1. **Home** — Dashboard
2. **Pipeline** — Prospects, Bids, Proposals, Follow-ups
3. **CRM** — Clients, Sites, Contacts
4. **Operations** — Calendar, Dispatch, Tickets
5. **Workforce** — Staff, Timekeeping, Inspections
6. **Inventory** — Supplies, Kits, Site Assignments, Counts, Orders
7. **Assets** — Equipment, Keys, Vehicles, Maintenance
8. **Vendors** — Subcontractors, Supply Vendors
9. **Safety** — Safety module
10. **Admin** — Settings, Lookups

---

## Key Source Docs (in docs/)

| Doc | Purpose |
|-----|---------|
| `00_MASTER_DEV_PLAN.md` | Single source of truth roadmap |
| `04_DATA_MODEL.md` | Table patterns, dual keys, standard columns |
| `05_SECURITY_RLS.md` | RLS policies, tenant isolation, site scoping |
| `07_ERROR_CATALOG.md` | All error codes (Problem Details) |
| `08_WORKFLOWS.md` | Sequence diagrams for critical flows |
| `09_CLEANFLOW_ENGINE.md` | Bid math: rates → workload → pricing |
| `10_PROPOSALS_EMAIL.md` | PDF gen, send, tracking, follow-ups |
| `11_OPERATIONS_TICKETS.md` | Service plans, recurrence, ticket lifecycle |
| `appendices/A_TABLE_CATALOG.md` | Full ~86 table list |
| `appendices/F_V7_SCHEMA_REFERENCE.sql` | Canonical v7.0 schema |

---

## Milestones (Build Order)

| MS | What | Status |
|----|------|--------|
| A | Foundation (repo, Supabase, CI, shell) | DONE |
| B | Auth + RBAC + Tenant isolation | DONE |
| C | Design system + App shell polish | In Progress (UI Refresh) |
| D | CRM core (clients, sites, contacts) | |
| E | Bidding MVP (wizard + CleanFlow) | |
| F | Proposals send + tracking + follow-ups | |
| G | Won conversion → contracts → tickets | |
| H+ | Schedule, Checklists, Timekeeping, etc. | Future |

---

## Shared Package Exports (@gleamops/shared)

### Types
All database interfaces (StandardColumns, Tenant, Client, Site, SalesBid, WorkTicket, etc.)
App types (UserRole, NavSpace, ProblemDetails, StatusColor)

### Constants
NAV_ITEMS, PROSPECT_STATUS_COLORS, BID_STATUS_COLORS, PROPOSAL_STATUS_COLORS,
TICKET_STATUS_COLORS, ROLES, FREQUENCIES, DIFFICULTY_MULTIPLIERS, WEEKS_PER_MONTH

### Errors
createProblemDetails(), PROSPECT_001..003, BID_001..004, PROPOSAL_001..005,
CONVERT_001..003, TICKET_001..002, AUTH_001..003, SYS_001

### Validation
clientSchema, siteSchema, contactSchema, taskSchema, serviceSchema,
prospectSchema, bidSchema, convertBidSchema, loginSchema

---

## Migration Files (supabase/migrations/)

| File | Tables/Objects |
|------|---------------|
| 00001_foundation.sql | tenants, tenant_memberships, lookups, status_transitions, system_sequences, audit_events, notifications, files |
| 00002_helper_functions.sql | current_tenant_id(), has_role(), has_any_role(), user_can_access_site(), next_code(), validate_status_transition() |
| 00003_shared_triggers.sql | set_updated_at(), set_version_etag() + triggers on foundation tables |
| 00004_rls_foundation.sql | RLS policies for all foundation tables |
| 00005_user_site_assignments.sql | user_site_assignments table + RLS |
| 00006_lookup_seeds.sql | Seed data for all lookup categories |
| 00007_status_transition_seeds.sql | Legal state transitions for bids, proposals, tickets, prospects |
| 00008_custom_access_token_hook.sql | JWT claims hook: injects tenant_id + role from memberships |
| 00009_audit_helper.sql | write_audit_event() SECURITY DEFINER + audit_status_change() trigger |
| 00010_seed_test_tenant.sql | Test tenant TNT-0001, auto-assign trigger, isolation test tenant TNT-0002 |

---

## Auth Architecture (Milestone B)

### Flow
1. User signs in via Supabase Auth (email/password or OAuth)
2. `custom_access_token_hook` fires on token refresh → reads `tenant_memberships` → injects `tenant_id` + `role` into JWT claims
3. `current_tenant_id()` SQL function reads `tenant_id` from JWT → all RLS policies use this
4. Next.js middleware (`src/middleware.ts`) checks auth on every request → redirects to `/login` if not authenticated
5. `useAuth()` hook on client reads JWT claims → provides `user`, `tenantId`, `role` to React components
6. `useRole()` hook wraps `canAccess()` from `@gleamops/domain` for permission checks

### Test Tenant Setup
- Tenant A: `TNT-0001` (id: `a0000000-...0001`) — "Anderson Cleaning Services"
- Tenant B: `TNT-0002` (id: `b0000000-...0002`) — "Other Cleaning Co" (isolation test)
- Auto-assign trigger: every new auth.users signup → OWNER_ADMIN on TNT-0001

### Hooks
- `useAuth()` — user, tenantId, role, loading, signOut
- `useRole()` — can(permission), isAtLeast(role), isAdmin, isManager
