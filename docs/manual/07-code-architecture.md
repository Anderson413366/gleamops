# Code Architecture — Deep Dive

> How GleamOps is built, folder by folder. Every file listed. For developers and AI agents.

---

## Complete Monorepo Tree

```
gleamops/
├── apps/
│   ├── web/                           Next.js 15 — the product
│   │   └── src/
│   │       ├── app/                   Routes (see "App Layout Tree" below)
│   │       ├── components/            Reusable UI (see "Components Tree" below)
│   │       ├── hooks/                 21 custom hooks (see "Hooks" below)
│   │       ├── lib/                   Utilities (see "Lib Tree" below)
│   │       └── modules/              28 service modules (see "Modules" below)
│   │
│   ├── worker/                        Background jobs (PDF gen, email follow-ups)
│   │   └── src/
│   │       └── index.ts
│   │
│   └── mobile/                        Expo React Native (in development)
│       └── src/
│           └── App.tsx
│
├── packages/
│   ├── shared/                        Types, Zod schemas, constants, feature flags, errors
│   │   └── src/
│   │       ├── types/
│   │       │   ├── database.ts        All Supabase table interfaces
│   │       │   └── app.ts            UserRole, NavSpace, NavItem, ModuleKey, ProblemDetails
│   │       ├── constants/
│   │       │   ├── index.ts          NAV_TREE, MODULE_ACCENTS, getModuleFromPathname(), status colors
│   │       │   └── feature-flags.ts  17 feature flag domains + getFeatureFlags()
│   │       ├── validation/
│   │       │   ├── client.ts         clientSchema, siteSchema, contactSchema
│   │       │   ├── pipeline.ts       prospectSchema, bidSchema, convertBidSchema
│   │       │   ├── staff.ts          staffSchema
│   │       │   └── ...               Other Zod schemas
│   │       └── errors/
│   │           └── index.ts          createProblemDetails(), error catalog (RFC 9457)
│   │
│   ├── domain/                        Pure business rules — RBAC, status machine
│   │   └── src/
│   │       └── index.ts              canAccess(), status transition validators
│   │
│   ├── cleanflow/                     Bid math engine — production rates → workload → pricing
│   │   └── src/
│   │       └── index.ts              Pure functions, zero DB deps
│   │
│   └── ui/                            Design system — 27 components
│       └── src/
│           ├── components/            (see "UI Components" below)
│           ├── utils.ts              cn() — clsx + tailwind-merge
│           └── index.ts              Barrel export
│
├── supabase/
│   ├── migrations/                    134 SQL files (19,682 lines)
│   │   ├── 00001_*.sql               Foundation tables
│   │   ├── ...
│   │   └── 20260302_*.sql            Empty Tables Audit
│   └── functions/                     Edge Functions (Deno)
│
├── docs/
│   ├── manual/                        Instruction manual (this folder)
│   │   ├── modules/                   15 module guides + 15 references
│   │   └── *.md                       Foundation + developer docs
│   └── *.md                           21 reference docs
│
├── openapi/
│   └── openapi.yaml                   OpenAPI 3.1 contract
│
├── CLAUDE.md                          AI development context
├── README.md                          Project overview
├── package.json                       Root workspace config
├── pnpm-workspace.yaml                Workspace package list
├── turbo.json                         Turborepo pipeline config
└── tsconfig.json                      Root TypeScript config
```

---

## App Layout Tree (Every Page + Route)

This is the complete `apps/web/src/app/` directory. Every `page.tsx` is a rendered page. Every `route.ts` is an API endpoint.

```
src/app/
├── layout.tsx                                    Root layout (HTML, fonts, theme script)
├── page.tsx                                      Root redirect → /home
├── globals.css                                   Theme tokens (light/dark/OLED + sidebar)
├── offline/page.tsx                              Offline fallback page
│
├── (auth)/
│   └── login/page.tsx                            Login page (standalone layout, no sidebar)
│
├── auth/
│   └── callback/route.ts                         OAuth callback handler
│
├── (dashboard)/                                  ┌─────────────────────────────────────┐
│   ├── layout.tsx                                │ Authenticated layout: Sidebar+Header │
│   │                                             └─────────────────────────────────────┘
│   │   ── CANONICAL MODULES (in sidebar) ──
│   │
│   ├── home/
│   │   └── page.tsx                              Dashboard — KPI widgets, alerts, feed
│   │
│   ├── schedule/
│   │   ├── page.tsx                              Schedule — 12 tabs (recurring, calendar, boards...)
│   │   └── work-orders/
│   │       ├── page.tsx                          Work orders list
│   │       └── work-order-detail/page.tsx        Work order detail
│   │
│   ├── jobs/
│   │   ├── page.tsx                              Jobs — service plans, tickets, inspections, time
│   │   ├── checklists/page.tsx                   Checklists sub-page
│   │   └── forms/page.tsx                        Forms sub-page
│   │
│   ├── clients/
│   │   ├── page.tsx                              Clients — clients, sites, contacts, requests
│   │   ├── [id]/page.tsx                         Client detail page
│   │   ├── sites/
│   │   │   └── [id]/page.tsx                     Site detail page
│   │   └── contacts/
│   │       └── [code]/page.tsx                   Contact detail page
│   │
│   ├── pipeline/
│   │   ├── page.tsx                              Pipeline — prospects, opportunities, bids, proposals
│   │   ├── admin/page.tsx                        Pipeline admin (rates, templates, marketing)
│   │   ├── calculator/page.tsx                   CleanFlow bid calculator
│   │   ├── supply-calculator/page.tsx            Supply cost calculator
│   │   ├── prospects/
│   │   │   └── [id]/page.tsx                     Prospect detail
│   │   ├── opportunities/
│   │   │   └── [id]/page.tsx                     Opportunity detail
│   │   ├── bids/
│   │   │   └── [id]/page.tsx                     Bid detail
│   │   └── proposals/
│   │       └── [id]/page.tsx                     Proposal detail
│   │
│   ├── catalog/
│   │   └── page.tsx                              Catalog — tasks, services, mapping, scope library
│   │
│   ├── team/
│   │   ├── page.tsx                              Team — staff, positions, attendance, payroll, HR
│   │   ├── staff/
│   │   │   ├── page.tsx                          Staff list (alternate entry)
│   │   │   └── [code]/page.tsx                   Staff detail
│   │   ├── employees/
│   │   │   └── [code]/page.tsx                   Employee detail (alias)
│   │   └── positions/
│   │       └── [code]/page.tsx                   Position detail
│   │
│   ├── inventory/
│   │   ├── page.tsx                              Inventory — supplies, kits, counts, orders, warehouse
│   │   ├── supplies/
│   │   │   └── [id]/page.tsx                     Supply detail
│   │   └── counts/
│   │       └── [id]/page.tsx                     Inventory count detail
│   │
│   ├── equipment/
│   │   └── page.tsx                              Equipment — equipment, keys, vehicles, maintenance
│   │
│   ├── safety/
│   │   └── page.tsx                              Safety — certifications, training, incidents
│   │
│   ├── reports/
│   │   └── page.tsx                              Reports — ops, sales, financial, quality, workforce
│   │
│   ├── settings/
│   │   └── page.tsx                              Settings — lookups, geofences, rules, import
│   │
│   ├── shifts-time/
│   │   └── page.tsx                              Shifts & Time — clock in/out, timesheets (role-gated)
│   │
│   │   ── LEGACY ROUTES (still work, not in sidebar) ──
│   │
│   ├── crm/
│   │   ├── page.tsx                              Redirects → /clients
│   │   ├── clients/
│   │   │   ├── page.tsx                          Legacy client list
│   │   │   └── [id]/page.tsx                     Legacy client detail
│   │   ├── sites/
│   │   │   ├── page.tsx                          Legacy site list
│   │   │   └── [id]/page.tsx                     Legacy site detail
│   │   └── contacts/
│   │       ├── page.tsx                          Legacy contact list
│   │       └── [code]/page.tsx                   Legacy contact detail
│   │
│   ├── operations/
│   │   ├── page.tsx                              Operations hub — complaints, periodic, task-catalog
│   │   ├── complaints/
│   │   │   └── [code]/page.tsx                   Complaint detail
│   │   ├── jobs/
│   │   │   └── [id]/page.tsx                     Job (service plan) detail
│   │   ├── tickets/
│   │   │   └── [id]/page.tsx                     Ticket detail
│   │   ├── periodic/
│   │   │   └── [code]/page.tsx                   Periodic task detail
│   │   └── task-catalog/
│   │       ├── page.tsx                          Task catalog list
│   │       └── [id]/page.tsx                     Task catalog detail
│   │
│   ├── workforce/
│   │   ├── page.tsx                              Workforce — field reports
│   │   ├── field-reports/
│   │   │   └── [code]/page.tsx                   Field report detail
│   │   ├── staff/
│   │   │   └── [code]/page.tsx                   Legacy staff detail
│   │   └── positions/
│   │       └── [code]/page.tsx                   Legacy position detail
│   │
│   ├── assets/
│   │   ├── page.tsx                              Assets — alias for /equipment
│   │   ├── equipment/
│   │   │   └── [code]/page.tsx                   Equipment detail
│   │   ├── keys/
│   │   │   └── [id]/page.tsx                     Key detail
│   │   └── vehicles/
│   │       └── [id]/page.tsx                     Vehicle detail
│   │
│   ├── services/
│   │   ├── page.tsx                              Services — alias for /catalog
│   │   └── tasks/
│   │       └── [id]/page.tsx                     Task detail
│   │
│   ├── vendors/
│   │   ├── page.tsx                              Vendors hub
│   │   ├── subcontractors/
│   │   │   ├── page.tsx                          Subcontractor list
│   │   │   └── [code]/page.tsx                   Subcontractor detail
│   │   └── supply-vendors/
│   │       └── [slug]/page.tsx                   Supply vendor detail
│   │
│   └── admin/
│       ├── page.tsx                              Admin hub
│       ├── playground/page.tsx                   Dev playground
│       ├── staff-positions/page.tsx              Position type management
│       └── services/
│           ├── page.tsx                          Service management
│           └── tasks/
│               └── [id]/page.tsx                 Task detail (admin)
│
│   ── PUBLIC PAGES (no auth required) ──
│
├── proposal/
│   └── [token]/
│       ├── layout.tsx                            Public proposal layout
│       └── page.tsx                              Public proposal view + signature
│
├── count/
│   └── [token]/page.tsx                          Public inventory count form
│
└── public/
    ├── forms/
    │   └── [token]/page.tsx                      Public form submission
    ├── portal/
    │   ├── page.tsx                              Customer portal login
    │   └── [token]/
    │       ├── layout.tsx                        Portal layout
    │       ├── page.tsx                          Portal dashboard
    │       ├── complaints/
    │       │   ├── page.tsx                      Portal complaints list
    │       │   └── new/page.tsx                  Submit complaint
    │       ├── feedback/
    │       │   └── new/page.tsx                  Submit feedback
    │       └── inspections/
    │           ├── page.tsx                      Portal inspections list
    │           └── [id]/page.tsx                 Inspection detail
    └── work-orders/
        └── [token]/page.tsx                      Public work order view
```

---

## API Routes Tree (108 endpoints)

```
src/app/api/
├── codes/next/route.ts                           Generate next entity code
├── contracts/route.ts                            Contract management
├── cron/
│   └── inventory-count-reminders/route.ts        Daily 13:00 UTC cron
├── finance/invoices/route.ts                     Invoice data
├── integrations/connections/route.ts             Integration connections
├── inventory/
│   ├── approvals/route.ts                        Inventory approval workflows
│   ├── orders/[id]/pod/route.ts                  Proof of delivery
│   └── warehouse/route.ts                        Warehouse operations
├── issues/route.ts                               Issue tracking
├── messages/route.ts                             Thread messaging
├── operations/
│   ├── complaints/
│   │   ├── route.ts                              List/create complaints
│   │   └── [code]/
│   │       ├── route.ts                          Get/update complaint
│   │       ├── inject-route/route.ts             Inject complaint into route
│   │       ├── photos/after/route.ts             After-photos
│   │       ├── photos/before/route.ts            Before-photos
│   │       ├── resolve/route.ts                  Mark resolved
│   │       └── send-resolution/route.ts          Email resolution
│   ├── customer-portal/
│   │   └── sessions/
│   │       ├── route.ts                          Portal sessions
│   │       └── [id]/archive/route.ts             Archive session
│   ├── field-reports/
│   │   ├── route.ts                              List/create field reports
│   │   ├── my/route.ts                           My reports
│   │   └── [code]/route.ts                       Get/update report
│   ├── fleet/workflow/route.ts                   DVIR workflow
│   ├── night-bridge/
│   │   ├── route.ts                              Night bridge list
│   │   └── [routeId]/
│   │       ├── route.ts                          Get bridge
│   │       └── review/route.ts                   Review handoff
│   ├── periodic-tasks/
│   │   ├── route.ts                              List/create
│   │   └── [code]/
│   │       ├── route.ts                          Get/update
│   │       ├── archive/route.ts                  Archive
│   │       └── complete/route.ts                 Mark complete
│   ├── route-templates/
│   │   ├── route.ts                              List/create templates
│   │   ├── [id]/
│   │   │   ├── route.ts                          Get/update template
│   │   │   ├── archive/route.ts                  Archive template
│   │   │   └── stops/route.ts                    Template stops
│   │   ├── stops/[id]/
│   │   │   ├── route.ts                          Get/update stop
│   │   │   └── tasks/route.ts                    Stop tasks
│   │   └── tasks/[id]/route.ts                   Get/update task
│   ├── routes/
│   │   ├── generate/route.ts                     Generate routes
│   │   ├── [id]/
│   │   │   ├── start-shift/route.ts              Start shift
│   │   │   ├── end-shift/route.ts                End shift
│   │   │   └── load-sheet/route.ts               Load sheet
│   │   └── stops/
│   │       ├── [id]/
│   │       │   ├── arrive/route.ts               Arrive at stop
│   │       │   ├── complete/route.ts             Complete stop
│   │       │   └── skip/route.ts                 Skip stop
│   │       └── tasks/[id]/
│   │           ├── complete/route.ts             Complete task
│   │           └── photo/route.ts                Upload photo
│   ├── schedule/
│   │   ├── availability/
│   │   │   ├── route.ts                          Staff availability
│   │   │   └── [id]/archive/route.ts             Archive availability
│   │   ├── conflicts/route.ts                    Schedule conflicts
│   │   ├── periods/
│   │   │   ├── route.ts                          List/create periods
│   │   │   └── [id]/
│   │   │       ├── lock/route.ts                 Lock period
│   │   │       ├── publish/route.ts              Publish period
│   │   │       └── validate/route.ts             Validate period
│   │   └── trades/
│   │       ├── route.ts                          Shift trades
│   │       └── [id]/
│   │           ├── accept/route.ts
│   │           ├── apply/route.ts
│   │           ├── approve/route.ts
│   │           ├── cancel/route.ts
│   │           └── deny/route.ts
│   └── shifts-time/
│       ├── callouts/
│       │   ├── offers/
│       │   │   ├── route.ts                      Callout offers
│       │   │   └── [id]/accept/route.ts          Accept offer
│       │   └── report/route.ts                   Callout report
│       ├── payroll/
│       │   ├── finalize/route.ts                 Finalize payroll
│       │   ├── preview/route.ts                  Preview payroll
│       │   └── mappings/
│       │       ├── route.ts                      Payroll mappings
│       │       └── [id]/
│       │           ├── route.ts                  Get/update mapping
│       │           └── fields/route.ts           Mapping fields
│       ├── stops/[id]/
│       │   ├── start/route.ts                    Start stop
│       │   └── complete/route.ts                 Complete stop
│       ├── tickets/[id]/
│       │   ├── start/route.ts                    Start ticket
│       │   └── complete/route.ts                 Complete ticket
│       ├── tonight-board/route.ts                Tonight's board
│       └── travel/capture/route.ts               Capture travel
├── payroll/runs/route.ts                         Payroll runs
├── proposals/
│   ├── send/route.ts                             Send proposal email
│   └── [id]/
│       ├── generate-pdf/route.ts                 Generate PDF
│       └── signature/route.ts                    Capture signature
├── public/                                       ── Unauthenticated ──
│   ├── counts/[token]/
│   │   ├── route.ts                              Get count form
│   │   ├── photos/route.ts                       Count photos
│   │   ├── save/route.ts                         Save progress
│   │   └── submit/route.ts                       Submit count
│   ├── forms/[token]/
│   │   ├── route.ts                              Get public form
│   │   └── submit/route.ts                       Submit form
│   ├── portal/
│   │   ├── auth/route.ts                         Portal auth
│   │   └── [token]/
│   │       ├── route.ts                          Portal data
│   │       ├── change-requests/route.ts          Change requests
│   │       ├── complaints/route.ts               Portal complaints
│   │       ├── dashboard/route.ts                Portal dashboard
│   │       ├── feedback/route.ts                 Portal feedback
│   │       ├── inspections/
│   │       │   ├── route.ts                      List inspections
│   │       │   └── [id]/route.ts                 Inspection detail
│   │       └── work-tickets/route.ts             Work tickets
│   ├── proposals/[token]/
│   │   ├── route.ts                              View proposal
│   │   └── sign/route.ts                         Sign proposal
│   └── work-orders/[token]/
│       ├── route.ts                              View work order
│       └── complete/route.ts                     Complete work order
├── reports/
│   ├── owner-dashboard/route.ts                  Dashboard data
│   └── supply-costs/
│       ├── route.ts                              Supply cost report
│       └── [siteId]/route.ts                     Per-site costs
├── sites/[id]/pin/route.ts                       Site PIN management
├── staff/link-self/route.ts                      Link auth user → staff
├── timekeeping/pin-checkin/route.ts              PIN-based clock in
├── webhooks/sendgrid/route.ts                    SendGrid event webhook
└── workforce/
    ├── hr/[entity]/route.ts                      Polymorphic HR CRUD
    └── microfiber/
        ├── route.ts                              Microfiber tracking
        ├── export/route.ts                       Export data
        └── [staffId]/
            ├── enroll/route.ts                   Enroll staff
            └── exit/route.ts                     Exit staff
```

---

## Components Tree

```
src/components/
├── forms/                                        38 entity form components
│   ├── biohazard-report-form.tsx
│   ├── client-form.tsx
│   ├── complaint-form.tsx
│   ├── completion-template-form.tsx
│   ├── contact-form.tsx
│   ├── equipment-assignment-form.tsx
│   ├── equipment-form.tsx
│   ├── equipment-issue-form.tsx
│   ├── geofence-form.tsx
│   ├── inventory-count-form.tsx
│   ├── job-form.tsx
│   ├── key-form.tsx
│   ├── lookup-form.tsx
│   ├── lookup-select.tsx
│   ├── maintenance-form.tsx
│   ├── opportunity-form.tsx
│   ├── periodic-task-form.tsx
│   ├── position-form.tsx
│   ├── production-rate-form.tsx
│   ├── prospect-form.tsx
│   ├── resolution-email-preview.tsx
│   ├── route-template-form.tsx
│   ├── route-template-stop-form.tsx
│   ├── route-template-task-form.tsx
│   ├── site-form.tsx
│   ├── site-issue-form.tsx
│   ├── staff-form.tsx
│   ├── subcontractor-form.tsx
│   ├── supply-form.tsx
│   ├── supply-order-form.tsx
│   ├── supply-request-form.tsx
│   ├── supply-usage-form.tsx
│   ├── supply-vendor-form.tsx
│   ├── task-form.tsx
│   ├── time-off-request-form.tsx
│   ├── training-course-form.tsx
│   ├── vehicle-form.tsx
│   └── work-order-form.tsx
│
├── layout/                                       App shell
│   ├── app-shell.tsx                             Sidebar + Header + content wrapper
│   ├── header.tsx                                Frosted glass header + user menu + theme toggle
│   ├── sidebar.tsx                               Hierarchical sidebar (NAV_TREE + accordion)
│   └── navigation-tooltip-tour.tsx               First-time nav tooltips
│
├── detail/                                       Detail page building blocks
│   ├── profile-completeness-card.tsx             Field completeness progress tracker
│   └── status-toggle-dialog.tsx                  Deactivate/Reactivate confirmation
│
├── directory/                                    Entity display
│   ├── entity-avatar.tsx                         Avatar with WCAG-safe contrast initials
│   └── entity-card.tsx                           Card component for grid views
│
├── activity/
│   └── activity-history-section.tsx              Audit trail on detail pages
│
├── links/
│   └── entity-link.tsx                           Cross-entity clickable link
│
├── clock-in-button.tsx                           Clock in/out with GPS + selfie verification
└── gps-location-badge.tsx                        Geofence status indicator
```

---

## Hooks (21 files)

```
src/hooks/
├── use-auth.ts                  Auth state: { user, tenantId, role, loading, signOut }
├── use-barcode-scanner.ts       Barcode scanning (mobile)
├── use-bulk-select.ts           Multi-row selection: { selected, toggle, selectAll, clear }
├── use-camera.ts                Camera access for selfie verification
├── use-density.ts               Comfortable/compact table density toggle
├── use-feature-flag.ts          Env-var feature flag check → boolean
├── use-form.ts                  Form state + Zod validation + submit
├── use-geolocation.ts           GPS with geofence distance check
├── use-locale.ts                i18n: { locale, setLocale, t } (EN, ES, PT-BR)
├── use-lookups.ts               Lookup data fetching + 13 preset hooks
├── use-media-query.ts           CSS media query matching → boolean
├── use-offline-mutation-sync.ts Offline mutation queue + sync
├── use-pagination.ts            Client-side pagination (25/page default)
├── use-position-types.ts        Dynamic position type colors from DB
├── use-realtime.ts              Supabase realtime channel subscriptions
├── use-role.ts                  RBAC: { can, isAtLeast, isAdmin, isManager }
├── use-synced-tab.ts            URL ?tab= sync with aliases
├── use-table-sort.ts            Client-side column sorting
├── use-theme.ts                 Dark/light/OLED theme toggle
├── use-ui-preferences.ts        UI state preferences (localStorage)
└── use-view-preference.ts       List/card view toggle (localStorage)
```

---

## Service Modules (28 domains)

```
src/modules/
├── complaints/                  Customer complaints
│   ├── complaints.service.ts
│   ├── complaints.repository.ts
│   └── index.ts
├── counts/                      Inventory count submission
├── cron/                        Scheduled jobs
├── field-reports/               Field inspection reports
├── fleet/                       DVIR vehicle inspections
├── inventory/                   Approval workflows
├── inventory-orders/            Proof of delivery
├── load-sheet/                  Load sheet generation
├── messages/                    Thread messaging
├── night-bridge/                Overnight shift handoffs
├── owner-dashboard/             Owner analytics dashboard
├── periodic-tasks/              Recurring task management
├── proposals/                   Send + signature capture
├── proposals-pdf/               PDF generation
├── public-counts/               Public count access (unauthenticated)
├── public-portal/               Customer portal
├── public-proposals/            Public proposal access
├── public-work-orders/          Public work order access
├── route-templates/             Route template management
├── schedule/                    Schedule routes (dual-client + permissions)
│   ├── schedule.service.ts
│   ├── schedule.repository.ts
│   ├── schedule.permissions.ts
│   └── index.ts
├── self-service/                Employee self-service
├── shifts-time/                 Shifts & time tracking
├── sites/                       Site PIN codes
├── timekeeping/                 Clock in/out
├── warehouse/                   Warehouse inventory
├── webhooks/                    SendGrid event processing
└── workforce-hr/                Polymorphic HR CRUD (6 entities)
```

Each module follows the **golden pattern:**
- `{domain}.service.ts` — Business logic, returns `ServiceResult<T>`
- `{domain}.repository.ts` — Supabase queries, data access
- `index.ts` — Barrel export

---

## Lib Tree

```
src/lib/
├── supabase/
│   ├── client.ts                Browser client (RLS-scoped, for React components)
│   ├── server.ts                Server client (RLS-scoped, for API routes)
│   └── admin.ts                 Service role client (bypasses RLS, for background jobs)
├── auth/
│   └── guard.ts                 Auth check helper for API route handlers
├── staff/
│   └── resolve-current-staff.ts Map current auth user → staff record
├── timekeeping/
│   └── breaks.ts                Break event utilities (summarize, diff)
└── utils/
    ├── color-contrast.ts        WCAG luminance → text color (getContrastTextColor)
    ├── date.ts                  Date formatting helpers
    ├── format-zip.ts            ZIP code formatting
    ├── job-financials.ts        Job financial calculations
    └── status-colors.ts         Status → Tailwind color mapping (with dark: variants)
```

---

## UI Components (27 files)

```
packages/ui/src/components/
├── archive-dialog.tsx           Archive confirmation with reason field
├── badge.tsx                    Status badges (7-color: green/red/yellow/blue/orange/purple/gray)
├── button.tsx                   Button with size/variant system
├── card.tsx                     Card, CardHeader, CardTitle, CardContent
├── chip-tabs.tsx                Pill-style tab navigation with count badges
├── collapsible-card.tsx         Collapsible card with localStorage persistence
├── command-palette.tsx          Global search (Cmd+K)
├── confirm-dialog.tsx           Confirmation dialog
├── data-table.tsx               Table, TableHeader, TableHead, TableBody, TableRow, TableCell
├── density-toggle.tsx           Comfortable/compact density toggle
├── empty-state.tsx              Empty state placeholder
├── export-button.tsx            CSV export with toast feedback
├── file-dropzone.tsx            File upload zone
├── form-section.tsx             Form section layout
├── form-wizard.tsx              Multi-step form wizard with step indicator
├── input.tsx                    Text input
├── pagination.tsx               Pagination with prev/next, item count
├── search-input.tsx             Search input with debounce + clear
├── select.tsx                   Select dropdown
├── skeleton.tsx                 Loading skeleton
├── slide-over.tsx               Slide-over panel (right drawer or centered modal)
├── stat-card.tsx                Dashboard stat display card
├── status-pill.tsx              Status pill badge
├── table-row-visuals.tsx        StatusDot, resolveStatusColor, statusRowAccentClass
├── textarea.tsx                 Textarea input
├── tooltip.tsx                  Help icon tooltip
└── view-toggle.tsx              List/Card view toggle
```

---

## Package Dependency Graph

```
packages/domain    ← no deps (pure rules)
packages/cleanflow ← no deps (pure math)
packages/shared    ← depends on domain
packages/ui        ← depends on shared (uses cn utility)
apps/web           ← depends on shared + ui + cleanflow
apps/worker        ← depends on shared
apps/mobile        ← depends on shared (future)
```

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
```

### Schedule → Work Tickets

```
Manager creates recurring shift (site, days, time, staff)
  → For each selected day × weeks ahead:
      INSERT work_tickets (SCHEDULED status)
  → For each ticket × assigned staff:
      INSERT ticket_assignments
  → Grid refreshes: colored shift blocks appear
  → Manager clicks "Publish Period"
    → UPDATE schedule_periods SET status = 'PUBLISHED'
```

### Clock In / Clock Out

```
Staff opens Shifts & Time → ClockInButton
  → Capture GPS location (geofence check)
  → Capture selfie (camera)
  → INSERT time_events (CHECK_IN)
  → INSERT time_entries (OPEN status)
  → ... staff works ...
  → Staff clicks Clock Out
  → Capture GPS + selfie
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
- API routes: `route.ts` (Next.js convention)

### Import Aliases

```tsx
import { ... } from '@gleamops/ui';       // UI components
import { ... } from '@gleamops/shared';   // Types, schemas, constants
import { ... } from '@/hooks/...';        // Web app hooks
import { ... } from '@/lib/...';          // Web app utilities
import { ... } from '@/components/...';   // Web app components
import { ... } from '@/modules/...';      // Service modules
```

### Supabase Client Selection

| Client | When to use |
|--------|------------|
| `getSupabaseBrowserClient()` | React components (client-side, RLS-scoped) |
| `getSupabaseServerClient()` | Server components & API routes (RLS-scoped) |
| `getSupabaseAdminClient()` | Background jobs, audit logging (bypasses RLS) |

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
