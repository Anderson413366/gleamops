# GleamOps

**The ERP that replaces spreadsheets for commercial cleaning companies.**

One platform for clients, scheduling, bidding, workforce, inventory, equipment, safety, and reporting.

**Production:** [gleamops.vercel.app](https://gleamops.vercel.app) | **Repo:** [github.com/Anderson413366/gleamops](https://github.com/Anderson413366/gleamops)

---

## Quick Start

```bash
git clone https://github.com/Anderson413366/gleamops.git
cd gleamops
pnpm install
cp .env.example apps/web/.env.local   # fill in Supabase keys
pnpm dev                               # http://localhost:3000
```

**Requirements:** Node.js 20+, pnpm 9+, Supabase CLI (for local DB)

---

## What GleamOps Does

```
Sales Pipeline ──> Won Bid ──> Client + Site + Contract ──> Work Tickets ──> Clock In/Out
     |                                                            |              |
  CleanFlow                                                   Schedule      Timesheets
  Math Engine                                                  Boards        Payroll
```

**13 modules** cover the full lifecycle of a cleaning business:

| Module | Route | Purpose |
|--------|-------|---------|
| Home | `/home` | Owner dashboard with KPI widgets |
| Schedule | `/schedule` | Employee grid, work orders, calendar, planning boards |
| Jobs | `/jobs` | Service plans, tickets, inspections, time, routes, checklists |
| Clients | `/clients` | Client companies, sites, contacts, requests, partners |
| Pipeline | `/pipeline` | Prospects, opportunities, bids (CleanFlow math), proposals |
| Catalog | `/catalog` | Task library, service definitions, scope templates |
| Team | `/team` | Staff, positions, attendance, timesheets, payroll, HR |
| Inventory | `/inventory` | Supplies, kits, site assignments, counts, orders, warehouse |
| Equipment | `/equipment` | Equipment, keys, vehicles, maintenance |
| Safety | `/safety` | Certifications, training, incidents |
| Reports | `/reports` | Ops, sales, financial, quality, workforce, inventory dashboards |
| Settings | `/settings` | Lookups, geofences, rules, data hub, sequences, import |
| Shifts & Time | `/shifts-time` | Clock in/out, timesheets (role-gated for field staff) |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, React 19, Turbopack) |
| Language | TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 4 — semantic HSL tokens, 3 themes (light/dark/OLED) |
| Database | Supabase PostgreSQL — 220+ tables, RLS, Auth, Storage, Realtime |
| Monorepo | Turborepo v2 + pnpm workspaces (7 packages) |
| Math Engine | CleanFlow — pure TypeScript bid calculator, zero DB deps |
| Deploy | Vercel — auto-deploy on push to `main` |
| Email | SendGrid — proposal delivery + webhook tracking |
| i18n | English, Spanish, Portuguese (BR) |

---

## Monorepo Structure

```
gleamops/
├── apps/
│   ├── web/                  Next.js 15 — the product
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/          Login page
│   │       │   ├── (dashboard)/     13 module routes + 30 detail pages
│   │       │   └── api/             108 API route handlers
│   │       ├── components/
│   │       │   ├── forms/           38 entity form components
│   │       │   ├── layout/          Sidebar (hierarchical NAV_TREE), Header, AppShell
│   │       │   ├── detail/          ProfileCompletenessCard, StatusToggleDialog
│   │       │   ├── directory/       EntityAvatar, EntityCard (20 card grids)
│   │       │   └── links/           EntityLink (cross-entity navigation)
│   │       ├── hooks/               21 custom hooks
│   │       ├── lib/                 Supabase clients, auth guard, utils
│   │       └── modules/             28 domain service modules
│   ├── worker/                Background jobs (PDF gen, follow-ups)
│   └── mobile/                Expo React Native (in development)
│
├── packages/
│   ├── shared/                Types, Zod schemas, NAV_TREE, constants, feature flags
│   ├── domain/                Pure business rules — RBAC, status machine
│   ├── cleanflow/             Bid math engine — production rates, workload, pricing
│   └── ui/                    Design system — 27 components
│
├── supabase/
│   └── migrations/            134 SQL files (19,682 lines)
│
├── docs/                      21 reference docs + full instruction manual
├── openapi/                   OpenAPI 3.1 contract
├── CLAUDE.md                  AI development context
└── README.md                  This file
```

---

## Code Architecture

### Request Flow (API Routes)

All 108 API routes follow the **thin delegate** pattern — max ~40 lines per handler:

```
HTTP Request
  → Next.js Route Handler (auth check → validate input)
    → Service Layer (business logic, orchestration)
      → Repository Layer (Supabase queries via PostgREST)
        → PostgreSQL (RLS enforces tenant isolation)
```

28 domain modules in `src/modules/` each follow the same shape:
- `{domain}.service.ts` — Business logic, returns `ServiceResult<T>`
- `{domain}.repository.ts` — Supabase queries
- `index.ts` — Barrel export

### Frontend Architecture

```
Page (app/(dashboard)/module/page.tsx)
  → ChipTabs + SearchInput + useSyncedTab
    → Table Component (fetch → filter → sort → paginate → render)
      → Detail Page ([id]/page.tsx — back link, avatar, stats, sections, activity)
        → Form (SlideOver + useForm + Zod schema + optimistic locking)
```

**Key patterns:**
- **Tables** → Row click navigates to detail page (never modals for read views)
- **Detail pages** → Back link + breadcrumb + avatar + ProfileCompleteness + stats + `<dl>` sections + ActivityHistory
- **Forms** → SlideOver drawer + Zod validation + `version_etag` optimistic locking
- **Card grids** → 20 entity card grids with `EntityCard` + `EntityAvatar`

### Auth Flow

```
User signs in → Supabase Auth
  → custom_access_token_hook injects tenant_id + role into JWT
    → current_tenant_id() SQL function reads JWT
      → All RLS policies filter by tenant_id
        → useAuth() hook provides { user, tenantId, role } to React
          → useRole() wraps canAccess() for permission checks
```

**6 roles:** OWNER_ADMIN, MANAGER, SUPERVISOR, CLEANER, INSPECTOR, SALES

---

## Supabase Architecture

### Database Design

- **220+ tables** across 18 functional domains
- **134 migrations** (19,682 lines SQL)
- **Row-Level Security** on every table — `tenant_id = current_tenant_id()`
- **Soft delete only** — `archived_at` column, `prevent_hard_delete` trigger blocks DELETE
- **Optimistic locking** — `version_etag` UUID auto-rolled on every write
- **Dual-key pattern** — `id UUID` (internal) + `*_code TEXT` (human-readable: CLI-1001, STF-1042, TKT-0847)

### Standard Columns (every business table)

```sql
id              UUID DEFAULT gen_random_uuid() PRIMARY KEY
tenant_id       UUID NOT NULL REFERENCES tenants(id)
*_code          TEXT UNIQUE           -- human-readable code
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
archived_at     TIMESTAMPTZ           -- NULL = active
archived_by     UUID
archive_reason  TEXT
version_etag    UUID DEFAULT gen_random_uuid()
```

### Standard Triggers (every business table)

| Trigger | Purpose |
|---------|---------|
| `set_updated_at` | Auto-sets `updated_at = now()` on UPDATE |
| `set_version_etag` | Auto-rolls `version_etag` on INSERT/UPDATE |
| `prevent_hard_delete` | Blocks DELETE — forces soft-delete via `archived_at` |

### Key SQL Functions

| Function | Purpose |
|----------|---------|
| `current_tenant_id()` | Reads tenant_id from JWT claims |
| `has_role(user_id, role_code)` | Check role in tenant |
| `has_any_role(user_id, roles[])` | Check multiple roles |
| `next_code(tenant_id, prefix, padding)` | Generate entity codes (CLI-1001, etc.) |
| `validate_status_transition(tenant_id, entity, from, to)` | State machine validation |
| `enforce_status_transition()` | Trigger: blocks invalid status changes on 6 tables |
| `cascade_archive()` | Trigger: propagates soft-delete to child entities |
| `auto_archive_on_terminal_status()` | Trigger: archives on CANCELED/TERMINATED |
| `normalize_name_fields()` | Trigger: trims whitespace on name columns |
| `run_data_hygiene_scan(p_tenant_id)` | RPC: automated data quality scan |
| `fn_generate_tickets_for_period(p_period_id)` | RPC: generate work tickets from schedule rules |

### Operational Views

| View | Purpose |
|------|---------|
| `v_sites_full` | Joined site + access details + compliance |
| `v_active_sites` | Active sites only |
| `v_staff_roster` | Active staff with position info |
| `v_upcoming_tickets` | Tickets in the next 7 days |

### Storage Buckets

- `time-verification-selfies` — Clock in/out selfie evidence
- Proposal PDFs, photos, attachments

---

## Design System

`@gleamops/ui` — 27 components with semantic HSL tokens.

**3 themes:** Light, Dark, True Black (OLED)

**Module accent colors:** Each of the 13 modules has a unique accent applied via `--module-accent` CSS variable (Harbor Blue for Home, Sunset Orange for Schedule, Signal Red for Jobs, etc.)

**Neuro-optimized UX** (designed for ADHD, dyslexia, anxiety):
- Progressive disclosure — table rows → detail pages (never modals for read)
- One primary CTA per page
- Scannable `<dl>` key-value layouts
- Predictable "Back to [Module]" links + breadcrumbs
- Frosted glass header (`backdrop-blur-md`)
- Status filter chips default to ACTIVE

**Accessibility features:** Dyslexia font toggle, reading ruler, reduced motion, high contrast mode, large text, focus mode

---

## Feature Flags

17 env-var feature flags (`NEXT_PUBLIC_FF_*`) + 18 DB-backed domain flags.

**Enabled by default:** `v2_navigation`, `schedule_liberation`, `unified_sales`, `standalone_calculator`

---

## Scripts

| Command | What |
|---------|------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build (all packages) |
| `pnpm typecheck` | TypeScript check (all 7 packages) |
| `pnpm lint` | ESLint |
| `pnpm test` | Run tests |
| `pnpm db:start` | Start local Supabase |
| `pnpm db:reset` | Reset local DB |
| `pnpm db:migrate` | Run pending migrations |

---

## Deployment

- Push to `main` triggers Vercel auto-deploy
- Vercel Cron: `/api/cron/inventory-count-reminders` runs daily at 13:00 UTC
- Quality gates before commit: `pnpm typecheck && pnpm build`

---

## Documentation

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` | AI development context — architecture, patterns, conventions |
| `docs/manual/` | Full instruction manual — 7 foundation docs + 15 module guides + 15 references |
| `docs/schema-contract.md` | Table naming, standard columns, entity codes |
| `docs/api-contract.md` | REST conventions, Problem Details (RFC 9457) |
| `docs/cleanflow-engine.md` | Bid math: production rates → workload → pricing |
| `docs/clickability.md` | 39-entity routing table, EntityLink rules |
| `docs/feature-flags.md` | Feature flag mechanics (17 domains) |
| `docs/neuroinclusive-ux.md` | 12 ADHD/Dyslexia/Anxiety UX rules |

---

## Milestones

| MS | What | Status |
|----|------|--------|
| A–H | Foundation through Safety/Timekeeping | Done |
| P1–P8 | Monday.com replacement (boards, scheduling, shifts, routes, complaints, field reports, night bridge, customer portal) | Done |
| NS | Project North Star — hierarchical nav, /catalog, tab consolidation | Done |
| QA | Full QA cycle — 24 issues across 2 rounds | Done |
| DQ | Data Quality — 14 sprints: hygiene, constraints, triggers, status enforcement, cascade archive, views | Done |
| ETA | Empty Tables Audit — ANALYZE, triggers, feature_flags | Done |

---

## License

Private. All rights reserved.
