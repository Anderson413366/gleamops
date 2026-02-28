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
- **UI Library**: @gleamops/ui — 30 components, semantic HSL token system
- **i18n**: EN, ES, PT-BR
- **Deploy**: Vercel (web), worker TBD
- **Status**: Milestones A–H complete + Monday.com replacement + Project North Star navigation overhaul. 13 navigation modules (hierarchical sidebar with children), 108 API routes, 28 detail pages, 42 forms, 113 migrations, 28 service modules.

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
| Supabase | https://bqoqjixsdqrqsxasyifa.supabase.co |

---

## Architecture

```
gleamops_dev_pack/
├── apps/
│   ├── web/                       # Next.js 15 (the product)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/  # Login page
│   │       │   └── (dashboard)/   # 20 route directories + detail pages
│   │       │       ├── home/              # Dashboard widgets (owner KPIs)
│   │       │       ├── schedule/          # Recurring, work orders, calendar, planning, boards
│   │       │       ├── jobs/              # Service plans, tickets, inspections, time, routes, checklists, forms
│   │       │       ├── clients/           # Clients, sites, contacts, requests, partners (CANONICAL)
│   │       │       │   ├── [id]/          # Client detail
│   │       │       │   ├── sites/[id]/    # Site detail
│   │       │       │   └── contacts/[code]/ # Contact detail
│   │       │       ├── pipeline/          # Prospects, opportunities, bids, proposals
│   │       │       │   └── admin/         # Follow-up templates, marketing, rates
│   │       │       ├── catalog/           # Tasks, services, mapping, scope library (NEW — North Star)
│   │       │       ├── team/              # Staff, positions, attendance, timesheets, payroll, HR, subcontractors (CANONICAL)
│   │       │       │   └── staff/[code]/  # Staff detail
│   │       │       ├── inventory/         # Supplies, kits, site assignments, counts, orders, vendors
│   │       │       │   ├── supplies/[id]/ # Supply detail
│   │       │       │   └── counts/[id]/   # Inventory count detail
│   │       │       ├── equipment/         # Equipment, assignments, keys, vehicles, maintenance
│   │       │       ├── safety/            # Certifications, training, incidents, calendar
│   │       │       ├── reports/           # Ops, sales, financial, quality, workforce, inventory dashboards
│   │       │       ├── settings/          # General, lookups, geofences, rules, data hub, sequences, import
│   │       │       ├── shifts-time/       # Shifts & time tracking (role-gated)
│   │       │       ├── crm/               # LEGACY — redirects to /clients
│   │       │       ├── operations/        # LEGACY — complaints, periodic, task-catalog (tabs NOT in /jobs)
│   │       │       ├── workforce/         # LEGACY — field-reports (tab NOT in /team)
│   │       │       ├── assets/            # LEGACY alias for /equipment
│   │       │       ├── services/          # LEGACY alias for /catalog
│   │       │       ├── vendors/           # Subcontractors, supply vendors, vendor directory
│   │       │       └── admin/             # Lookups, position types, schedule settings, portal settings
│   │       ├── components/
│   │       │   ├── forms/         # 42 entity form components
│   │       │   ├── layout/        # AppShell, Header, Sidebar (hierarchical NAV_TREE)
│   │       │   ├── activity/      # ActivityHistorySection
│   │       │   ├── detail/        # ProfileCompletenessCard, StatusToggleDialog
│   │       │   ├── directory/     # EntityAvatar, EntityCard
│   │       │   └── links/         # EntityLink
│   │       ├── hooks/             # 22 custom hooks
│   │       ├── lib/               # Supabase clients, auth guard, audit, utils
│   │       │   └── utils/         # date.ts, job-financials.ts, format-zip.ts
│   │       └── modules/           # 28 domain service modules
│   ├── worker/                    # Background jobs (PDFs, follow-ups)
│   └── mobile/                    # Expo React Native (in development)
├── packages/
│   ├── shared/                    # Types, Zod schemas, constants, NAV_TREE, error catalog
│   ├── domain/                    # Pure business rules (status machine, RBAC)
│   ├── cleanflow/                 # Bid math engine (pure functions)
│   └── ui/                        # Design system (30 components)
├── supabase/
│   ├── migrations/                # 113 SQL migration files (17,559 lines)
│   └── functions/                 # Edge Functions (Deno)
├── docs/                          # Numbered docs 00–27 + appendices
├── openapi/                       # OpenAPI 3.1 contract
└── CLAUDE.md                      # This file
```

---

## Navigation (13 Modules — Hierarchical Sidebar)

The sidebar uses **NAV_TREE** (defined in `packages/shared/src/constants/index.ts`) with collapsible children. Controlled by the `v2_navigation` feature flag. When flag is off, falls back to flat `LEGACY_NAV_ITEMS`.

### Canonical Routes (Primary — used in NAV_TREE)

| # | Module | Route | Tabs |
|---|--------|-------|------|
| 1 | **Home** | `/home` | Owner dashboard with KPI widgets |
| 2 | **Schedule** | `/schedule` | Recurring, Work Orders, Calendar, Planning, Boards |
| 3 | **Jobs** | `/jobs` | Service Plans, Job Log (tickets), Inspections, Time, Routes, Checklists, Forms |
| 4 | **Clients** | `/clients` | Clients, Sites, Contacts, Requests, Partners |
| 5 | **Pipeline** | `/pipeline` | Prospects, Opportunities, Bids, Proposals |
| 6 | **Catalog** | `/catalog` | Tasks, Services, Mapping, Scope Library |
| 7 | **Team** | `/team` | Staff, Positions, Attendance, Timesheets, Payroll, HR, Microfiber, Subcontractors (+Messages flag) |
| 8 | **Inventory** | `/inventory` | Supplies, Kits, Site Assignments, Counts, Orders, Vendors |
| 9 | **Equipment** | `/equipment` | Equipment, Assignments, Keys, Vehicles, Maintenance |
| 10 | **Safety** | `/safety` | Certifications, Training, Incidents, Calendar |
| 11 | **Reports** | `/reports` | Ops, Sales, Financial, Quality, Workforce, Inventory |
| 12 | **Settings** | `/settings` | General, Lookups, Geofences, Rules, Data Hub, Sequences, Import |
| 13 | **Shifts & Time** | `/shifts-time` | Shifts, Timesheets, Clock In/Out (role-gated) |

### Legacy Routes (Still Functional — Back-compat)

These routes still work but are **not** in the sidebar NAV_TREE. Some host tabs that have no canonical equivalent.

| Legacy Route | Status | Notes |
|-------------|--------|-------|
| `/crm` | Back-links point to `/clients` | Detail pages still render at `/crm/clients/[id]`, `/crm/sites/[id]`, `/crm/contacts/[code]` |
| `/operations` | Partially migrated to `/jobs` | **Still hosts:** complaints, periodic tasks, task-catalog, alerts, night-bridge (tabs NOT in `/jobs`) |
| `/workforce` | Partially migrated to `/team` | **Still hosts:** field-reports (tab NOT in `/team`) |
| `/assets` | Alias for `/equipment` | Both routes render the same content |
| `/services` | Alias for `/catalog` | Both routes render the same content |
| `/admin` | Standalone | Settings admin, position types, portal settings |
| `/vendors` | Standalone | Subcontractors, supply vendors, vendor directory |

### Route Migration Rules

When adding back-links or cross-links in new code, use these canonical routes:

| Instead of | Use |
|-----------|-----|
| `/crm` | `/clients` |
| `/crm?tab=sites` | `/clients?tab=sites` |
| `/crm?tab=contacts` | `/clients?tab=contacts` |
| `/operations?tab=jobs` | `/jobs` |
| `/operations?tab=tickets` | `/jobs?tab=tickets` |
| `/workforce` (staff list) | `/team` |
| `/operations?tab=complaints` | `/operations?tab=complaints` (no canonical — keep legacy) |
| `/operations?tab=periodic` | `/operations?tab=periodic` (no canonical — keep legacy) |
| `/workforce?tab=field-reports` | `/workforce?tab=field-reports` (no canonical — keep legacy) |

---

## Detail Pages (28 dynamic routes)

Every detail page follows the same layout: Back link → Breadcrumb → Avatar circle → Stat cards → ProfileCompletenessCard → Section cards (`<dl>` key-value) → Edit + Deactivate buttons → ActivityHistorySection → Metadata footer.

| Entity | Canonical Route | Legacy Route | Param |
|--------|----------------|-------------|-------|
| Client | `/clients/[id]` | `/crm/clients/[id]` | client_code |
| Site | `/clients/sites/[id]` | `/crm/sites/[id]` | site_code |
| Contact | `/clients/contacts/[code]` | `/crm/contacts/[code]` | contact_code |
| Prospect | `/pipeline/prospects/[id]` | — | prospect_code |
| Opportunity | `/pipeline/opportunities/[id]` | — | opportunity_code |
| Bid | `/pipeline/bids/[id]` | — | bid_code |
| Proposal | `/pipeline/proposals/[id]` | — | proposal_code |
| Job (Service Plan) | `/operations/jobs/[id]` | — | job_code |
| Ticket | `/operations/tickets/[id]` | — | ticket_code |
| Complaint | `/operations/complaints/[code]` | — | complaint_code |
| Periodic Task | `/operations/periodic/[code]` | — | periodic_code |
| Task Catalog | `/operations/task-catalog/[id]` | — | task_code |
| Staff | `/team/staff/[code]` | `/workforce/staff/[code]` | staff_code |
| Employee | `/team/employees/[code]` | — | staff_code |
| Field Report | `/workforce/field-reports/[code]` | — | report_code |
| Supply | `/inventory/supplies/[id]` | — | code |
| Inventory Count | `/inventory/counts/[id]` | — | count_code |
| Equipment | `/assets/equipment/[code]` | — | equipment_code |
| Vehicle | `/assets/vehicles/[id]` | — | vehicle_code |
| Key | `/assets/keys/[id]` | — | key_code |
| Task | `/services/tasks/[id]` | — | task_code |
| Task (admin) | `/admin/services/tasks/[id]` | — | task_code |
| Subcontractor | `/vendors/subcontractors/[code]` | — | subcontractor_code |
| Supply Vendor | `/vendors/supply-vendors/[slug]` | — | slug |

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

Every module uses: `ChipTabs` + `SearchInput` + `useSyncedTab` + conditional tab rendering.

```tsx
'use client';
import { useState } from 'react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import SectionTable from './section/section-table';

const TABS = [
  { key: 'section1', label: 'Section 1', icon: SomeIcon },
];

export default function ModulePage() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'section1',
    aliases: { oldName: 'section1' },
  });
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
import { EntityLink } from '@/components/links/entity-link';
import { EntityCardGrid } from './entity-card-grid';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'all'] as const;

export default function EntityTable({ search }: { search: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const { view, setView } = useViewPreference('entity');

  // Fetch, filter by status + search, sort, paginate...
  // Row click → router.push(`/module/entity/${row.entity_code}`)
  // Cross-links use <EntityLink entityType="client" code={code} name={name} />

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button size="sm" onClick={handleAdd}><Plus /> New Entity</Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton data={filtered} filename="entity" columns={[...]} />
        </div>
      </div>
      {/* Status filter chips (pill buttons with count badges) */}
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

Back link → Breadcrumb → Avatar → ProfileCompletenessCard → Stat cards → Section cards → ActivityHistorySection → Edit + Deactivate → Metadata footer.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, SomeIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge } from '@gleamops/ui';
import { EntityForm } from '@/components/forms/entity-form';
import { ProfileCompletenessCard, isFieldComplete } from '@/components/detail/profile-completeness-card';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Entity | null>(null);

  return (
    <div className="space-y-6">
      {/* Back link — always use canonical route */}
      <Link href="/module" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Module
      </Link>
      {/* Breadcrumb: Home › Module › Entity Code */}
      {/* Header: avatar circle + name + code badge + status badges */}
      {/* ProfileCompletenessCard: tracks field completeness */}
      {/* Stat cards: grid grid-cols-2 lg:grid-cols-4 gap-4 */}
      {/* Section cards: grid grid-cols-1 lg:grid-cols-2 gap-4 */}
      {/*   Each card uses <dl className="space-y-2 text-sm"> */}
      {/*     <p><span className="text-muted-foreground">Label:</span> Value</p> */}
      {/* ActivityHistorySection: audit trail */}
      {/* Metadata footer: Created / Updated dates */}
      {/* Edit button → opens EntityForm */}
      {/* StatusToggleDialog for Deactivate/Reactivate */}
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

## UI Components (@gleamops/ui — 30 components)

30 component files in `packages/ui/src/components/`. 27 are exported from the barrel (`index.ts`); 3 are design-system-only (access-denied, bulk-actions, csv-import — kept for future use but not currently consumed by the app).

| Component | Purpose |
|-----------|---------|
| `archive-dialog` | Archive confirmation with reason field |
| `badge` | Status badges (7-color system: green/red/yellow/blue/orange/purple/gray) |
| `button` | Button with size/variant system |
| `card` | Card, CardHeader, CardTitle, CardContent |
| `chip-tabs` | Pill-style tab navigation with counts |
| `collapsible-card` | Collapsible card with localStorage persistence |
| `command-palette` | Global search (Cmd+K) |
| `confirm-dialog` | Confirmation dialog |
| `data-table` | Table, TableHeader, TableHead, TableBody, TableRow, TableCell |
| `density-toggle` | Comfortable/compact density toggle |
| `empty-state` | Empty state placeholder |
| `export-button` | CSV export with toast feedback |
| `file-dropzone` | File upload zone |
| `form-section` | Form section layout |
| `form-wizard` | Multi-step form wizard with step indicator |
| `input` | Text input |
| `pagination` | Pagination with prev/next, item count |
| `search-input` | Search input with debounce + clear |
| `select` | Select dropdown |
| `skeleton` | Loading skeleton |
| `slide-over` | Slide-over panel (right drawer or centered modal) |
| `stat-card` | Dashboard stat display card |
| `status-pill` | Status pill badge |
| `table-row-visuals` | Table row styling utilities (StatusDot, resolveStatusColor, statusRowAccentClass) |
| `textarea` | Textarea input |
| `tooltip` | Help icon tooltip |
| `utils` | Component utilities (`cn`) |
| `view-toggle` | List/Card view toggle |

---

## Form Components (42 forms)

Located at `apps/web/src/components/forms/`.

---

## Custom Hooks (22 hooks)

Located at `apps/web/src/hooks/`:

| Hook | Returns | Purpose |
|------|---------|---------|
| `use-auth` | `{ user, tenantId, role, loading, signOut }` | Auth state from Supabase |
| `use-barcode-scanner` | `{ scan }` | Barcode scanning (mobile) |
| `use-bulk-select` | `{ selected, toggle, selectAll, clear }` | Multi-row selection |
| `use-camera` | `{ capture }` | Camera access (mobile) |
| `use-density` | `{ density, setDensity }` | Comfortable/compact toggle |
| `use-feature-flag` | `boolean` | Feature flag management |
| `use-form` | `{ values, errors, loading, setValue, handleSubmit, onBlur }` | Form state + Zod validation |
| `use-geolocation` | `{ coords }` | GPS location (mobile) |
| `use-keyboard-shortcuts` | — | Keyboard shortcut handling |
| `use-locale` | `{ locale, setLocale, t }` | Internationalization (EN, ES, PT-BR) |
| `use-lookups` | `{ lookups }` | Lookup data fetching |
| `use-media-query` | `boolean` | CSS media query matching |
| `use-offline-mutation-sync` | — | Offline mutation queue + sync |
| `use-pagination` | `{ page, currentPage, totalPages, ... }` | Client-side pagination (default 25/page) |
| `use-realtime` | — | Supabase realtime channel subscriptions |
| `use-role` | `{ can, isAtLeast, isAdmin, isManager }` | RBAC permission checks |
| `use-server-pagination` | `{ ... }` | Server-side pagination |
| `use-synced-tab` | `{ tab, setTab }` | URL-synced tab state with `?tab=` param and aliases |
| `use-table-sort` | `{ sorted, sortKey, sortDir, onSort }` | Client-side column sorting |
| `use-theme` | `{ theme, resolvedTheme, setTheme }` | Dark/light/system theme |
| `use-ui-preferences` | `{ preferences, setPreference }` | UI state preferences |
| `use-view-preference` | `{ view, setView }` | List/card view (localStorage) |

---

## Card Grids (20 entities)

| Entity | File |
|--------|------|
| Clients | `crm/clients/clients-card-grid.tsx` |
| Sites | `crm/sites/sites-card-grid.tsx` |
| Contacts | `crm/contacts/contacts-card-grid.tsx` |
| Staff | `workforce/staff/staff-card-grid.tsx` |
| Field Reports | `workforce/field-reports/field-reports-card-grid.tsx` |
| Subcontractors | `vendors/subcontractors/subcontractors-card-grid.tsx` |
| Vendor Directory | `vendors/vendor-directory/vendors-card-grid.tsx` |
| Jobs | `operations/jobs/jobs-card-grid.tsx` |
| Complaints | `operations/complaints/complaint-card-grid.tsx` |
| Periodic Tasks | `operations/periodic/periodic-task-card-grid.tsx` |
| Route Templates | `operations/templates/route-template-card-grid.tsx` |
| Task Catalog | `operations/task-catalog/task-catalog-card-grid.tsx` |
| Equipment | `assets/equipment/equipment-card-grid.tsx` |
| Vehicles | `assets/vehicles/vehicles-card-grid.tsx` |
| Supplies | `inventory/supplies/supplies-card-grid.tsx` |
| Prospects | `pipeline/prospects/prospects-card-grid.tsx` |
| Opportunities | `pipeline/opportunities/opportunities-card-grid.tsx` |
| Positions | `admin/positions/position-type-card-grid.tsx` |
| Work Orders | `schedule/work-orders/work-order-card-grid.tsx` |
| Recurring Schedules | `schedule/recurring/schedule-card-grid.tsx` |

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

Module accent colors are defined in `MODULE_ACCENTS` (`packages/shared/src/constants/index.ts`). Each module gets a unique accent color applied via CSS variable `--module-accent`. The `getModuleFromPathname()` function maps URL paths to module keys.

Status badge colors: `green`, `red`, `yellow`, `blue`, `orange`, `purple`, `gray`

---

## Shared Package Exports (@gleamops/shared)

### Types
All database interfaces (StandardColumns, Tenant, Client, Site, SalesBid, WorkTicket, etc.)
App types (UserRole, NavSpace, NavItem, ProblemDetails, StatusColor, ModuleKey)
NavSpace union: `home | schedule | jobs | shifts_time | pipeline | crm | clients | operations | workforce | team | inventory | assets | equipment | vendors | safety | admin | reports | settings | catalog`

### Constants
NAV_TREE, NAV_ITEMS, MODULE_ACCENTS, getModuleFromPathname(),
PROSPECT_STATUS_COLORS, BID_STATUS_COLORS, PROPOSAL_STATUS_COLORS,
TICKET_STATUS_COLORS, JOB_STATUS_COLORS, TIMESHEET_STATUS_COLORS,
ROLES, FREQUENCIES, DIFFICULTY_MULTIPLIERS, WEEKS_PER_MONTH

### Errors
createProblemDetails(), PROSPECT_001..003, BID_001..004, PROPOSAL_001..005,
CONVERT_001..003, TICKET_001..002, AUTH_001..003, SYS_001

### Validation
clientSchema, siteSchema, contactSchema, taskSchema, serviceSchema,
prospectSchema, bidSchema, convertBidSchema, loginSchema

---

## Migration Files (113 SQL files, 17,559 lines)

| Range | What |
|-------|------|
| 00001–00010 | Foundation: tables, helpers, triggers, RLS, seeds, auth hook, audit, test tenant |
| 00011–00018 | Business tables: CRM, services, bids, proposals, workforce, conversion, checklists, timekeeping |
| 00019–00025 | Auth fixes, users, JWT fixes, inspections, conversion RPCs, proposal queue |
| 00026–00033 | Site supplies, inventory/assets, supply costing, ticket RPC, restructure, blueprint, cleanup, profiles |
| 00034–00043 | Job assignments, archive cascade, materialized views, indexes, spreadsheet alignment, sales, conversions, constraints, search |
| 00044–00049 | Storage hardening, new modules, follow-up worker, constraint relaxation, photo URLs |
| 00050–00060 | HR tables, fleet DVIR, messaging, schedule availability, inventory counts |
| 00061–00084 | Safety certs, training, production rates, geofences, mobile sync, warehouse, PIN codes |
| 00085–00097 | Complaints, periodic tasks, route templates, field reports, night bridge, customer portal |
| 00098–00113 | Shifts & time, schedule boards, work orders, payroll export, access windows |

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

## Service Modules (28 domains)

All 108 API routes follow the **thin delegate** pattern: `auth → validate → service → respond`.

Located at `apps/web/src/modules/`:

| Module | Domain | Pattern |
|--------|--------|---------|
| `complaints` | Customer complaints | service + repository |
| `counts` | Count submission | service + repository |
| `cron` | Scheduled jobs | service + repository |
| `field-reports` | Field inspection reports | service + repository |
| `fleet` | DVIR inspections | service + repository |
| `inventory` | Approval workflows | service + repository |
| `inventory-orders` | Proof of delivery | service + repository |
| `load-sheet` | Load sheet generation | service + repository |
| `messages` | Thread messaging | service + repository |
| `night-bridge` | Overnight shift handoffs | service + repository |
| `owner-dashboard` | Owner analytics dashboard | service + repository |
| `periodic-tasks` | Recurring task management | service + repository |
| `proposals` | Send + signature capture | service + repository |
| `proposals-pdf` | PDF generation | service + repository |
| `public-counts` | Public count access | service + repository |
| `public-portal` | Customer portal | service + repository |
| `public-proposals` | Public proposal access | service + repository |
| `public-work-orders` | Public work order access | service + repository |
| `route-templates` | Route template management | service + repository |
| `schedule` | Schedule routes (dual-client) | service + repository + permissions |
| `self-service` | Employee self-service | service + repository |
| `shifts-time` | Shifts & time tracking | service + repository |
| `sites` | Site PIN codes | service + repository |
| `timekeeping` | Clock in/out | service + repository |
| `warehouse` | Warehouse inventory | service + repository |
| `webhooks` | SendGrid event processing | service + repository |
| `workforce-hr` | Polymorphic HR CRUD (6 entities) | service + repository |

Each module follows the **golden module** pattern:
- `{domain}.service.ts` — Business logic, returns `ServiceResult<T>`
- `{domain}.repository.ts` — Supabase queries, data access
- `index.ts` — Barrel export

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
| P1–P8 | Monday.com replacement (boards, scheduling, shifts, routes, complaints, field reports, night bridge, customer portal) | DONE |
| NS | Project North Star — hierarchical nav, /catalog route, tab consolidation, legacy route migration | DONE |
| QA | Full QA cycle — 24 issues fixed across 2 rounds (original 11 + supplemental 14) | DONE |

---

## Git History (Key Commits)

```
2162581 fix(nav): update legacy route back-links to canonical module routes
4dc2a48 fix(qa): resolve remaining 5 data/backend issues (S01, S02, S09, S10, S14)
8948f59 fix(qa): resolve all supplemental QA issues (S03–S13)
3bd49d4 fix(qa): hydration mismatch + mobile header responsive layout
c5b70b0 fix(qa): address QA round 2 — root 404, supply cost errors, KPI loading, breadcrumbs, redirect
c2af4f6 fix(qa): address QA report — 404 page, KPI links, pipeline sections, tab overflow, breadcrumbs
ccca37a fix(nav): resolve tab bounce loop when navigating via sidebar children
d4e239f feat(nav): implement Project North Star — hierarchical nav, /catalog route, tab consolidation
2ee5fbf feat(schedule): fix Humanity-style UX gaps — copy-week, day timeline DnD, month labels
4a3af57 feat(schedule): redesign boards with Monday.com visual language
6cc6048 feat(schedule): add Humanity-style scheduling + Monday.com-style boards
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
2. Follow the Detail Page Pattern: back link, breadcrumb, avatar, ProfileCompletenessCard, stat cards, section cards (`<dl>`), ActivityHistorySection, edit, deactivate
3. Update the table component: import `useRouter`, replace `onSelect` callback with `router.push`
4. Keep form component for create-only (remove edit-via-drawer)

### Add sorting + pagination + filter chips to a table
1. Import `useTableSort`, `usePagination`, `useViewPreference` hooks
2. Add `STATUS_OPTIONS` array, `statusFilter` state, `statusCounts` memo
3. Pipe data: `filtered → useTableSort → usePagination → render`
4. Add filter chips row with count badges
5. Add `ViewToggle` + `ExportButton` in the header area

### Add a new navigation module
1. Add the module key to `NavSpace` type in `packages/shared/src/types/app.ts`
2. Add entry to `NAV_TREE` in `packages/shared/src/constants/index.ts` (with children if needed)
3. Add accent color to `MODULE_ACCENTS` in the same file
4. Add path mapping to `getModuleFromPathname()` in the same file
5. Add icon to `ICON_MAP` in `apps/web/src/components/layout/sidebar.tsx`
6. Create the route directory under `apps/web/src/app/(dashboard)/`
