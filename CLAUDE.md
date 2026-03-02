# CLAUDE.md — GleamOps AI Development Context

> Read this file first every time you start a new session.

---

## TL;DR

GleamOps is a **B2B SaaS ERP for commercial cleaning** that replaces spreadsheets.

**Data spine:** Service DNA → Bids → Proposals → Won → Contracts → Tickets → Time/QA/Inventory/Assets/Safety

| Fact | Value |
|------|-------|
| Monorepo | Turborepo v2 + pnpm workspaces (7 packages) |
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) |
| Math Engine | CleanFlow (`packages/cleanflow`) — pure functions, no DB calls |
| UI Library | `@gleamops/ui` — 27 components, semantic HSL tokens, 3 themes |
| i18n | EN, ES, PT-BR |
| Deploy | Vercel (auto-deploy on push to `main`) |
| Stats | 13 nav modules, 108 API routes, 30 detail pages, 38 forms, 134 migrations (19,682 lines SQL), 28 service modules, 21 hooks |

---

## Non-Negotiables

1. **Data continuity wins.** Services → Bids → Proposals → Won → Contracts → Tickets.
2. **Security (RLS/tenant isolation) wins.** Every table has `tenant_id` + RLS.
3. **Apple-simple UX wins.** One primary action per screen, progressive disclosure.
4. **Work Ticket is the nucleus.** Everything attaches to tickets.
5. **No invoicing/payments/taxes.** Ever.
6. **Deterministic math.** CleanFlow runs server-side, explainable pricing.
7. **Soft delete everywhere.** `archived_at`, `archived_by`, `archive_reason`.
8. **Optimistic locking.** `version_etag` + If-Match on updates.
9. **Problem Details errors.** RFC 9457 style, stable error codes.
10. **No creative architecture.** Follow the patterns in this file exactly.

---

## Quick Commands

```bash
pnpm dev             # Dev server (Turbopack)
pnpm build           # Production build (all packages)
pnpm build:web       # Build web app only
pnpm typecheck       # TypeScript check (all 7 packages)
pnpm test            # Run tests
pnpm lint            # ESLint
pnpm db:start        # Start local Supabase
pnpm db:reset        # Reset local DB
pnpm db:migrate      # Run pending migrations
```

---

## Project Root & URLs

```
/Users/andersongomes/claude_sandbox/gleamops_dev_pack/
```

| What | URL |
|------|-----|
| Production | https://gleamops.vercel.app |
| GitHub | https://github.com/Anderson413366/gleamops |
| Supabase | https://bqoqjixsdqrqsxasyifa.supabase.co |

---

## Code Architecture

### Monorepo Layout

```
gleamops/
├── apps/
│   ├── web/                    Next.js 15 — the product
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/       Login page
│   │       │   ├── (dashboard)/        13 module routes + 30 detail pages
│   │       │   └── api/                108 route handlers
│   │       ├── components/
│   │       │   ├── forms/              38 entity form components
│   │       │   ├── layout/             Sidebar, Header, AppShell
│   │       │   ├── detail/             ProfileCompletenessCard, StatusToggleDialog
│   │       │   ├── directory/          EntityAvatar, EntityCard
│   │       │   ├── activity/           ActivityHistorySection
│   │       │   └── links/              EntityLink
│   │       ├── hooks/                  21 custom hooks
│   │       ├── lib/                    Supabase clients, auth guard, utils
│   │       │   └── utils/              date, color-contrast, status-colors, job-financials
│   │       └── modules/                28 domain service modules
│   ├── worker/                 Background jobs (PDF gen, follow-ups)
│   └── mobile/                 Expo React Native (in development)
│
├── packages/
│   ├── shared/                 Types, Zod schemas, NAV_TREE, constants, feature flags, errors
│   ├── domain/                 Pure business rules — RBAC, status machine
│   ├── cleanflow/              Bid math engine — production rates → workload → pricing
│   └── ui/                     Design system — 27 components, semantic HSL tokens
│
├── supabase/
│   ├── migrations/             134 SQL files (19,682 lines)
│   └── functions/              Edge Functions (Deno)
│
├── docs/                       21 reference docs + instruction manual (7 foundation + 30 module files)
├── openapi/                    OpenAPI 3.1 contract
└── CLAUDE.md                   This file
```

### Package Dependency Graph

```
@gleamops/web ──→ @gleamops/ui ──→ Tailwind CSS 4
       │              │
       ├──→ @gleamops/shared ──→ @gleamops/domain
       │
       └──→ @gleamops/cleanflow (bid math, zero deps)
```

### Request Flow (API Routes)

All 108 routes follow the **thin delegate** pattern (max ~40 LOC per handler):

```
HTTP Request
  → Route Handler: auth check → validate input (Zod)
    → Service Layer: business logic, orchestration
      → Repository Layer: Supabase PostgREST queries
        → PostgreSQL: RLS enforces tenant isolation
```

28 domain modules in `src/modules/` each contain:
- `{domain}.service.ts` — Business logic, returns `ServiceResult<T>`
- `{domain}.repository.ts` — Supabase queries
- `index.ts` — Barrel export

### Frontend Data Flow

```
Module Page (ChipTabs + SearchInput + useSyncedTab)
  → Table Component (fetch → filter → sort → paginate)
    → Row click → Detail Page ([id]/page.tsx)
      → Edit button → SlideOver Form (Zod + optimistic locking)
```

### Auth Flow

```
User signs in → Supabase Auth
  → custom_access_token_hook → injects tenant_id + role into JWT
    → current_tenant_id() SQL reads JWT
      → All RLS policies filter by tenant_id
        → useAuth() provides { user, tenantId, role }
          → useRole() wraps canAccess() for permission checks
```

---

## Supabase Architecture

### Database Overview

- **220+ tables** across 18 functional domains
- **134 migrations** (19,682 lines SQL)
- **Row-Level Security** on every table — `tenant_id = current_tenant_id()`
- **Dual-key pattern** — `id UUID` (internal) + `*_code TEXT` (human-readable)
- **Soft delete only** — `archived_at`, trigger blocks DELETE
- **Optimistic locking** — `version_etag UUID` auto-rolled on every write

### Standard Columns (every business table)

```sql
id              UUID DEFAULT gen_random_uuid() PRIMARY KEY
tenant_id       UUID NOT NULL REFERENCES tenants(id)
*_code          TEXT UNIQUE
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
archived_at     TIMESTAMPTZ              -- NULL = active
archived_by     UUID
archive_reason  TEXT
version_etag    UUID DEFAULT gen_random_uuid()
```

### Standard Triggers (every business table)

| Trigger | Fires | Purpose |
|---------|-------|---------|
| `set_updated_at` | BEFORE UPDATE | Sets `updated_at = now()` |
| `set_version_etag` | BEFORE INSERT/UPDATE | Rolls `version_etag` |
| `prevent_hard_delete` | BEFORE DELETE | Raises exception — forces soft-delete |

### Key SQL Functions

| Function | Purpose |
|----------|---------|
| `current_tenant_id()` | Reads tenant_id from JWT claims |
| `has_role(user_id, role_code)` | Check user's role in tenant |
| `has_any_role(user_id, roles[])` | Check multiple roles |
| `user_can_access_site(user_id, site_id)` | Site scoping check |
| `next_code(tenant_id, prefix, padding)` | Generate entity codes (CLI-1001, etc.) |
| `validate_status_transition(tenant_id, entity, from, to)` | State machine validation |
| `enforce_status_transition()` | Trigger: blocks invalid status on 6 tables |
| `cascade_archive()` | Trigger: soft-delete propagates parent → children |
| `auto_archive_on_terminal_status()` | Trigger: archives on CANCELED/TERMINATED |
| `normalize_name_fields()` | Trigger: trims whitespace on name columns |
| `auto_set_tenant_id()` | Trigger: sets tenant_id from JWT if missing |
| `run_data_hygiene_scan(p_tenant_id)` | RPC: automated data quality scan |
| `fn_generate_tickets_for_period(p_period_id)` | RPC: generate work tickets from schedule rules |

### Operational Views

| View | Purpose |
|------|---------|
| `v_sites_full` | Joined site + access details + compliance |
| `v_active_sites` | Active sites only |
| `v_staff_roster` | Active staff with position info |
| `v_upcoming_tickets` | Tickets in the next 7 days |

### Entity Code Formats

```
CLI-1001   (client)       SIT-2050   (site)
TSK-001    (task)         SER-0001   (service)
BID-000123 (bid)          PRP-000456 (proposal)
JOB-2026-A (job)          TKT-XXXX   (ticket)
PRO-XXXX   (prospect)     OPP-XXXX   (opportunity)
STF-XXXX   (staff)        CON-XXXX   (contact)
```

### Migration File Ranges

| Range | What |
|-------|------|
| 00001–00010 | Foundation: tables, helpers, triggers, RLS, seeds, auth hook, audit, test tenant |
| 00011–00018 | Business tables: CRM, services, bids, proposals, workforce, conversion, checklists, timekeeping |
| 00019–00033 | Auth fixes, inspections, inventory, assets, supply costing, search |
| 00034–00049 | Archive cascade, materialized views, indexes, sales, storage, follow-ups |
| 00050–00084 | HR, fleet, messaging, schedule, safety, geofences, warehouse, PIN codes |
| 00085–00111 | Complaints, periodic tasks, routes, field reports, night bridge, customer portal, shifts, work orders, payroll |
| 00112–00116 | Scheduling parity: position colors, eligible positions, templates, period types |
| 00117–00130 | Data Quality Sprints 1–14: hygiene, constraints, staff column rename, FK linkage, status enforcement, indexes, cascade archive, views |
| 20260302* | Empty Tables Audit: ANALYZE, triggers on 5 tables, feature_flags table |

### Test Tenant

- Tenant A: `TNT-0001` — "Anderson Cleaning Services"
- Tenant B: `TNT-0002` — "Other Cleaning Co" (isolation test)
- Auto-assign trigger: new auth.users → OWNER_ADMIN on TNT-0001

---

## Navigation (13 Modules)

The sidebar uses **NAV_TREE** (`packages/shared/src/constants/index.ts`) with collapsible children. Controlled by `v2_navigation` feature flag.

### Canonical Routes

| # | Module | Route | Tabs |
|---|--------|-------|------|
| 1 | Home | `/home` | Owner dashboard with KPI widgets |
| 2 | Schedule | `/schedule` | Recurring, Work Orders, Calendar, Planning, Boards |
| 3 | Jobs | `/jobs` | Service Plans, Tickets, Inspections, Time, Routes, Checklists, Forms |
| 4 | Clients | `/clients` | Clients, Sites, Contacts, Requests, Partners |
| 5 | Pipeline | `/pipeline` | Prospects, Opportunities, Bids, Proposals |
| 6 | Catalog | `/catalog` | Tasks, Services, Mapping, Scope Library |
| 7 | Team | `/team` | Staff, Positions, Attendance, Timesheets, Payroll, HR, Microfiber, Partners, Break Rules, Shift Tags |
| 8 | Inventory | `/inventory` | Supplies, Kits, Site Assignments, Counts, Orders, Forecasting, Warehouse, Vendors |
| 9 | Equipment | `/equipment` | Equipment, Assignments, Keys, Vehicles, Maintenance |
| 10 | Safety | `/safety` | Certifications, Training, Incidents, Calendar |
| 11 | Reports | `/reports` | Overview, Ops, Sales, Financial, Compliance, Workforce, Inventory, Schedule |
| 12 | Settings | `/settings` | General, Lookups, Geofences, Rules, Data Hub, Sequences, Import, Schedule, Time Clock |
| 13 | Shifts & Time | `/shifts-time` | Shifts, Timesheets, Clock In/Out (role-gated) |

### Legacy Routes (still work, not in sidebar)

| Route | Notes |
|-------|-------|
| `/crm` | Redirects to `/clients`. Detail pages still render at `/crm/clients/[id]` etc. |
| `/operations` | Hosts complaints, periodic tasks, task-catalog, alerts, night-bridge |
| `/workforce` | Hosts field reports |
| `/assets` | Alias for `/equipment` |
| `/services` | Alias for `/catalog` |
| `/admin` | Lookups, position types, portal settings |
| `/vendors` | Subcontractors, supply vendors, vendor directory |

### Route Migration Rules

When writing new code, always use canonical routes:

| Instead of | Use |
|-----------|-----|
| `/crm` | `/clients` |
| `/operations?tab=jobs` | `/jobs` |
| `/workforce` (staff) | `/team` |
| `/operations?tab=complaints` | `/operations?tab=complaints` (no canonical — keep legacy) |
| `/workforce?tab=field-reports` | `/workforce?tab=field-reports` (no canonical — keep legacy) |

---

## Detail Pages (30 dynamic routes)

Layout: Back link → Breadcrumb → Avatar → ProfileCompletenessCard → Stat cards → Section cards (`<dl>`) → Edit + Deactivate → ActivityHistorySection → Metadata footer.

| Entity | Route | Param |
|--------|-------|-------|
| Client | `/clients/[id]` | client_code |
| Site | `/clients/sites/[id]` | site_code |
| Contact | `/clients/contacts/[code]` | contact_code |
| Prospect | `/pipeline/prospects/[id]` | prospect_code |
| Opportunity | `/pipeline/opportunities/[id]` | opportunity_code |
| Bid | `/pipeline/bids/[id]` | bid_code |
| Proposal | `/pipeline/proposals/[id]` | proposal_code |
| Job | `/operations/jobs/[id]` | job_code |
| Ticket | `/operations/tickets/[id]` | ticket_code |
| Complaint | `/operations/complaints/[code]` | complaint_code |
| Periodic Task | `/operations/periodic/[code]` | periodic_code |
| Task Catalog | `/operations/task-catalog/[id]` | task_code |
| Staff | `/team/staff/[code]` | staff_code |
| Employee | `/team/employees/[code]` | staff_code |
| Position | `/team/positions/[code]` | position_code |
| Field Report | `/workforce/field-reports/[code]` | report_code |
| Supply | `/inventory/supplies/[id]` | code |
| Inventory Count | `/inventory/counts/[id]` | count_code |
| Equipment | `/assets/equipment/[code]` | equipment_code |
| Vehicle | `/assets/vehicles/[id]` | vehicle_code |
| Key | `/assets/keys/[id]` | key_code |
| Task | `/services/tasks/[id]` | task_code |
| Subcontractor | `/vendors/subcontractors/[code]` | subcontractor_code |
| Supply Vendor | `/vendors/supply-vendors/[slug]` | slug |

---

## Design System

### Theme Architecture

Tailwind CSS 4 with CSS-first `@theme` configuration. 3 modes: **light**, **dark**, **true-black (OLED)**.

Semantic HSL-channel tokens:

```css
/* Light */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 217 91% 60%;

/* Dark */
--background: 222.2 84% 4.9%;
--card: 222.2 84% 6%;

/* True Black */
--background: 0 0% 0%;
--card: 0 0% 3%;
```

**Sidebar tokens** (always dark): `--sidebar-bg`, `--sidebar-text`, `--sidebar-active`, `--sidebar-hover`

**Module accent colors**: Each module gets a unique color via `--module-accent`. Defined in `MODULE_ACCENTS` (`packages/shared/src/constants/index.ts`).

### Accessibility Features

- Dyslexia font toggle (OpenDyslexic)
- Reading ruler overlay
- Reduced motion mode
- High contrast mode
- Large text mode
- Focus mode

### Neuro-Optimization Rules

**ADHD — Progressive Disclosure:**
- Table rows → full detail pages (never modals for read views)
- One blue CTA per page
- ChipTabs for sections, filter chips for status

**Dyslexia — Spacing & Scanning:**
- `<dl>` key-value pairs with flex spacing
- `h-20 w-20` avatar circles with large initials
- Inter font family

**Anxiety — Predictability:**
- "← Back to [Module]" on every detail page
- Modals have both X and Cancel
- Frosted glass header (`backdrop-blur-md`)
- Deactivate uses `outline` variant with red

### UI Component Rules

- Prefer semantic tokens: `bg-background`, `text-foreground`, `bg-card`, `border-border`
- Avoid raw Tailwind colors unless inside design system components
- Radius: `rounded-lg` (cards/inputs), `rounded-xl` (overlays), `rounded-full` (avatars)
- Transitions: `transition-all duration-200 ease-in-out`
- Shadows: `shadow-sm` (cards), `shadow-xl` (dialogs), `shadow-2xl` (SlideOver)

---

## Roles (RBAC)

`OWNER_ADMIN` · `MANAGER` · `SUPERVISOR` · `CLEANER` · `INSPECTOR` · `SALES`

RBAC = what you can do. Site scoping = where you can do it.

---

## Code Patterns — Follow Exactly

### 1. Module Page (Tabbed Layout)

```tsx
'use client';
import { useState } from 'react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';

const TABS = [{ key: 'section1', label: 'Section 1', icon: SomeIcon }];

export default function ModulePage() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'section1',
    aliases: { oldName: 'section1' },
  });
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Module</h1>
      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
      {tab === 'section1' && <SectionTable search={search} />}
    </div>
  );
}
```

### 2. Table Component

Fetch → filter → sort → paginate → render. Status filter chips + List/Card toggle + Export.

```tsx
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'all'] as const;

// Hooks: useTableSort, usePagination, useViewPreference
// Row click → router.push(`/module/entity/${row.entity_code}`)
// Cross-links → <EntityLink entityType="client" code={code} name={name} />
```

### 3. Detail Page

```
Back link → Breadcrumb → Avatar + name + code badge + status
  → ProfileCompletenessCard
  → Stat cards (grid grid-cols-2 lg:grid-cols-4 gap-4)
  → Section cards (grid grid-cols-1 lg:grid-cols-2 gap-4)
     Each: <dl className="space-y-2 text-sm">
  → ActivityHistorySection
  → Metadata footer (Created / Updated)
  → Edit button → SlideOver form
  → StatusToggleDialog for Deactivate/Reactivate
```

### 4. Form Pattern (optimistic locking)

```tsx
export function EntityForm({ open, onClose, initialData, onSuccess }) {
  const isEdit = !!initialData?.id;
  const { values, errors, loading, setValue, handleSubmit } = useForm({
    schema: entitySchema,
    initialValues: initialData || defaults,
    onSubmit: async (data) => {
      const supabase = getSupabaseBrowserClient();
      if (isEdit) {
        await supabase.from('table').update(data)
          .eq('id', initialData.id)
          .eq('version_etag', initialData.version_etag);
      } else {
        await supabase.from('table').insert(data);
      }
      onSuccess?.();
      onClose();
    },
  });
}
```

### 5. Card Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {rows.map((item) => (
    <EntityCard key={item.id} onClick={() => onSelect(item)} {...props} />
  ))}
</div>
```

---

## Custom Hooks (21)

| Hook | Purpose |
|------|---------|
| `use-auth` | Auth state: `{ user, tenantId, role, loading, signOut }` |
| `use-bulk-select` | Multi-row selection |
| `use-camera` | Camera access (clock-in selfies) |
| `use-density` | Comfortable/compact table toggle |
| `use-feature-flag` | Env-var feature flag check |
| `use-form` | Form state + Zod validation |
| `use-geolocation` | GPS with geofence check |
| `use-keyboard-shortcuts` | Keyboard shortcut handling |
| `use-locale` | i18n (EN, ES, PT-BR) |
| `use-lookups` | Lookup data + 13 preset hooks |
| `use-media-query` | CSS media query matching |
| `use-offline-mutation-sync` | Offline queue + sync |
| `use-pagination` | Client-side pagination (25/page) |
| `use-position-types` | Dynamic position type colors |
| `use-realtime` | Supabase realtime subscriptions |
| `use-role` | RBAC permission checks |
| `use-server-pagination` | Server-side pagination |
| `use-synced-tab` | URL `?tab=` sync with aliases |
| `use-table-sort` | Client-side column sorting |
| `use-theme` | Dark/light/OLED theme |
| `use-view-preference` | List/card view (localStorage) |

---

## Service Modules (28)

| Module | Domain |
|--------|--------|
| `complaints` | Customer complaints |
| `counts` | Inventory count submission |
| `cron` | Scheduled jobs |
| `field-reports` | Field inspection reports |
| `fleet` | DVIR inspections |
| `inventory` | Approval workflows |
| `inventory-orders` | Proof of delivery |
| `load-sheet` | Load sheet generation |
| `messages` | Thread messaging |
| `night-bridge` | Overnight shift handoffs |
| `owner-dashboard` | Owner analytics |
| `periodic-tasks` | Recurring task management |
| `proposals` | Send + signature capture |
| `proposals-pdf` | PDF generation |
| `public-counts` | Public count access |
| `public-portal` | Customer portal |
| `public-proposals` | Public proposal access |
| `public-work-orders` | Public work order access |
| `route-templates` | Route template management |
| `schedule` | Schedule routes (dual-client) |
| `self-service` | Employee self-service |
| `shifts-time` | Shifts & time tracking |
| `sites` | Site PIN codes |
| `timekeeping` | Clock in/out |
| `warehouse` | Warehouse inventory |
| `webhooks` | SendGrid event processing |
| `workforce-hr` | Polymorphic HR CRUD (6 entities) |

---

## Feature Flags

17 env-var flags in `packages/shared/src/constants/feature-flags.ts`:

**Enabled by default:** `v2_navigation`, `schedule_liberation`, `unified_sales`, `standalone_calculator`

**Disabled by default:** `schema_parity`, `bid_specialization`, `proposal_studio_v2`, `ops_geofence_auto`, `messaging_v1`, `mobile_inspections`, `qbo_timesheet_sync`, `financial_intel_v1`, `planning_board`, `shifts_time_v1`, `shifts_time_route_execution`, `shifts_time_callout_automation`, `shifts_time_payroll_export_v1`

Plus 18 DB-backed domain flags in `feature_flags` table for database readiness tracking.

---

## Card Grids (20 entities)

All in `apps/web/src/app/(dashboard)/`:

| Entity | File path (relative to dashboard) |
|--------|----------------------------------|
| Clients | `crm/clients/clients-card-grid.tsx` |
| Sites | `crm/sites/sites-card-grid.tsx` |
| Contacts | `crm/contacts/contacts-card-grid.tsx` |
| Staff | `workforce/staff/staff-card-grid.tsx` |
| Field Reports | `workforce/field-reports/field-reports-card-grid.tsx` |
| Subcontractors | `vendors/subcontractors/subcontractors-card-grid.tsx` |
| Vendors | `vendors/vendor-directory/vendors-card-grid.tsx` |
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
| Recurring | `schedule/recurring/schedule-card-grid.tsx` |

---

## @gleamops/shared Exports

**Types:** All DB interfaces (Client, Site, Staff, WorkTicket, etc.), app types (UserRole, NavSpace, NavItem, ModuleKey, ProblemDetails)

**Constants:** NAV_TREE, MODULE_ACCENTS, getModuleFromPathname(), status color maps (PROSPECT, BID, PROPOSAL, TICKET, JOB, TIMESHEET), ROLES, FREQUENCIES

**Validation:** clientSchema, siteSchema, contactSchema, taskSchema, serviceSchema, prospectSchema, bidSchema, convertBidSchema, loginSchema, staffSchema

**Errors:** createProblemDetails(), PROSPECT_001..003, BID_001..004, PROPOSAL_001..005, CONVERT_001..003, TICKET_001..002, AUTH_001..003, SYS_001

---

## Reference Docs (in docs/)

| Doc | Purpose |
|-----|---------|
| `schema-contract.md` | Table naming, standard columns, entity codes |
| `no-delete-rules.md` | Soft delete, 84 protected tables, cascade rules |
| `api-contract.md` | REST conventions, Problem Details, optimistic locking |
| `feature-flags.md` | Flag domains, env vars, rollout lifecycle |
| `clickability.md` | 39-entity routing table, EntityLink rules |
| `neuroinclusive-ux.md` | 12 ADHD/Dyslexia/Anxiety UX rules |
| `cleanflow-engine.md` | Bid math: rates → workload → pricing |
| `proposals-email.md` | PDF gen, send, tracking, follow-ups |
| `schedule-coverage.md` | Coverage gap detection, pre-publish validation |
| `timekeeping.md` | Geofence, clock in/out, exceptions, timesheets |
| `rls-matrix.md` | RLS policy checklist per table |
| `docs/manual/` | Full instruction manual — quickstart, modules, references |

---

## Common Development Tasks

### Add a new entity end-to-end

1. Add migration in `supabase/migrations/` with standard columns + `version_etag`
2. Add TypeScript interface in `packages/shared/src/types/`
3. Add Zod schema in `packages/shared/src/validation/`
4. Create table component (Table Pattern)
5. Create card grid component (Card Grid Pattern)
6. Create form component (Form Pattern)
7. Create detail page (Detail Page Pattern)
8. Wire into module page (ChipTabs + conditional render)

### Add a detail page

1. Create `[id]/page.tsx` under the entity's route
2. Follow Detail Page Pattern: back link, breadcrumb, avatar, ProfileCompletenessCard, stats, sections (`<dl>`), ActivityHistory
3. Update table: row click → `router.push`

### Add a new navigation module

1. Add module key to `NavSpace` in `packages/shared/src/types/app.ts`
2. Add to `NAV_TREE` in `packages/shared/src/constants/index.ts`
3. Add accent color to `MODULE_ACCENTS`
4. Add path mapping to `getModuleFromPathname()`
5. Add icon to `ICON_MAP` in `apps/web/src/components/layout/sidebar.tsx`
6. Create route directory in `apps/web/src/app/(dashboard)/`

### Add sorting + pagination + filter chips

1. Import `useTableSort`, `usePagination`, `useViewPreference`
2. Add `STATUS_OPTIONS`, `statusFilter` state, `statusCounts` memo
3. Pipe: filtered → useTableSort → usePagination → render
4. Add filter chips, ViewToggle, ExportButton
