# GleamOps

**B2B SaaS ERP for commercial cleaning companies.** Replaces spreadsheets with a unified platform covering CRM, bidding, operations, workforce, inventory, assets, safety, and scheduling.

**Production:** [gleamops.vercel.app](https://gleamops.vercel.app) | **Repo:** [github.com/Anderson413366/gleamops](https://github.com/Anderson413366/gleamops)

**Program status (2026-02-28):** All milestones A–H complete. Monday.com replacement phases P1–P8 done. Project North Star navigation overhaul shipped. Full QA cycle completed (24 issues resolved across 2 rounds). PT-BR internationalization backfill complete.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4 (semantic HSL tokens, dark/light mode) |
| **Database** | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) |
| **Monorepo** | Turborepo v2 + pnpm 9.15.9 workspaces |
| **Math Engine** | CleanFlow (pure TypeScript, zero DB deps) |
| **Deploy** | Vercel (auto-deploy on push to `main`) |
| **API Contract** | OpenAPI 3.1 + RFC 9457 Problem Details |
| **i18n** | English, Spanish, Portuguese (BR) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI (for local development)

### Setup

```bash
# Clone
git clone https://github.com/Anderson413366/gleamops.git
cd gleamops

# Install dependencies
pnpm install

# Set up environment
cp .env.example apps/web/.env.local
# Fill in your Supabase URL, keys, and tenant ID

# Start local Supabase
pnpm db:start

# Start development
pnpm dev
```

> **Note:** `supabase/config.toml` sets `[analytics].enabled = false` to avoid the known Colima docker socket mount failure during `supabase start`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web dev server (Turbopack) |
| `pnpm build` | Production build (all packages) |
| `pnpm build:web` | Build web app only |
| `pnpm typecheck` | TypeScript check (all 7 packages) |
| `pnpm test` | Run tests |
| `pnpm lint` | ESLint |
| `pnpm db:start` | Start local Supabase services |
| `pnpm db:stop` | Stop local Supabase services |
| `pnpm db:reset` | Reset local Supabase DB |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm audit:schema-parity` | Audit DB schema vs TypeScript types |
| `pnpm audit:ui-fields` | Audit UI field usage coverage |

---

## Monorepo Structure

```
gleamops_dev_pack/
├── apps/
│   ├── web/             → Next.js 15 web application (dashboard + API route handlers)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/        → Login page
│   │       │   ├── (dashboard)/   → 20 route directories + 28 detail pages
│   │       │   └── api/           → 108 route handlers (thin delegates → modules)
│   │       ├── components/
│   │       │   ├── forms/         → 42 entity form components
│   │       │   ├── layout/        → AppShell, Header, Sidebar (hierarchical nav)
│   │       │   ├── activity/      → ActivityHistorySection (audit trail)
│   │       │   ├── detail/        → ProfileCompletenessCard, StatusToggleDialog
│   │       │   ├── directory/     → EntityAvatar, EntityCard
│   │       │   └── links/         → EntityLink (cross-entity navigation)
│   │       ├── hooks/             → 22 custom hooks
│   │       ├── lib/               → Supabase clients, auth guard, audit, utils
│   │       └── modules/           → 28 domain service modules
│   ├── worker/          → Background jobs (PDF generation, follow-ups)
│   └── mobile/          → Expo React Native (production setup in progress)
├── packages/
│   ├── shared/          → Types, Zod schemas, constants, NAV_TREE, error catalog
│   ├── domain/          → Pure business rules (RBAC, status machine)
│   ├── cleanflow/       → Bid math engine (pure functions, no DB deps)
│   └── ui/              → Design system (30 components)
├── supabase/
│   ├── migrations/      → 113 SQL migration files (17,559 lines)
│   └── functions/       → Edge Functions (Deno)
├── openapi/             → OpenAPI 3.1 contract
├── docs/                → Numbered docs 00–27 + appendices
├── CLAUDE.md            → AI development context (patterns, conventions, code examples)
└── README.md            → This file
```

---

## Application Modules

GleamOps is organized into 13 navigation modules rendered in a **hierarchical sidebar** with collapsible children (controlled by the `v2_navigation` feature flag). The sidebar uses `NAV_TREE` defined in `packages/shared/src/constants/index.ts`.

### Canonical Modules (in sidebar)

| # | Module | Route | Tabs |
|---|--------|-------|------|
| 1 | **Home** | `/home` | Owner dashboard with KPI widgets, alerts, activity feed |
| 2 | **Schedule** | `/schedule` | Recurring, Work Orders, Calendar, Planning, Boards (Monday.com-style) |
| 3 | **Jobs** | `/jobs` | Service Plans, Job Log (tickets), Inspections, Time, Routes, Checklists, Forms |
| 4 | **Clients** | `/clients` | Clients, Sites, Contacts, Requests, Partners |
| 5 | **Pipeline** | `/pipeline` | Prospects, Opportunities, Bids (CleanFlow math), Proposals |
| 6 | **Catalog** | `/catalog` | Tasks, Services, Mapping, Scope Library |
| 7 | **Team** | `/team` | Staff, Positions, Attendance, Timesheets, Payroll, HR, Microfiber, Subcontractors |
| 8 | **Inventory** | `/inventory` | Supplies, Kits, Site Assignments, Counts, Orders, Vendors |
| 9 | **Equipment** | `/equipment` | Equipment, Assignments, Keys, Vehicles, Maintenance |
| 10 | **Safety** | `/safety` | Certifications, Training, Incidents, Calendar |
| 11 | **Reports** | `/reports` | Ops, Sales, Financial, Quality, Workforce, Inventory dashboards |
| 12 | **Settings** | `/settings` | General, Lookups, Geofences, Rules, Data Hub, Sequences, Import |
| 13 | **Shifts & Time** | `/shifts-time` | Shifts, Timesheets, Clock In/Out (role-gated) |

### Additional Routes

| Route | Purpose |
|-------|---------|
| `/operations` | Legacy operations hub — hosts complaints, periodic tasks, task-catalog, alerts, night-bridge |
| `/workforce` | Legacy workforce hub — hosts field reports |
| `/vendors` | Subcontractor directory, supply vendor management, vendor directory |
| `/admin` | System admin — lookups, position types, schedule settings, portal settings |
| `/crm` | Legacy CRM — redirects to `/clients` |
| `/services` | Legacy services — alias for `/catalog` |
| `/assets` | Legacy assets — alias for `/equipment` |

### Key Features

- **28 detail pages** — Every major entity has a dedicated page with profile completeness tracking, stats, sections, edit, and deactivate
- **42 form components** — Create and edit forms with Zod validation, optimistic locking (`version_etag`), and wizard mode for complex entities
- **20 card grid views** — Toggle between list (table) and card layouts on every table
- **Status filter chips** — Quick-filter by status with count badges (default to active status, "all" at end)
- **CSV export** — Export filtered data from any table with customizable column selection
- **Dark mode** — Theme toggle with system preference detection
- **Density toggle** — Comfortable/compact table density
- **Real-time updates** — Supabase Realtime subscriptions on dashboards
- **Global search** — Cmd+K command palette
- **RBAC** — Role-based access control (Owner, Manager, Supervisor, Cleaner, Inspector, Sales)
- **Multi-tenant** — Full tenant isolation via PostgreSQL RLS
- **Profile completeness** — Every detail page tracks field completeness with a visual progress card
- **Activity history** — Audit trail on every detail page via `ActivityHistorySection`
- **Cross-entity links** — `EntityLink` component enables click-through navigation between related entities
- **Neuro-optimized UX** — Designed for ADHD (progressive disclosure), dyslexia (scannable layouts), and anxiety (predictable navigation)
- **i18n** — English, Spanish, and Portuguese (BR) with `useLocale()` hook

---

## Architecture

### Data Continuity Spine

The core data flow that powers the platform:

```
Service DNA → Bids → Proposals → Won → Contracts → Work Tickets → Time/QA/Inventory/Assets/Safety
```

Every stage links to the next. The CleanFlow engine handles all bid math — production rates, workload calculations, and pricing — with no database dependencies.

### API Route Architecture

API route handlers follow the **thin delegate** pattern:

```
Route Handler (auth → validate → service → respond)
       ↓
Service Layer (business logic, orchestration)
       ↓
Repository Layer (Supabase queries, data access)
```

28 domain modules in `src/modules/` cover: complaints, counts, cron, field-reports, fleet, inventory, inventory-orders, load-sheet, messages, night-bridge, owner-dashboard, periodic-tasks, proposals, proposals-pdf, public-counts, public-portal, public-proposals, public-work-orders, route-templates, schedule, self-service, shifts-time, sites, timekeeping, warehouse, webhooks, and workforce-hr.

### Auth Flow

1. User signs in via Supabase Auth (email/password or OAuth)
2. `custom_access_token_hook` fires — injects `tenant_id` + `role` into JWT
3. `current_tenant_id()` SQL function reads JWT — all RLS policies use this
4. Next.js middleware checks auth — redirects to `/login` if unauthenticated
5. `useAuth()` hook provides `user`, `tenantId`, `role` to React components
6. `useRole()` wraps `canAccess()` from `@gleamops/domain` for permission checks

### Roles (RBAC)

`OWNER_ADMIN` · `MANAGER` · `SUPERVISOR` · `CLEANER` · `INSPECTOR` · `SALES`

RBAC controls what you can do. Site scoping controls where you can do it.

---

## Database

- **113 migration files** totaling 17,559 lines of SQL
- **Standard columns** on every table: `tenant_id`, `created_at`, `updated_at`, `archived_at`, `version_etag`
- **Soft delete** via `archived_at` (no hard deletes)
- **Optimistic locking** via `version_etag` UUID
- **Dual-key pattern** — `id UUID` (internal) + `*_code TEXT` (human-readable)
- **RLS policies** on every table with tenant isolation
- **SQL helpers** — `current_tenant_id()`, `has_role()`, `next_code()`, `validate_status_transition()`
- **Cron job** — Inventory count reminders at 13:00 UTC daily via Vercel Cron

### Entity Code Formats

```
CLI-1001  (client)      SIT-2050  (site)       TSK-001   (task)
SER-0001  (service)     BID-000123 (bid)       PRP-000456 (proposal)
JOB-2026-A (job)        TKT-XXXX  (ticket)     PRO-XXXX  (prospect)
OPP-XXXX  (opportunity) STF-XXXX  (staff)      CON-XXXX  (contact)
```

---

## Design System

The `@gleamops/ui` package provides 30 reusable components built with:

- **Semantic HSL tokens** — CSS variables for light/dark mode
- **7-color badge system** — green, red, yellow, blue, orange, purple, gray
- **Module accent colors** — Each of 13 modules has a unique accent color (Harbor Blue, Sunset Orange, Signal Red, etc.)
- **Consistent geometry** — `rounded-lg` cards, `rounded-xl` overlays, `rounded-full` avatars
- **Frosted glass header** — `backdrop-blur-md` for depth
- **Inter font** — Clean, readable typography

### Neuro-Optimized UX

Designed for ADHD, dyslexia, and anxiety accessibility:

- **Progressive disclosure** — Table rows navigate to full detail pages (not modals)
- **Scannable layouts** — `<dl>` key-value pairs with flex spacing
- **Predictable navigation** — "← Back to [Module]" links, breadcrumbs, dual close mechanisms (X + Cancel)
- **One CTA per page** — Reduces decision fatigue
- **Status filter chips** — Default to active status with count badges

### Component Catalog (30 components)

Archive Dialog, Badge, Button, Card, ChipTabs, Collapsible Card, Command Palette (Cmd+K), Confirm Dialog, Data Table, Density Toggle, Empty State, Export Button, File Dropzone, Form Section, Form Wizard, Input, Pagination, Search Input, Select, Skeleton, Slide-Over, Stat Card, Status Pill, Table Row Visuals, Textarea, Tooltip, Utils (cn), View Toggle.

---

## Detail Pages (28 dynamic routes)

Every detail page follows a consistent layout pattern:

1. **Back link** — "← Back to [Module]" using canonical routes
2. **Breadcrumb** — Home › Module › Entity Code
3. **Header card** — Avatar circle + name + code badge + status badges + Edit button
4. **Profile completeness** — Visual progress card tracking field completion
5. **Stat cards** — 2-4 key metrics in a responsive grid
6. **Section cards** — Key-value pairs in `<dl>` elements, organized in 2-column grid
7. **Activity history** — Audit trail via `ActivityHistorySection`
8. **Metadata footer** — Created/Updated timestamps
9. **Forms** — Edit via `SlideOver` with Zod validation and optimistic locking

| Entity | Route | Param |
|--------|-------|-------|
| Client | `/clients/[id]` | client_code |
| Site | `/clients/sites/[id]` | site_code |
| Contact | `/clients/contacts/[code]` | contact_code |
| Prospect | `/pipeline/prospects/[id]` | prospect_code |
| Opportunity | `/pipeline/opportunities/[id]` | opportunity_code |
| Bid | `/pipeline/bids/[id]` | bid_code |
| Proposal | `/pipeline/proposals/[id]` | proposal_code |
| Job (Service Plan) | `/operations/jobs/[id]` | job_code |
| Ticket | `/operations/tickets/[id]` | ticket_code |
| Complaint | `/operations/complaints/[code]` | complaint_code |
| Periodic Task | `/operations/periodic/[code]` | periodic_code |
| Task Catalog | `/operations/task-catalog/[id]` | task_code |
| Staff | `/team/staff/[code]` | staff_code |
| Employee | `/team/employees/[code]` | staff_code |
| Field Report | `/workforce/field-reports/[code]` | report_code |
| Supply | `/inventory/supplies/[id]` | code |
| Inventory Count | `/inventory/counts/[id]` | count_code |
| Equipment | `/assets/equipment/[code]` | equipment_code |
| Vehicle | `/assets/vehicles/[id]` | vehicle_code |
| Key | `/assets/keys/[id]` | key_code |
| Task | `/services/tasks/[id]` | task_code |
| Task (admin) | `/admin/services/tasks/[id]` | task_code |
| Subcontractor | `/vendors/subcontractors/[code]` | subcontractor_code |
| Supply Vendor | `/vendors/supply-vendors/[slug]` | slug |

---

## Environment Variables

```bash
# Required — Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SINGLE_TENANT_ID=your-tenant-uuid
NEXT_PUBLIC_SINGLE_TENANT_ID=your-tenant-uuid

# Required — App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — SendGrid (proposal emails)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=proposals@gleamops.com
SENDGRID_FROM_NAME=GleamOps Proposals
SENDGRID_WEBHOOK_VERIFICATION_KEY=

# Optional — Monitoring
NEXT_PUBLIC_SENTRY_DSN=

# Feature Flags (set to "enabled" to activate)
NEXT_PUBLIC_FF_SCHEMA_PARITY=disabled
NEXT_PUBLIC_FF_BID_SPECIALIZATION=disabled
NEXT_PUBLIC_FF_PROPOSAL_STUDIO_V2=disabled
NEXT_PUBLIC_FF_OPS_GEOFENCE_AUTO=disabled
NEXT_PUBLIC_FF_MESSAGING_V1=disabled
NEXT_PUBLIC_FF_MOBILE_INSPECTIONS=disabled
NEXT_PUBLIC_FF_QBO_TIMESHEET_SYNC=disabled
NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1=disabled
NEXT_PUBLIC_FF_SCHEDULE_LIBERATION=enabled
NEXT_PUBLIC_FF_V2_NAVIGATION=enabled
NEXT_PUBLIC_FF_PLANNING_BOARD=disabled
```

See `.env.example` for the full template.

---

## Deployment

Deployed to **Vercel** with monorepo configuration:

```json
{
  "buildCommand": "pnpm turbo build --filter=@gleamops/web",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next"
}
```

- Push to `main` triggers automatic production deployment
- Vercel Cron: `/api/cron/inventory-count-reminders` runs daily at 13:00 UTC
- All quality gates must pass before merge: `pnpm typecheck && pnpm lint && pnpm test && pnpm build:web`

---

## Documentation

Numbered docs (00–27) plus appendices in `docs/`:

| Category | Key Files |
|----------|-----------|
| **Planning** | Master Dev Plan, Roadmap, Milestone tracking |
| **UX** | ADHD-optimized UX rules, design system specs |
| **Data Model** | Table patterns, relationships, naming conventions |
| **Security** | Tenant isolation, RLS policies, role-based access |
| **CleanFlow** | Bid math algorithms, production rates, pricing |
| **Workflows** | Sequence diagrams for all critical flows |
| **API** | OpenAPI 3.1 contract, RFC 9457 error catalog |
| **Architecture** | Reorg reports, audit results, module structure |

Additional reference:
- `openapi/openapi.yaml` — API contract (OpenAPI 3.1)
- `CLAUDE.md` — AI development context (patterns, conventions, code examples)

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **No invoicing/payments/taxes** | Out of scope by design — integrate with QBO/Xero |
| **Pure math engine** | CleanFlow has zero DB dependencies, fully testable |
| **RFC 9457 errors** | Stable error codes, not string messages |
| **Status state machine** | Legal transitions enforced in SQL via `validate_status_transition()` |
| **Soft delete only** | All "deletes" set `archived_at`, reversible |
| **Thin delegate routes** | Auth → validate → service → respond (max ~40 LOC per route) |
| **Service/repository split** | Business logic separated from data access |
| **Dual-client pattern** | RLS client for user ops + service client for audit |
| **Hierarchical sidebar** | NAV_TREE with collapsible children, feature-flag gated (`v2_navigation`) |
| **Module accent colors** | Each module has a unique color applied via CSS variable for visual differentiation |
| **Neuro-optimized UX** | Designed for ADHD, dyslexia, and anxiety accessibility |
| **Canonical route migration** | `/clients` over `/crm`, `/jobs` over `/operations`, `/team` over `/workforce` |

---

## Milestones

| MS | What | Status |
|----|------|--------|
| A | Foundation (repo, Supabase, CI, shell) | DONE |
| B | Auth + RBAC + Tenant isolation | DONE |
| C | Design system + App shell + UI Refresh | DONE |
| D | CRM core (clients, sites, contacts) | DONE |
| E | Bidding MVP (wizard + CleanFlow) | DONE |
| F | Proposals send + tracking + follow-ups | DONE |
| G | Won conversion → contracts → tickets | DONE |
| H+ | Schedule, Inspections, Timekeeping, Safety | DONE |
| P1–P8 | Monday.com replacement (boards, scheduling, shifts, routes, complaints, field reports, night bridge, customer portal) | DONE |
| NS | Project North Star — hierarchical nav, /catalog route, tab consolidation | DONE |
| QA | Full QA cycle — 24 issues resolved across 2 rounds | DONE |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR process.

---

## License

Private. All rights reserved.
