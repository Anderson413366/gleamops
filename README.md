# GleamOps

**B2B SaaS ERP for commercial cleaning companies.** Replaces spreadsheets with a unified platform covering CRM, bidding, operations, workforce, inventory, assets, and safety.

## Live Demo

**Production:** [gleamops.vercel.app](https://gleamops.vercel.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4 (semantic HSL tokens) |
| **Database** | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) |
| **Monorepo** | Turborepo v2 + pnpm workspaces |
| **Deploy** | Vercel |
| **Package Manager** | pnpm 9.15 |

---

## Monorepo Structure

```
gleamops_dev_pack/
├── apps/
│   ├── web/           → Next.js 15 web application
│   ├── worker/        → Background jobs (PDF generation, follow-ups)
│   └── mobile/        → Expo React Native (planned)
├── packages/
│   ├── shared/        → Types, Zod schemas, constants, error catalog
│   ├── domain/        → Pure business rules (RBAC, status machine)
│   ├── cleanflow/     → Bid math engine (pure functions)
│   └── ui/            → Design system (27 components)
├── supabase/
│   ├── migrations/    → 49 SQL migration files
│   └── functions/     → Edge Functions (Deno)
└── docs/              → 35 documentation files
```

---

## Getting Started

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
# Fill in your Supabase URL and keys

# Start local Supabase
pnpm db:start

# Start development
pnpm dev
```

### Available Scripts

```bash
pnpm dev           # Start dev server (turbopack)
pnpm build         # Production build (all packages)
pnpm build:web     # Build web app only
pnpm typecheck     # TypeScript check (all packages)
pnpm test          # Run tests
pnpm lint          # ESLint
pnpm db:start      # Start local Supabase services
pnpm db:stop       # Stop local Supabase services
pnpm db:reset      # Reset local Supabase DB
pnpm db:migrate    # Run pending migrations
```

Local note: `supabase/config.toml` sets `[analytics].enabled = false` to avoid the known Colima docker socket mount failure (`.../.colima/default/docker.sock`) during `supabase start`.

---

## Application Modules

GleamOps is organized into 10 navigation modules:

| Module | Description |
|--------|-------------|
| **Home** | Dashboard with KPI widgets, alerts, and activity feed |
| **Pipeline** | Sales pipeline — prospects, opportunities, bids (with CleanFlow math), proposals |
| **CRM** | Client and site management with contact directory |
| **Operations** | Active jobs, work tickets, quality inspections |
| **People** | Staff directory, positions, payroll, timekeeping |
| **Inventory** | Supply catalog, kits, site assignments, counts, purchase orders |
| **Assets** | Equipment tracking, key management, fleet/vehicles, maintenance logs |
| **Vendors** | Subcontractor directory and supply vendor management |
| **Safety** | Certifications, training courses, safety documents |
| **Admin** | System lookups, status rules, sequences, service library |

### Key Features

- **10 full detail pages** — Every major entity has a dedicated page with stats, sections, edit, and deactivate
- **21 form components** — Create and edit forms with Zod validation and optimistic locking
- **8 card grid views** — Toggle between list (table) and card layouts on all major tables
- **Status filter chips** — Quick-filter by status with count badges on all tables
- **CSV export** — Export filtered data from any table
- **Dark mode** — Theme toggle with system preference detection
- **Density toggle** — Comfortable/compact table density
- **Real-time updates** — Supabase realtime subscriptions on dashboards
- **Global search** — Cmd+K command palette
- **RBAC** — Role-based access control (Owner, Manager, Supervisor, Cleaner, Inspector, Sales)
- **Multi-tenant** — Full tenant isolation via PostgreSQL RLS

---

## Data Continuity Spine

The core data flow that powers the platform:

```
Service DNA → Bids → Proposals → Won → Contracts → Work Tickets → Time/QA/Inventory/Assets/Safety
```

Every stage links to the next. The CleanFlow engine (pure TypeScript functions) handles all bid math — production rates, workload calculations, and pricing — with no database dependencies.

---

## Design System

The `@gleamops/ui` package provides 27 reusable components built with:

- **Semantic HSL tokens** — CSS variables for light/dark mode
- **7-color badge system** — green, red, yellow, blue, orange, purple, gray
- **Consistent geometry** — rounded-lg cards, rounded-xl overlays
- **Frosted glass header** — `backdrop-blur-md` for depth
- **Inter font** — Clean, readable typography

### Neuro-Optimized UX

Designed for ADHD, dyslexia, and anxiety accessibility:

- **Progressive disclosure** — Table rows navigate to full detail pages (not modals)
- **Scannable layouts** — `<dl>` key-value pairs with flex justify-between spacing
- **Predictable navigation** — Back links, dual close mechanisms (X + Cancel), consistent button placement
- **One CTA per page** — Reduces decision fatigue

---

## Database

- **49 migration files** totaling 7,015 lines of SQL
- **Standard columns** on every table: `tenant_id`, `created_at`, `updated_at`, `archived_at`, `version_etag`
- **Soft delete** via `archived_at` (no hard deletes)
- **Optimistic locking** via `version_etag` UUID
- **Dual-key pattern** — `id UUID` (internal) + `*_code TEXT` (human-readable)
- **RLS policies** on every table with tenant isolation
- **SQL helpers** — `current_tenant_id()`, `has_role()`, `next_code()`, `validate_status_transition()`

---

## Documentation

Comprehensive documentation lives in `docs/`:

- **Master Dev Plan** — Roadmap and milestone tracking
- **UX Rules (ADHD)** — Accessibility-first design principles
- **Data Model** — Table patterns, relationships, naming conventions
- **Security & RLS** — Tenant isolation, role-based policies
- **CleanFlow Engine** — Bid math algorithms
- **Workflows** — Sequence diagrams for all critical flows
- **Error Catalog** — RFC 9457 Problem Details error codes
- **Table Catalog** — Full schema reference (~86 tables)

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
SENDGRID_API_KEY=              # For proposal emails
NEXT_PUBLIC_SENTRY_DSN=        # Error tracking
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

Deployed to Vercel with monorepo configuration:

```json
{
  "buildCommand": "pnpm turbo build --filter=@gleamops/web",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next"
}
```

Push to `main` triggers automatic production deployment.

---

## Architecture Decisions

- **No invoicing/payments/taxes** — Out of scope by design
- **Pure math engine** — CleanFlow has zero database dependencies, fully testable
- **RFC 9457 errors** — Stable error codes, not string messages
- **Status state machine** — Legal transitions enforced in SQL
- **Soft delete only** — All "deletes" set `archived_at`, reversible

---

## License

Private. All rights reserved.
