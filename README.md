# GleamOps

**B2B SaaS ERP for commercial cleaning companies.** Replaces spreadsheets with a unified platform covering CRM, bidding, operations, workforce, inventory, assets, and safety.

**Production:** [gleamops.vercel.app](https://gleamops.vercel.app) | **Repo:** [github.com/Anderson413366/gleamops](https://github.com/Anderson413366/gleamops)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4 (semantic HSL tokens) |
| **Database** | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) |
| **Monorepo** | Turborepo v2 + pnpm 9.15.9 workspaces |
| **Math Engine** | CleanFlow (pure TypeScript, zero DB deps) |
| **Deploy** | Vercel (auto-deploy on push to `main`) |
| **API Contract** | OpenAPI 3.1 + RFC 9457 Problem Details |

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
│   ├── web/             → Next.js 15 web application (56 pages, 36 API routes)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/        → Login page
│   │       │   ├── (dashboard)/   → 10 navigation modules + 21 detail pages
│   │       │   └── api/           → 36 route handlers (thin delegates → modules)
│   │       ├── components/
│   │       │   ├── forms/         → 29 entity form components
│   │       │   └── layout/        → AppShell, Header, Sidebar
│   │       ├── hooks/             → 19 custom hooks
│   │       ├── lib/               → Supabase clients, auth guard, audit, utils
│   │       └── modules/           → 16 domain service modules
│   ├── worker/          → Background jobs (PDF generation, follow-ups)
│   └── mobile/          → Expo React Native (in development)
├── packages/
│   ├── shared/          → Types, Zod schemas, constants, error catalog
│   ├── domain/          → Pure business rules (RBAC, status machine)
│   ├── cleanflow/       → Bid math engine (pure functions, no DB deps)
│   └── ui/              → Design system (32 components)
├── supabase/
│   ├── migrations/      → 84 SQL migration files (13,349 lines)
│   └── functions/       → Edge Functions (Deno)
├── openapi/             → OpenAPI 3.1 contract
├── docs/                → 74 documentation files
└── CLAUDE.md            → AI development context
```

---

## Application Modules

GleamOps is organized into 10 navigation modules:

| Module | Route | Description |
|--------|-------|-------------|
| **Home** | `/home` | Dashboard with KPI widgets, alerts, and activity feed |
| **Pipeline** | `/pipeline` | Sales pipeline — prospects, opportunities, bids (CleanFlow math), proposals |
| **CRM** | `/crm` | Client and site management with contact directory |
| **Operations** | `/operations` | Active jobs, work tickets, quality inspections |
| **Workforce** | `/workforce` | Staff directory, positions, payroll, timekeeping, HR |
| **Inventory** | `/inventory` | Supply catalog, kits, site assignments, counts, purchase orders |
| **Assets** | `/assets` | Equipment tracking, key management, fleet/vehicles, maintenance |
| **Vendors** | `/vendors` | Subcontractor directory and supply vendor management |
| **Safety** | `/safety` | Certifications, training courses, safety documents |
| **Admin** | `/admin` | System lookups, status rules, sequences, service library |

Additional routes: `/reports`, `/schedule`, `/services`, `/settings`

### Key Features

- **21 detail pages** — Every major entity has a dedicated page with stats, sections, edit, and deactivate
- **29 form components** — Create and edit forms with Zod validation and optimistic locking
- **12 card grid views** — Toggle between list (table) and card layouts
- **Status filter chips** — Quick-filter by status with count badges on all tables
- **CSV export** — Export filtered data from any table
- **Dark mode** — Theme toggle with system preference detection
- **Density toggle** — Comfortable/compact table density
- **Real-time updates** — Supabase Realtime subscriptions on dashboards
- **Global search** — Cmd+K command palette
- **RBAC** — Role-based access control (Owner, Manager, Supervisor, Cleaner, Inspector, Sales)
- **Multi-tenant** — Full tenant isolation via PostgreSQL RLS

---

## Architecture

### Data Continuity Spine

The core data flow that powers the platform:

```
Service DNA → Bids → Proposals → Won → Contracts → Work Tickets → Time/QA/Inventory/Assets/Safety
```

Every stage links to the next. The CleanFlow engine handles all bid math — production rates, workload calculations, and pricing — with no database dependencies.

### API Route Architecture

All 36 API routes follow the **thin delegate** pattern after the Round 1–2 reorg:

```
Route Handler (auth → validate → service → respond)
       ↓
Service Layer (business logic, orchestration)
       ↓
Repository Layer (Supabase queries, data access)
```

16 domain modules in `src/modules/`:

| Module | Domain | LOC Extracted |
|--------|--------|--------------|
| `inventory` | Approval workflows | ~336 |
| `inventory-orders` | Proof of delivery | ~174 |
| `webhooks` | SendGrid event processing | ~247 |
| `proposals` | Send + signature capture | ~188 |
| `proposals-pdf` | PDF generation | ~443 |
| `counts` | Count submission | ~222 |
| `public-counts` | Public count access | ~317 |
| `public-proposals` | Public proposal access | ~241 |
| `fleet` | DVIR inspections | ~190 |
| `schedule` | 13 schedule routes | ~881 |
| `messages` | Thread messaging | ~90 |
| `timekeeping` | Clock in/out | ~89 |
| `cron` | Scheduled jobs | ~300 |
| `workforce-hr` | Polymorphic HR CRUD | ~157 |
| `warehouse` | Warehouse inventory | ~105 |
| `sites` | Site PIN codes | ~104 |

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

- **84 migration files** totaling 13,349 lines of SQL
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

The `@gleamops/ui` package provides 32 reusable components built with:

- **Semantic HSL tokens** — CSS variables for light/dark mode
- **7-color badge system** — green, red, yellow, blue, orange, purple, gray
- **Consistent geometry** — `rounded-lg` cards, `rounded-xl` overlays, `rounded-full` avatars
- **Frosted glass header** — `backdrop-blur-md` for depth
- **Inter font** — Clean, readable typography

### Neuro-Optimized UX

Designed for ADHD, dyslexia, and anxiety accessibility:

- **Progressive disclosure** — Table rows navigate to full detail pages (not modals)
- **Scannable layouts** — `<dl>` key-value pairs with flex spacing
- **Predictable navigation** — Back links, dual close mechanisms (X + Cancel), consistent button placement
- **One CTA per page** — Reduces decision fatigue

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

---

## Documentation

74 documentation files live in `docs/`:

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
| **No invoicing/payments/taxes** | Out of scope by design |
| **Pure math engine** | CleanFlow has zero DB dependencies, fully testable |
| **RFC 9457 errors** | Stable error codes, not string messages |
| **Status state machine** | Legal transitions enforced in SQL |
| **Soft delete only** | All "deletes" set `archived_at`, reversible |
| **Thin delegate routes** | Auth → validate → service → respond (max ~40 LOC) |
| **Service/repository split** | Business logic separated from data access |
| **Dual-client pattern** | RLS client for user ops + service client for audit |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR process.

---

## License

Private. All rights reserved.
