# Code Architecture — Deep Dive

> How GleamOps is built, folder by folder. For developers and AI agents.

---

## Monorepo Overview

GleamOps is a Turborepo v2 monorepo with pnpm workspaces. 7 packages, one deployable app.

```
gleamops/
├── apps/web/          The product (Next.js 15)
├── apps/worker/       Background jobs (PDF gen, follow-ups)
├── apps/mobile/       Expo React Native (future)
├── packages/shared/   Types, schemas, constants, errors
├── packages/domain/   Pure business rules (RBAC, status machine)
├── packages/cleanflow/ Bid math engine (zero deps)
└── packages/ui/       Design system (27 components)
```

### Build Order

Turborepo handles dependency ordering. The dependency graph is:

```
packages/domain    ← no deps (pure rules)
packages/cleanflow ← no deps (pure math)
packages/shared    ← depends on domain
packages/ui        ← depends on shared (for cn utility)
apps/web           ← depends on shared, ui, cleanflow
apps/worker        ← depends on shared
```

---

## apps/web — The Product

### Route Structure

Next.js 15 App Router. All authenticated pages live under `(dashboard)` layout group.

```
src/app/
├── (auth)/
│   └── login/page.tsx              Login page (standalone layout)
│
├── (dashboard)/                    Authenticated layout (Sidebar + Header)
│   ├── home/page.tsx               Dashboard
│   ├── schedule/page.tsx           Schedule module (12 tabs)
│   ├── jobs/page.tsx               Jobs module (7 tabs)
│   ├── clients/                    Clients module (4 tabs)
│   │   ├── page.tsx                Module page
│   │   ├── [id]/page.tsx           Client detail
│   │   ├── sites/[id]/page.tsx     Site detail
│   │   └── contacts/[code]/page.tsx Contact detail
│   ├── pipeline/                   Pipeline module
│   │   ├── page.tsx                Module page
│   │   ├── admin/page.tsx          Pipeline admin
│   │   ├── calculator/page.tsx     CleanFlow calculator
│   │   ├── prospects/[id]/page.tsx
│   │   ├── opportunities/[id]/page.tsx
│   │   ├── bids/[id]/page.tsx
│   │   └── proposals/[id]/page.tsx
│   ├── catalog/page.tsx
│   ├── team/                       Team module
│   │   ├── page.tsx
│   │   ├── staff/[code]/page.tsx
│   │   └── positions/[code]/page.tsx
│   ├── inventory/
│   │   ├── page.tsx
│   │   ├── supplies/[id]/page.tsx
│   │   └── counts/[id]/page.tsx
│   ├── equipment/page.tsx
│   ├── safety/page.tsx
│   ├── reports/page.tsx
│   ├── settings/page.tsx
│   ├── shifts-time/page.tsx
│   │
│   │   Legacy routes (still work):
│   ├── crm/                        Redirects to /clients
│   ├── operations/                 Complaints, periodic, task-catalog
│   ├── workforce/                  Field reports
│   ├── assets/                     Alias for /equipment
│   ├── services/                   Alias for /catalog
│   ├── vendors/                    Subcontractors, supply vendors
│   └── admin/                      Position types, portal settings
│
├── api/                            108 route handlers
│   ├── codes/next/route.ts
│   ├── contracts/route.ts
│   ├── cron/inventory-count-reminders/route.ts
│   ├── operations/...              (majority of API routes)
│   ├── proposals/...
│   ├── public/...                  (unauthenticated public endpoints)
│   ├── reports/...
│   └── webhooks/sendgrid/route.ts
│
└── globals.css                     Theme tokens (light/dark/OLED + sidebar)
```

### Components Directory

```
src/components/
├── forms/                38 entity form components
│   ├── client-form.tsx
│   ├── site-form.tsx
│   ├── staff-form.tsx
│   ├── shift-form.tsx
│   └── ... (38 total)
│
├── layout/               App shell
│   ├── sidebar.tsx       Hierarchical sidebar (NAV_TREE + LEGACY_NAV_ITEMS)
│   ├── header.tsx        Frosted glass header with user menu
│   ├── app-shell.tsx     Sidebar + Header + main content wrapper
│   └── navigation-tooltip-tour.tsx
│
├── detail/               Detail page building blocks
│   ├── profile-completeness-card.tsx   Field completeness tracker
│   └── status-toggle-dialog.tsx        Deactivate/Reactivate dialog
│
├── directory/            Entity display components
│   ├── entity-avatar.tsx   Avatar with initials (WCAG contrast-safe)
│   └── entity-card.tsx     Card for grid views
│
├── activity/
│   └── activity-history-section.tsx    Audit trail on detail pages
│
├── links/
│   └── entity-link.tsx     Cross-entity clickable link
│
├── clock-in-button.tsx     Clock in/out with GPS + selfie
└── gps-location-badge.tsx  Geofence status indicator
```

### Hooks Directory

21 hooks in `src/hooks/`. Key patterns:

- **State hooks:** `use-auth`, `use-theme`, `use-locale`, `use-density`
- **Data hooks:** `use-lookups`, `use-position-types`, `use-realtime`
- **UI hooks:** `use-synced-tab`, `use-table-sort`, `use-pagination`, `use-view-preference`
- **Form hooks:** `use-form`, `use-bulk-select`
- **Device hooks:** `use-camera`, `use-geolocation`, `use-media-query`
- **Feature hooks:** `use-feature-flag`, `use-role`, `use-keyboard-shortcuts`

### Modules Directory (Service Layer)

28 domain modules in `src/modules/`. Each follows the golden pattern:

```
modules/
├── complaints/
│   ├── complaints.service.ts      Business logic
│   ├── complaints.repository.ts   Supabase queries
│   └── index.ts                   Barrel export
├── schedule/
│   ├── schedule.service.ts
│   ├── schedule.repository.ts
│   ├── schedule.permissions.ts    Extra: role-based permissions
│   └── index.ts
└── ... (28 total)
```

### Lib Directory

```
src/lib/
├── supabase/
│   ├── client.ts          Browser client (RLS-scoped)
│   ├── server.ts          Server client (RLS-scoped)
│   └── admin.ts           Service role client (bypasses RLS)
├── auth/
│   └── guard.ts           Auth check for API routes
├── staff/
│   └── resolve-current-staff.ts   Map auth user → staff record
├── timekeeping/
│   └── breaks.ts          Break event utilities
└── utils/
    ├── date.ts            Date formatting helpers
    ├── color-contrast.ts  WCAG luminance-based text color
    ├── status-colors.ts   Status → Tailwind color mapping
    ├── format-zip.ts      ZIP code formatting
    └── job-financials.ts  Job financial calculations
```

---

## packages/shared — Types & Constants

```
packages/shared/src/
├── types/
│   ├── database.ts       All Supabase table interfaces
│   └── app.ts            UserRole, NavSpace, NavItem, ModuleKey, ProblemDetails
├── constants/
│   ├── index.ts          NAV_TREE, MODULE_ACCENTS, getModuleFromPathname(), status colors
│   └── feature-flags.ts  17 feature flag domains + getFeatureFlags()
├── validation/
│   ├── client.ts         clientSchema, siteSchema, contactSchema
│   ├── pipeline.ts       prospectSchema, bidSchema, convertBidSchema
│   ├── staff.ts          staffSchema
│   └── ...               Other Zod schemas
└── errors/
    └── index.ts          createProblemDetails(), error catalog (RFC 9457)
```

---

## packages/ui — Design System

27 component files in `packages/ui/src/components/`. Core components:

| Category | Components |
|----------|-----------|
| **Layout** | Card, SlideOver, FormSection, FormWizard |
| **Data Display** | Badge, StatCard, StatusPill, TableRowVisuals |
| **Data Table** | Table/Header/Head/Body/Row/Cell, Pagination, Skeleton |
| **Input** | Input, Select, Textarea, FileDropzone, SearchInput |
| **Actions** | Button, ChipTabs, ExportButton, ViewToggle, DensityToggle |
| **Feedback** | EmptyState, Tooltip, CollapsibleCard |
| **Dialogs** | ConfirmDialog, ArchiveDialog, CommandPalette |
| **Utilities** | `cn()` (clsx + tailwind-merge) |

---

## packages/cleanflow — Bid Math Engine

Pure TypeScript. Zero database dependencies. Fully testable.

**What it calculates:**
- Production rates (sq ft per hour by task type)
- Workload (hours needed per visit)
- Pricing (labor cost + materials + margin)

**Why it's separate:** Business rule isolation. The same engine runs in bid wizard, standalone calculator, and proposal generation.

---

## Data Flow Diagrams

### Creating a Client (happy path)

```
User clicks "+ New Client"
  → ClientForm opens in SlideOver
    → User fills name, type, status
      → useForm validates via clientSchema (Zod)
        → onSubmit: getSupabaseBrowserClient().from('clients').insert(data)
          → Supabase: auto_set_tenant_id trigger sets tenant_id
          → Supabase: next_code() generates CLI-NNNN
          → Supabase: set_version_etag trigger sets etag
            → Response: new client row
              → onSuccess callback refreshes table
                → SlideOver closes
```

### Editing with Optimistic Locking

```
User clicks "Edit" on detail page
  → Form loads with initialData (includes version_etag)
    → User changes fields
      → onSubmit: supabase.from('table')
          .update(data)
          .eq('id', initialData.id)
          .eq('version_etag', initialData.version_etag)
        → IF etag matches: success, new etag generated
        → IF etag doesn't match: "Version conflict" error
          → User refreshes and retries
```

### Schedule → Work Tickets

```
Manager creates recurring shift (site, days, time, staff)
  → For each selected day × weeks:
      INSERT work_tickets (SCHEDULED status)
  → For each ticket × assigned staff:
      INSERT ticket_assignments
  → Grid refreshes: colored shift blocks appear
  → Manager clicks "Publish Period"
    → UPDATE schedule_periods SET status = 'PUBLISHED'
```

### Clock In / Clock Out

```
Staff opens Shifts & Time
  → ClockInButton: checks GPS + captures selfie
    → INSERT time_events (CHECK_IN)
    → INSERT time_entries (OPEN status)
  → ... staff works ...
  → Staff clicks Clock Out
    → Captures GPS + selfie
    → INSERT time_events (CHECK_OUT)
    → UPDATE time_entries: end_at, duration_minutes, status = CLOSED
```

---

## Key Conventions

### File Naming

- Components: `kebab-case.tsx` (e.g., `entity-avatar.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-synced-tab.ts`)
- Modules: `kebab-case.service.ts`, `kebab-case.repository.ts`
- Pages: `page.tsx` (Next.js convention)

### Import Aliases

```tsx
import { ... } from '@gleamops/ui';       // UI components
import { ... } from '@gleamops/shared';   // Types, schemas, constants
import { ... } from '@/hooks/...';        // Web app hooks
import { ... } from '@/lib/...';          // Web app utilities
import { ... } from '@/components/...';   // Web app components
import { ... } from '@/modules/...';      // Service modules
```

### Error Handling

API routes return RFC 9457 Problem Details:

```json
{
  "type": "https://gleamops.com/errors/BID_001",
  "title": "Bid not found",
  "status": 404,
  "detail": "No bid exists with code BID-000123"
}
```

### Supabase Client Selection

| Client | When to use |
|--------|------------|
| `getSupabaseBrowserClient()` | React components (client-side, RLS-scoped) |
| `getSupabaseServerClient()` | Server components & API routes (RLS-scoped) |
| `getSupabaseAdminClient()` | Background jobs, audit logging (bypasses RLS) |
