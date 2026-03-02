# Architecture Overview

> How GleamOps is built. Clean, visual, no jargon.

---

## System Context — Who Uses What

```mermaid
C4Context
    title GleamOps System Context

    Person(owner, "Owner / Admin", "Manages company, clients, staff, billing")
    Person(manager, "Operations Manager", "Schedules shifts, assigns work, reviews quality")
    Person(staff, "Field Staff", "Clocks in, completes tickets, submits counts")
    Person(sales, "Sales Rep", "Creates bids, sends proposals, manages pipeline")

    System(gleamops, "GleamOps", "B2B SaaS ERP for commercial cleaning")

    System_Ext(supabase, "Supabase", "PostgreSQL + Auth + Storage + Realtime")
    System_Ext(vercel, "Vercel", "Hosting + Edge + Cron")
    System_Ext(sendgrid, "SendGrid", "Proposal emails + tracking")

    Rel(owner, gleamops, "Manages everything")
    Rel(manager, gleamops, "Schedules + supervises")
    Rel(staff, gleamops, "Clock in/out + complete work")
    Rel(sales, gleamops, "Pipeline + bidding")
    Rel(gleamops, supabase, "Data + Auth + Files")
    Rel(gleamops, vercel, "Deployed on")
    Rel(gleamops, sendgrid, "Sends proposal emails")
```

---

## Container View — What's Inside

```mermaid
C4Container
    title GleamOps Container Diagram

    Person(user, "User", "Any role")

    Container(web, "Web App", "Next.js 15 + React 19", "Dashboard, forms, schedules, reports")
    Container(worker, "Background Worker", "Edge Functions", "PDF generation, follow-ups, cron jobs")

    ContainerDb(db, "PostgreSQL", "Supabase", "220+ tables with RLS, 134 migrations")
    Container(auth, "Auth Service", "Supabase Auth", "JWT with tenant_id + role")
    Container(storage, "File Storage", "Supabase Storage", "Photos, PDFs, attachments")
    Container(realtime, "Realtime", "Supabase Realtime", "Live updates on dashboards")

    Rel(user, web, "Uses", "HTTPS")
    Rel(web, db, "Queries", "PostgREST + RLS")
    Rel(web, auth, "Authenticates", "JWT")
    Rel(web, storage, "Uploads/downloads")
    Rel(web, realtime, "Subscribes")
    Rel(worker, db, "Service role queries")
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Server-side rendering, routing, API routes |
| **UI** | React 19 + TypeScript 5.7 | Component rendering |
| **Styling** | Tailwind CSS 4 | Semantic token system, dark/light mode |
| **Database** | PostgreSQL (Supabase) | 220+ tables, Row-Level Security |
| **Auth** | Supabase Auth | JWT with tenant isolation |
| **Storage** | Supabase Storage | File uploads (photos, PDFs) |
| **Realtime** | Supabase Realtime | Live dashboard updates |
| **Math Engine** | CleanFlow | Bid calculations (pure TypeScript, no DB deps) |
| **Hosting** | Vercel | Auto-deploy on git push to main |
| **Email** | SendGrid | Proposal sending + webhook tracking |
| **Monorepo** | Turborepo + pnpm | 7 packages, shared types and components |

---

## Package Structure

```mermaid
graph TD
    WEB["@gleamops/web<br/>Next.js App"] --> UI["@gleamops/ui<br/>30 Components"]
    WEB --> SHARED["@gleamops/shared<br/>Types + Constants + Validation"]
    WEB --> CF["@gleamops/cleanflow<br/>Bid Math Engine"]
    SHARED --> DOMAIN["@gleamops/domain<br/>RBAC + Status Machine"]
    UI --> TW["Tailwind CSS 4<br/>Semantic Tokens"]
```

| Package | What It Contains |
|---------|-----------------|
| `@gleamops/web` | The app: 108 API routes, 30 detail pages, 42 forms, 23 hooks |
| `@gleamops/ui` | 30 reusable components (Badge, Button, Card, SlideOver, etc.) |
| `@gleamops/shared` | TypeScript types, Zod schemas, constants, feature flags |
| `@gleamops/domain` | Pure business rules: role checks, status transitions |
| `@gleamops/cleanflow` | Bid math: production rates, workload, pricing |
| `apps/worker` | Background jobs: PDF gen, email follow-ups |
| `apps/mobile` | Expo React Native (future) |

---

## Data Flow — How a Schedule Gets Published

```mermaid
sequenceDiagram
    participant M as Manager
    participant W as Web App
    participant DB as Supabase DB

    M->>W: Click "+ New Shift" on Employee Grid
    W->>W: Open ShiftForm slide-over
    M->>W: Fill in site, time, days, staff
    M->>W: Click "Create Recurring Shift"
    W->>DB: INSERT work_tickets (one per day x weeks)
    DB-->>W: Created ticket IDs
    W->>DB: INSERT ticket_assignments (staff ↔ tickets)
    DB-->>W: Success
    W->>W: Refresh grid (new blocks appear)
    M->>W: Click "Publish Period"
    W->>DB: UPDATE schedule_periods SET status='PUBLISHED'
    DB-->>W: Published
    W->>W: Show success toast
```

---

## Data Flow — Clock In / Clock Out

```mermaid
sequenceDiagram
    participant S as Staff Member
    participant W as Web App
    participant DB as Supabase DB

    S->>W: Navigate to Shifts & Time
    S->>W: Click "Clock In"
    W->>W: Check geolocation (if geofence enabled)
    W->>DB: INSERT time_events (CHECK_IN)
    DB-->>W: Event recorded
    W->>W: Show "Clocked In" status

    Note over S,W: Staff completes shift work

    S->>W: Click "Clock Out"
    W->>DB: INSERT time_events (CHECK_OUT)
    W->>DB: INSERT/UPDATE time_entries (duration calculated)
    DB-->>W: Time entry created
    W->>W: Show shift summary
```

---

## Security Architecture

### Multi-Tenant Isolation

Every table has a `tenant_id` column. Every query is filtered by the logged-in user's tenant.

```
User logs in → JWT contains tenant_id + role
         ↓
Every Supabase query → RLS policy checks: tenant_id = current_tenant_id()
         ↓
User can ONLY see their company's data
```

### Role-Based Access

| Role | What They Can Do |
|------|-----------------|
| OWNER_ADMIN | Everything. Full access to all modules. |
| MANAGER | Schedules, staff, clients, reports. Cannot change system settings. |
| SUPERVISOR | Shift management, team oversight, quality checks. |
| CLEANER | Clock in/out, view assigned shifts, submit counts. |
| INSPECTOR | Quality inspections, issue reporting. |
| SALES | Pipeline, bids, proposals. Cannot access HR or payroll. |

### Data Safety

- **Soft delete only.** Nothing is permanently deleted. Items are archived with `archived_at`.
- **Optimistic locking.** Every update checks `version_etag` to prevent overwrites.
- **Audit trail.** Activity history on every detail page.
- **Status enforcement.** Invalid status transitions are blocked by database triggers.

---

## Deployment

- **Git push to `main`** triggers Vercel auto-deploy.
- **Database migrations** are applied via `supabase db push`.
- **Environment variables** control feature flags (e.g., `NEXT_PUBLIC_FF_V2_NAVIGATION=enabled`).
- **Cron job** runs daily at 13:00 UTC for inventory count reminders.
