# CLAUDE.md — GleamOps AI Development Context

> **Read this file first** every time you start a new session.

---

## TL;DR

GleamOps is a **B2B SaaS ERP for commercial cleaning** that replaces spreadsheets.

**Data continuity spine:** Service DNA → Bids → Proposals → Won → Contracts → Tickets → Time/QA/Inventory/Assets/Safety

- **Monorepo**: Turborepo v2+ with pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + RLS + Auth + Storage + Realtime)
- **Math Engine**: CleanFlow (packages/cleanflow) — pure functions, no DB calls
- **UI Library**: @gleamops/ui — 27 components, semantic HSL token system
- **Deploy**: Vercel (web), worker TBD
- **Status**: Milestones A–C complete. 10 navigation modules, 33 routes, 10 detail pages, 21 forms, 49 migrations.

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

## Neuro-Optimization Rules (ADHD / Dyslexia / Anxiety)

### ADHD — Progressive Disclosure
- Table rows navigate to **full detail pages** (never drawers/modals for read views)
- One blue CTA per page (no competing actions)
- ChipTabs for module sections, filter chips for status filtering

### Dyslexia — Spacing & Scanning
- Detail pages use `<dl>` with `<div className="flex justify-between">` for key-value pairs
- Card grids use centered layout with `h-20 w-20` avatar circles and large initials
- Inter font family throughout

### Anxiety — Predictability
- "← Back to [Module]" links on every detail page
- Modals have both ✕ close button and Cancel button
- Frosted glass header (`backdrop-blur-md`)
- Deactivate/Archive buttons use `outline` variant with red styling

---

## Quick Commands

```bash
pnpm dev             # Start web dev server (turbopack)
pnpm build           # Production build (all packages)
pnpm build:web       # Build web app only
pnpm typecheck       # TypeScript check (all 7 packages)
pnpm test            # Run tests
pnpm lint            # Run ESLint
pnpm db:reset        # Reset local Supabase DB
pnpm db:migrate      # Run pending migrations
```

---

## Project Root

```
/Users/andersongomes/claude_sandbox/gleamops_dev_pack/
```

---

## URLs

| What | URL |
|------|-----|
| Production | https://gleamops.vercel.app |
| GitHub | https://github.com/Anderson413366/gleamops |
| Supabase | https://ytaseunyzzqjcxeqxery.supabase.co |

---

## Architecture

```
gleamops_dev_pack/
├── apps/
│   ├── web/                       # Next.js 15 (the product)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/  # Login page
│   │       │   └── (dashboard)/   # 10 nav modules + detail pages
│   │       │       ├── home/              # Dashboard widgets
│   │       │       ├── pipeline/          # Prospects, Bids, Proposals, Opportunities
│   │       │       │   └── admin/         # Follow-up templates, Marketing, Rates
│   │       │       ├── crm/               # Clients, Sites, Contacts
│   │       │       │   ├── clients/[id]/  # Client detail page
│   │       │       │   └── sites/[id]/    # Site detail page
│   │       │       ├── operations/        # Jobs, Tickets, Inspections
│   │       │       │   └── jobs/[id]/     # Job detail page
│   │       │       ├── people/            # Staff, Payroll, Positions, Timekeeping
│   │       │       │   └── staff/[code]/  # Staff detail page
│   │       │       ├── inventory/         # Supplies, Kits, Counts, Orders
│   │       │       │   └── supplies/[id]/ # Supply detail page
│   │       │       ├── assets/            # Equipment, Keys, Vehicles, Maintenance
│   │       │       │   ├── vehicles/[id]/ # Vehicle detail page
│   │       │       │   └── keys/[id]/     # Key detail page
│   │       │       ├── services/          # Service library + tasks
│   │       │       │   └── tasks/[id]/    # Task detail page
│   │       │       ├── vendors/           # Subcontractors, Supply Vendors
│   │       │       ├── safety/            # Certifications, Training, Documents
│   │       │       ├── admin/             # Settings, Lookups, Services admin
│   │       │       │   └── services/tasks/[id]/ # Admin task detail
│   │       │       ├── reports/           # Dashboards + reports
│   │       │       ├── schedule/          # Calendar views
│   │       │       ├── settings/          # User settings
│   │       │       └── subcontractors/    # Subcontractor directory + jobs
│   │       ├── components/
│   │       │   ├── forms/         # 21 entity form components
│   │       │   └── layout/        # AppShell, Header, Sidebar
│   │       ├── hooks/             # 11 custom hooks
│   │       └── lib/               # Supabase clients, utils
│   ├── worker/                    # Background jobs (PDFs, follow-ups)
│   └── mobile/                    # Expo React Native (future)
├── packages/
│   ├── shared/                    # Types, Zod schemas, constants, error catalog
│   ├── domain/                    # Pure business rules (status machine, RBAC)
│   ├── cleanflow/                 # Bid math engine (pure functions)
│   └── ui/                        # Design system (27 components)
├── supabase/
│   ├── migrations/                # 49 SQL migration files (7,015 lines)
│   └── functions/                 # Edge Functions (Deno) — TBD
├── docs/                          # 29 dev pack docs + 6 appendices
├── openapi/                       # OpenAPI 3.1 contract
└── CLAUDE.md                      # This file
```

---

## Navigation (10 Modules)

| # | Module | Route | Tabs |
|---|--------|-------|------|
| 1 | **Home** | `/home` | Dashboard widgets |
| 2 | **Pipeline** | `/pipeline` | Prospects, Opportunities, Bids, Proposals |
| 3 | **CRM** | `/crm` | Clients, Sites, Contacts |
| 4 | **Operations** | `/operations` | Jobs, Tickets, Inspections |
| 5 | **People** | `/people` | Staff, Positions, Payroll, Timekeeping, Timesheets |
| 6 | **Inventory** | `/inventory` | Supplies, Kits, Site Assignments, Counts, Orders |
| 7 | **Assets** | `/assets` | Equipment, Eq. Assignments, Vehicles, Keys, Maintenance |
| 8 | **Vendors** | `/vendors` | Subcontractors, Supply Vendors |
| 9 | **Safety** | `/safety` | Certifications, Training Courses, Completions, Documents |
| 10 | **Admin** | `/admin` | Lookups, Status Rules, Sequences, Services/Tasks |

Additional: `/reports`, `/schedule`, `/services`, `/settings`, `/subcontractors`, `/team`, `/workforce`

---

## Detail Pages (10 dynamic routes)

Every detail page follows the same layout: Back link → Avatar circle → Stat cards → Section cards (`<dl>` key-value) → Edit + Deactivate buttons → Metadata footer.

| Entity | Route | Param | Fetches From |
|--------|-------|-------|-------------|
| Client | `/crm/clients/[id]` | client_code | `clients` |
| Site | `/crm/sites/[id]` | site_code | `sites` + client join |
| Job | `/operations/jobs/[id]` | job_code | `site_jobs` + site/client join |
| Staff | `/people/staff/[code]` | staff_code | `staff` |
| Supply | `/inventory/supplies/[id]` | code | `supply_catalog` |
| Vehicle | `/assets/vehicles/[id]` | vehicle_code | `vehicles` + assigned join |
| Key | `/assets/keys/[id]` | key_code | `key_inventory` + site/assigned join |
| Task | `/services/tasks/[id]` | task_code | `tasks` + service_tasks count |
| Task (admin) | `/admin/services/tasks/[id]` | task_code | `tasks` + service_tasks count |
| Staff (workforce) | `/workforce/staff/[code]` | staff_code | `staff` |

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

## Code Patterns — Follow These Exactly

### 1. Module Page Pattern (Tabbed Layout)

Every module uses: `ChipTabs` + `SearchInput` + conditional tab rendering.

```tsx
'use client';
import { useState } from 'react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import SectionTable from './section/section-table';

const TABS = [
  { key: 'section1', label: 'Section 1', icon: SomeIcon },
];

export default function ModulePage() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Module Name</h1>
      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
      {tab === 'section1' && <SectionTable search={search} />}
    </div>
  );
}
```

### 2. Table Component Pattern

Fetch → filter → sort → paginate → render. Status filter chips + List/Card toggle + Export.

```tsx
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { EntityCardGrid } from './entity-card-grid';

const STATUS_OPTIONS = ['all', 'ACTIVE', 'INACTIVE'] as const;

export default function EntityTable({ search }: { search: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { view, setView } = useViewPreference('entity');

  // Fetch, filter by status + search, sort, paginate...
  // Row click → router.push(`/module/entity/${row.entity_code}`)

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton data={filtered} filename="entity" columns={[...]} />
      </div>
      {/* Status filter chips */}
      {view === 'card' ? (
        <EntityCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
        <Table>...</Table>
      )}
      <Pagination ... />
    </div>
  );
}
```

### 3. Detail Page Pattern

Back link → Avatar → Stat cards → Section cards → Edit + Deactivate.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, SomeIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge } from '@gleamops/ui';
import { EntityForm } from '@/components/forms/entity-form';

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Entity | null>(null);

  // Fetch by code...

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button onClick={() => router.push('/module')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Module
      </button>

      {/* Header: avatar + name + badges */}
      {/* Stat cards: grid grid-cols-2 lg:grid-cols-4 gap-4 */}
      {/* Section cards: grid grid-cols-1 lg:grid-cols-2 gap-6 */}
      {/*   Each card uses <dl className="space-y-3 text-sm"> */}
      {/*     <div className="flex justify-between"><dt>Label</dt><dd>Value</dd></div> */}

      {/* Edit button → opens EntityForm */}
      {/* Deactivate button → outline-red variant */}
    </div>
  );
}
```

### 4. Card Grid Pattern

Responsive grid with centered avatar, used alongside table view.

```tsx
interface CardGridProps {
  rows: Entity[];
  onSelect: (item: Entity) => void;
}

export function EntityCardGrid({ rows, onSelect }: CardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <div key={item.id} onClick={() => onSelect(item)}
          className="rounded-lg border border-border bg-card p-4 shadow-sm
                     hover:shadow-md cursor-pointer transition-shadow flex flex-col items-center text-center">
          {/* h-20 w-20 avatar circle (photo or icon) */}
          {/* Name + code */}
          {/* Status badge */}
        </div>
      ))}
    </div>
  );
}
```

### 5. Form Pattern (with optimistic locking)

```tsx
'use client';
import { useForm } from '@/hooks/use-form';
import { entitySchema } from '@gleamops/shared';
import { SlideOver, Input, Select } from '@gleamops/ui';

export function EntityForm({ open, onClose, initialData, onSuccess }) {
  const isEdit = !!initialData?.id;
  const { values, errors, loading, setValue, handleSubmit, onBlur } = useForm({
    schema: entitySchema,
    initialValues: initialData || defaults,
    onSubmit: async (data) => {
      const supabase = getSupabaseBrowserClient();
      if (isEdit) {
        // Optimistic locking: check version_etag before update
        await supabase.from('table').update(data).eq('id', initialData.id).eq('version_etag', initialData.version_etag);
      } else {
        await supabase.from('table').insert(data);
      }
      onSuccess?.();
      onClose();
    },
  });
  // ...
}
```

---

## UI Components (@gleamops/ui — 27 components)

| Component | Purpose |
|-----------|---------|
| `access-denied` | Role-gated access denied screen |
| `archive-dialog` | Archive confirmation with reason field |
| `badge` | Status badges (7-color system: green/red/yellow/blue/orange/purple/gray) |
| `bulk-actions` | Bulk action toolbar |
| `button` | Button with size/variant system |
| `card` | Card, CardHeader, CardTitle, CardContent |
| `chip-tabs` | Pill-style tab navigation with counts |
| `collapsible-card` | Collapsible card with localStorage persistence |
| `command-palette` | Global search (Cmd+K) |
| `confirm-dialog` | Confirmation dialog |
| `csv-import` | CSV import component |
| `data-table` | Table, TableHeader, TableHead, TableBody, TableRow, TableCell |
| `density-toggle` | Comfortable/compact density toggle |
| `empty-state` | Empty state placeholder |
| `export-button` | CSV export with toast feedback |
| `form-wizard` | Multi-step form wizard with step indicator |
| `input` | Text input |
| `pagination` | Pagination with prev/next, item count |
| `search-input` | Search input with debounce + clear |
| `select` | Select dropdown |
| `skeleton` | Loading skeleton |
| `slide-over` | Slide-over panel (right drawer or centered modal) |
| `stat-card` | Dashboard stat display card |
| `status-pill` | Status pill badge |
| `textarea` | Textarea input |
| `tooltip` | Help icon tooltip |
| `view-toggle` | List/Card view toggle |

---

## Form Components (21 forms)

Located at `apps/web/src/components/forms/`:

| Form | Entity Table | Notes |
|------|-------------|-------|
| `client-form` | `clients` | Wizard in create mode |
| `contact-form` | `contacts` | Client/site contacts |
| `equipment-form` | `equipment` | |
| `inventory-count-form` | `inventory_counts` | |
| `job-form` | `site_jobs` | Wizard in create mode |
| `job-log-form` | `job_logs` | |
| `key-form` | `key_inventory` | |
| `lookup-form` | `lookups` | |
| `maintenance-form` | `vehicle_maintenance` | |
| `opportunity-form` | `opportunities` | |
| `position-form` | `staff_positions` | |
| `production-rate-form` | `production_rates` | |
| `prospect-form` | `prospects` | |
| `service-form` | `services` | |
| `site-form` | `sites` | |
| `staff-form` | `staff` | |
| `subcontractor-form` | `subcontractors` | |
| `supply-form` | `supply_catalog` | |
| `supply-order-form` | `supply_orders` | |
| `task-form` | `tasks` | |
| `vehicle-form` | `vehicles` | |

---

## Custom Hooks (11 hooks)

Located at `apps/web/src/hooks/`:

| Hook | Returns | Purpose |
|------|---------|---------|
| `useAuth` | `{ user, tenantId, role, loading, signOut }` | Auth state from Supabase |
| `useBulkSelect` | `{ selected, toggle, selectAll, clear }` | Multi-row selection |
| `useDensity` | `{ density, setDensity }` | Comfortable/compact toggle |
| `useForm` | `{ values, errors, loading, setValue, handleSubmit, onBlur }` | Form state + Zod validation |
| `usePagination` | `{ page, currentPage, totalPages, ... }` | Client-side pagination (default 25/page) |
| `useRealtime` | — | Supabase realtime channel subscriptions |
| `useRole` | `{ can, isAtLeast, isAdmin, isManager }` | RBAC permission checks |
| `useServerPagination` | `{ ... }` | Server-side pagination |
| `useTableSort` | `{ sorted, sortKey, sortDir, onSort }` | Client-side column sorting |
| `useTheme` | `{ theme, resolvedTheme, setTheme }` | Dark/light/system theme |
| `useViewPreference` | `{ view, setView }` | List/card view (localStorage) |

---

## Card Grids (8 entities)

| Entity | File |
|--------|------|
| Clients | `crm/clients/clients-card-grid.tsx` |
| Sites | `crm/sites/sites-card-grid.tsx` |
| Staff | `people/staff/staff-card-grid.tsx` |
| Subcontractors | `subcontractors/directory/subcontractors-card-grid.tsx` |
| Jobs | `operations/jobs/jobs-card-grid.tsx` |
| Equipment | `assets/equipment/equipment-card-grid.tsx` |
| Vehicles | `assets/vehicles/vehicles-card-grid.tsx` |
| Supplies | `inventory/supplies/supplies-card-grid.tsx` |

---

## Design System — Token Architecture

Tailwind CSS 4 with CSS-first `@theme` configuration. Semantic HSL-channel tokens:

```css
/* Light mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;
--primary: 217 91% 60%;        /* Blue-600 */

/* Dark mode */
--background: 222.2 84% 4.9%;
--card: 222.2 84% 6%;
--primary: 217 91% 60%;
```

Status badge colors: `green`, `red`, `yellow`, `blue`, `orange`, `purple`, `gray`

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

## Migration Files (49 SQL files, 7,015 lines)

| Range | What |
|-------|------|
| 00001–00010 | Foundation: tables, helpers, triggers, RLS, seeds, auth hook, audit, test tenant |
| 00011–00018 | Business tables: CRM, services, bids, proposals, workforce, conversion, checklists, timekeeping |
| 00019–00025 | Auth fixes, users, JWT fixes, inspections, conversion RPCs, proposal queue |
| 00026–00033 | Site supplies, inventory/assets, supply costing, ticket RPC, restructure, blueprint, cleanup, profiles |
| 00034–00043 | Job assignments, archive cascade, materialized views, indexes, spreadsheet alignment, sales, conversions, constraints, search |
| 00044–00049 | Storage hardening, new modules, follow-up worker, constraint relaxation, photo URLs |

---

## Auth Architecture

### Flow
1. User signs in via Supabase Auth (email/password or OAuth)
2. `custom_access_token_hook` fires → injects `tenant_id` + `role` into JWT
3. `current_tenant_id()` SQL function reads JWT → all RLS policies use this
4. Next.js middleware checks auth → redirects to `/login` if not authenticated
5. `useAuth()` hook reads JWT → provides `user`, `tenantId`, `role` to React
6. `useRole()` wraps `canAccess()` from `@gleamops/domain` for permission checks

### Test Tenant
- Tenant A: `TNT-0001` — "Anderson Cleaning Services"
- Tenant B: `TNT-0002` — "Other Cleaning Co" (isolation test)
- Auto-assign trigger: new auth.users → OWNER_ADMIN on TNT-0001

---

## Key Source Docs (in docs/)

| Doc | Purpose |
|-----|---------|
| `00_MASTER_DEV_PLAN.md` | Single source of truth roadmap |
| `02_UX_RULES_ADHD.md` | ADHD-optimized UX rules |
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

## Milestones

| MS | What | Status |
|----|------|--------|
| A | Foundation (repo, Supabase, CI, shell) | DONE |
| B | Auth + RBAC + Tenant isolation | DONE |
| C | Design system + App shell + UI Refresh | DONE |
| D | CRM core (clients, sites, contacts) | DONE (tables + detail pages + forms) |
| E | Bidding MVP (wizard + CleanFlow) | DONE (bid wizard + pipeline) |
| F | Proposals send + tracking + follow-ups | DONE (PDF gen + send worker + webhooks) |
| G | Won conversion → contracts → tickets | DONE (convert RPC v2) |
| H+ | Schedule, Inspections, Timekeeping, Safety | DONE (tables + forms) |

---

## Git History (Key Commits)

```
ace336e neuro-opt: replace all remaining drawers with full detail pages
ba5bee7 redesign: 14-phase blueprint alignment — detail pages, filter chips, card grids, navigation
ce2e1b6 redesign: frosted-glass header + sidebar active-state dot
3ea201e UI: add density toggle (comfortable/compact)
345def8 UI: reskin app shell (sidebar/header) to Anderson style
3dd0bb4 UI: adopt semantic HSL-channel tokens + compatibility aliases
c12aae1 feat: add List/Card view toggle to all 8 entity tables
77cd1db feat: full module restructuring — 12 sidebar modules, 8 new DB tables, 37 new components
50cfd14 feat: complete bidding module + pipeline enhancements — 8 phases
fcad2fe feat: port Anderson frontend to GleamOps — dark mode, forms, dashboard, CSV export
```

---

## Common Tasks

### Add a new entity end-to-end
1. Add migration in `supabase/migrations/` with standard columns + `version_etag`
2. Add TypeScript interface in `packages/shared/src/types/`
3. Add Zod schema in `packages/shared/src/validation/`
4. Create table component following the Table Pattern
5. Create card grid component following the Card Grid Pattern
6. Create form component following the Form Pattern
7. Create detail page following the Detail Page Pattern
8. Wire into the module page (ChipTabs + conditional render)

### Add a detail page for an existing entity
1. Create `[id]/page.tsx` under the entity's route folder
2. Follow the Detail Page Pattern: back link, avatar, stat cards, section cards (`<dl>`), edit, deactivate
3. Update the table component: import `useRouter`, replace `onSelect` callback with `router.push`
4. Keep form component for create-only (remove edit-via-drawer)

### Add sorting + pagination + filter chips to a table
1. Import `useTableSort`, `usePagination`, `useViewPreference` hooks
2. Add `STATUS_OPTIONS` array, `statusFilter` state, `statusCounts` memo
3. Pipe data: `filtered → useTableSort → usePagination → render`
4. Add filter chips row with count badges
5. Add `ViewToggle` + `ExportButton` in the header area
