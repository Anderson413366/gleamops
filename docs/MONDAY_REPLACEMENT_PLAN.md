# MONDAY.COM REPLACEMENT — Implementation Plan for Codex

> **This file is the single source of truth for building the Monday.com replacement
> features in GleamOps.** Execute each phase sequentially. Read `CLAUDE.md` at project
> root before starting any phase.

---

## Codex Execution Instructions

### Before You Start
1. Read `/CLAUDE.md` — it defines every pattern, convention, and non-negotiable rule.
2. Read `/docs/P0_SCHEMA_CONTRACT.md` — existing database schema contract.
3. Run `pnpm typecheck` to confirm the project builds clean before making changes.

### Per-Phase Workflow
For each phase below:
1. **Database**: Create the SQL migration file in `supabase/migrations/` with the next sequential number (starting at `00089`).
   - Every table must include: `tenant_id UUID NOT NULL`, `created_at`, `updated_at`, `archived_at`, `archived_by`, `archive_reason`, `version_etag`.
   - Every table must have RLS policies following the pattern in existing migrations.
   - Use `gen_random_uuid()` for primary keys.
   - Use `next_code(tenant_id, prefix, digits)` for human-readable codes.
2. **Shared package**: Add TypeScript types to `packages/shared/src/types/` and Zod schemas to `packages/shared/src/validation/`. Export from `packages/shared/src/index.ts`.
3. **i18n**: Add all new translation keys to `packages/shared/src/i18n.ts` in the `en`, `es`, and `ptBR` dictionaries.
4. **API routes**: Create service modules following the golden module pattern (`{domain}.service.ts` + `{domain}.repository.ts` + `index.ts`) in `apps/web/src/modules/`. Create API route handlers in `apps/web/src/app/api/`.
5. **Web UI**: Create components in the correct `apps/web/src/app/(dashboard)/` directory. Follow the 5 code patterns in CLAUDE.md (module page, table, detail page, card grid, form).
6. **Mobile**: Create screens in `apps/mobile/app/` and hooks in `apps/mobile/src/hooks/`.
7. **Quality gate**: After each phase, run `pnpm lint && pnpm typecheck && pnpm build`.

### Key Conventions (from CLAUDE.md)
- **Monorepo**: Turborepo v2+ with pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + RLS + Auth + Storage + Realtime)
- **Mobile**: Expo React Native with expo-router, @tanstack/react-query, offline sync
- **UI Library**: `@gleamops/ui` — 32 components, semantic HSL token system
- **Soft delete everywhere**: `archived_at` column, never hard delete
- **Optimistic locking**: `version_etag UUID` + If-Match on updates
- **Dual-key pattern**: Every entity has `id UUID` (internal) + `*_code TEXT` (human-readable)
- **Golden module pattern**: `{domain}.service.ts` + `{domain}.repository.ts` + `index.ts`
- **RLS-first security**: Every tenant table has `tenant_id = current_tenant_id()` policy
- **Problem Details errors**: RFC 9457 style, stable error codes
- **No invoicing/payments/taxes** — ever
- **Neuroinclusive UX**: ADHD (progressive disclosure), Dyslexia (spacing/scanning), Anxiety (predictability)

### Existing Migration Count
Plan baseline: 88 migration files (`00001` through `00088`), with this implementation plan starting at `00089`.
Current repository state: 109 migration files (`00001` through `00109`), including Monday replacement migrations (`00089`-`00099`) plus shifts/time migrations (`00100`-`00109`).

### Project Root
```
/Users/andersongomes/claude_sandbox/gleamops_dev_pack/
```

---

## Implementation Status Snapshot (2026-02-26)

- Phases 1 through 8 in this plan are implemented.
- PT-BR i18n backfill is complete (EN/ES/PT-BR parity in `packages/shared/src/i18n.ts`).
- Migration train for this plan is complete through `00099` (overall linked project parity currently through `00109`).
- Web deployment is live on `https://gleamops.vercel.app`.
- Mobile deployment status:
  - Android production build requested (`6e45a8e0-4161-4304-a4a3-a136f22837eb`).
  - iOS release is pending Apple Developer account setup.

---

## Codebase Audit: What Already Exists vs. What Must Be Built

### What Already Exists (Do NOT Rebuild)

| Capability | Where It Lives | Status |
|---|---|---|
| **Site management** (clients, sites, contacts) | `/crm` module + `sites` table + detail pages | DONE |
| **Jobs / Service Plans** | `/operations/jobs` + `site_jobs` table | DONE |
| **Work Tickets** (the nucleus) | `/operations/tickets` + `work_tickets` table | DONE |
| **Inspections** (templates, scoring, issues) | `/operations/inspections` + mobile app tab | DONE |
| **Routes** (basic route + stops + vehicle checkout) | `/operations/routes` + `daily_routes`, `route_stops`, `vehicle_checkouts` tables | DONE (extended by Phase 1 + shift flow support) |
| **Schedule** (recurring, calendar, planning board, shift trades, forms, checklists) | `/schedule` module, 13 schedule API routes | DONE |
| **Inventory** (supply catalog, site assignments, counts with photo proof, orders, kits, warehouse, forecasting) | `/inventory` module + `supply_catalog`, `supply_assignments`, `inventory_counts`, `supply_orders` tables | DONE |
| **Vehicles** (registry, checkout, maintenance, DVIR) | `/assets/vehicles` + `vehicles`, `vehicle_checkouts`, `vehicle_maintenance`, `fleet_dvir` tables | DONE |
| **Keys** (key inventory, assignments, custody tracking) | `/assets/keys` + `key_inventory` table | DONE |
| **Equipment** (equipment + assignments) | `/assets/equipment` + `equipment`, `equipment_assignments` tables | DONE |
| **Staff / Workforce** (staff, positions, payroll, timekeeping, timesheets, HR lite) | `/workforce` module + `staff`, `staff_positions`, `time_entries` tables | DONE |
| **Subcontractors** | `/vendors` module + `subcontractors` table | DONE |
| **Messaging** (threads, direct/group/ticket-context) | `/workforce/messages` + `message_threads` table | DONE |
| **i18n** (EN, ES, FR, PT-BR, RO with `t()` function, `useLocale()` hook) | `packages/shared/src/i18n.ts` + `apps/web/src/hooks/use-locale.ts` | DONE (EN/ES/PT-BR parity complete) |
| **RBAC** (OWNER_ADMIN, MANAGER, SUPERVISOR, CLEANER, INSPECTOR, SALES) | `packages/domain` + `useRole()` hook + RLS | DONE |
| **Mobile app** (Expo, tabs: Today, Tickets, Inspections, Clock, Profile, offline sync) | `apps/mobile/` | DONE (floater route and specialist workflows implemented) |
| **Geofence alerts** | `/operations/geofence` + `geofences`, `alerts` tables | DONE |
| **Custom forms builder** | `/operations/custom-forms` | PARTIAL |
| **Checklists** (admin templates + shift checklists) | `/schedule/checklists` | DONE |
| **Site details** (janitorial closet, supply storage, water source, dumpster, security protocol, entry instructions, parking instructions, access notes) | `sites` table columns | DONE |

### What Is MISSING (Must Build)

Status update (2026-02-26): all capabilities in this table have been implemented. The table is preserved as original planning context.

| # | Capability | What's Needed | Priority |
|---|---|---|---|
| 1 | **Night Bridge (Shift Handoff)** | Structured evening→morning handoff dashboard | HIGH |
| 2 | **Load Sheet** | Auto-calculated vehicle load from delivery tasks | HIGH |
| 3 | **Floater Route Experience (Mobile)** | Guided step-by-step mobile route for floaters | HIGH |
| 4 | **Specialist "My Site" View (Mobile)** | Simplified mobile view for cleaning specialists | HIGH |
| 5 | **Complaint Intake + Resolution** | Complaint→ticket→photos→resolution→customer email | HIGH |
| 6 | **Customer Portal** | Portal for inspections, complaints, work tickets | HIGH |
| 7 | **Field Quick Forms** | Mobile forms for supply requests, day-off requests, incidents | HIGH |
| 8 | **Periodic Task Scheduler** | Non-daily recurring tasks (biweekly, monthly, quarterly) | MEDIUM |
| 9 | **Supply Chain / Auto-Reorder** | Inventory→low-stock alerts→suggested purchase orders | MEDIUM |
| 10 | **Site Procedures Editor** | Rich text cleaning procedures per site with photos | MEDIUM |
| 11 | **Microfiber Program Tracking** | Enrollment, per-payroll reporting | LOW |
| 12 | **Owner Dashboard** | KPI snapshot, alerts, supply costs by site | MEDIUM |
| 13 | **Monthly Vehicle Inspection** | Scheduled monthly checklist (extend existing DVIR) | LOW |
| 14 | **i18n Completion** | Fill PT-BR translations for entire app | MEDIUM |
| 15 | **Route Template Management** | Weekday-based recurring route templates for auto-generation | HIGH |

---

---

## How This Plan Is Organized

Each phase below contains:
- **Purpose** — What this phase replaces from Monday.com and why it matters
- **Database Changes** — Exact SQL for new tables and ALTER statements (migration file `00089_...` onwards)
- **Shared Package Changes** — TypeScript types, Zod schemas, i18n keys
- **API Routes** — New endpoints following the golden module pattern
- **Web UI Components** — Exact file paths, which patterns to follow
- **Mobile Changes** — Expo screens and hooks
- **Integration Points** — How this phase connects to existing modules
- **Acceptance Criteria** — What "done" looks like

---

## Phase 1: Route Templates + Route Generation Engine

### Purpose
Replaces Monday.com's manual workflow of duplicating weekday task groups ("Duplicate of Duplicate of Mondays - Tasks/Recurring"). The system auto-generates tomorrow's routes from weekday templates. Paulette reviews and publishes. Floaters see a guided route on their phone.

### What Already Exists
- **`routes`** table (migration `00065`) — has `id`, `tenant_id`, `route_date`, `route_owner_staff_id`, `route_type` (DAILY_ROUTE, MASTER_ROUTE, PROJECT_ROUTE), `status` (DRAFT, PUBLISHED, COMPLETED)
- **`route_stops`** table (migration `00065`) — has `id`, `tenant_id`, `route_id`, `site_job_id`, `stop_order`, `estimated_travel_minutes`, `is_locked`
- **`vehicle_checkouts`** table (migration `00045`) — has `checkout_odometer`, `return_odometer`, `fuel_level_out`, `fuel_level_in`, `condition_notes`
- **`routes-fleet-panel.tsx`** — existing web UI for managing routes, vehicle checkouts, key checkouts
- Mobile app scaffold with Today/Tickets/Inspections/Clock/Profile tabs

### What Is Missing
1. No concept of "route template" — routes are created manually, not generated from recurring patterns
2. No task-level detail on route stops — a stop only references a `site_job_id`, not individual tasks (deliver, inspect, clean)
3. No mileage tracking on the route itself (only on `vehicle_checkouts`)
4. No shift start/end ceremony (confirm vehicle, key box, mileage)
5. No arrival/departure timestamps on stops
6. No skip-with-reason workflow
7. No shift summary generation
8. No Night Bridge review status
9. Mobile app has no "Route" tab for floaters

### Database Changes

#### New Migration: `00089_route_templates.sql`

**Table 1: `route_templates`** — Weekday-based recurring route configuration

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `template_code` | TEXT | UNIQUE, NOT NULL | e.g. "RT-MON-001" |
| `label` | TEXT | NOT NULL | e.g. "Monday — Jorman" |
| `weekday` | TEXT | NOT NULL, CHECK IN ('MON','TUE','WED','THU','FRI','SAT','SUN') | |
| `assigned_staff_id` | UUID | FK → staff, nullable | Primary floater/supervisor |
| `default_vehicle_id` | UUID | FK → vehicles, nullable | |
| `default_key_box` | TEXT | nullable | e.g. "4" |
| `is_active` | BOOLEAN | DEFAULT true | |
| `notes` | TEXT | nullable | Internal notes for Paulette |
| Standard columns | | | created_at, updated_at, archived_at, archived_by, archive_reason, version_etag |

Indexes:
- `idx_route_templates_tenant` ON (tenant_id) WHERE archived_at IS NULL
- `idx_route_templates_weekday` ON (tenant_id, weekday) WHERE archived_at IS NULL AND is_active = true

RLS: Same pattern as all tenant tables — SELECT/INSERT/UPDATE with `tenant_id = current_tenant_id()` and role check for OWNER_ADMIN, MANAGER.

**Table 2: `route_template_stops`** — Ordered stops within a template

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `template_id` | UUID | NOT NULL, FK → route_templates | |
| `site_job_id` | UUID | NOT NULL, FK → site_jobs | Which site/job |
| `stop_order` | INTEGER | NOT NULL, CHECK >= 1 | |
| `access_window_start` | TIME | nullable | Earliest entry time (e.g., 19:00) |
| `access_window_end` | TIME | nullable | Latest entry time |
| `notes` | TEXT | nullable | Stop-specific instructions |
| Standard columns | | | |

Indexes:
- `idx_rts_template` ON (template_id, stop_order) WHERE archived_at IS NULL

**Table 3: `route_template_tasks`** — Tasks to perform at each template stop

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `template_stop_id` | UUID | NOT NULL, FK → route_template_stops | |
| `task_type` | TEXT | NOT NULL, CHECK IN list below | |
| `description_key` | TEXT | nullable | i18n key for task name |
| `description_override` | TEXT | nullable | Free text if no i18n key |
| `task_order` | INTEGER | NOT NULL DEFAULT 1 | Order within the stop |
| `evidence_required` | BOOLEAN | DEFAULT false | Must upload photo to complete |
| `delivery_items` | JSONB | nullable | `[{supply_id, qty, direction}]` |
| Standard columns | | | |

`task_type` CHECK values:
```
'DELIVER_PICKUP', 'FULL_CLEAN', 'LIGHT_CLEAN', 'VACUUM_MOP_TRASH',
'INSPECTION', 'INVENTORY', 'SUPPLY_REFILL', 'RESTROOM_CLEAN',
'FLOOR_SCRUB', 'TRAINING', 'CUSTOM'
```

#### Alter Existing Tables: `00090_route_shift_extensions.sql`

**Extend `routes` table:**
```sql
ALTER TABLE routes ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES route_templates(id);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS mileage_start INTEGER;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS mileage_end INTEGER;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS key_box_number TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_cleaned BOOLEAN DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS personal_items_removed BOOLEAN DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shift_started_at TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shift_ended_at TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shift_summary JSONB;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shift_review_status TEXT DEFAULT 'PENDING'
  CHECK (shift_review_status IN ('PENDING', 'REVIEWED', 'NEEDS_FOLLOWUP'));
ALTER TABLE routes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES staff(id);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
```

**Extend `route_stops` table:**
```sql
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS stop_status TEXT DEFAULT 'PENDING'
  CHECK (stop_status IN ('PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED'));
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS skip_reason TEXT
  CHECK (skip_reason IN ('SITE_CLOSED', 'ACCESS_ISSUE', 'TIME_CONSTRAINT', 'OTHER'));
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS skip_notes TEXT;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS access_window_start TIME;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS access_window_end TIME;
```

**New table: `route_stop_tasks`** — Instance-level tasks for a specific date's route

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `route_stop_id` | UUID | NOT NULL, FK → route_stops | |
| `task_type` | TEXT | NOT NULL | Same enum as template tasks |
| `description` | TEXT | NOT NULL | Localized at creation time |
| `task_order` | INTEGER | NOT NULL DEFAULT 1 | |
| `is_completed` | BOOLEAN | DEFAULT false | |
| `completed_at` | TIMESTAMPTZ | nullable | |
| `completed_by` | UUID | FK → staff, nullable | |
| `evidence_required` | BOOLEAN | DEFAULT false | |
| `evidence_photos` | JSONB | nullable | Array of storage URLs |
| `notes` | TEXT | nullable | Floater's notes |
| `delivery_items` | JSONB | nullable | Copied from template |
| `is_from_template` | BOOLEAN | DEFAULT true | false = ad-hoc added by Paulette |
| `source_complaint_id` | UUID | nullable | FK → complaint_records (Phase 4) |
| Standard columns | | | |

**New RPC: `generate_daily_routes`**
```sql
CREATE OR REPLACE FUNCTION generate_daily_routes(
  p_tenant_id UUID,
  p_target_date DATE
) RETURNS SETOF routes AS $$
-- For each active route_template matching the weekday of p_target_date:
--   1. Check if a route already exists for (template_id, route_date) — idempotent
--   2. Create a route record
--   3. Copy template_stops → route_stops
--   4. Copy template_tasks → route_stop_tasks (localize descriptions using staff language)
--   5. Check periodic_tasks due on p_target_date → inject into relevant stops (Phase 5)
--   6. Check open urgent complaints → inject into relevant stops (Phase 4)
--   7. Return the generated routes
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Shared Package Changes

#### New Types (`packages/shared/src/types/routes.ts`)

```typescript
export type RouteTaskType =
  | 'DELIVER_PICKUP' | 'FULL_CLEAN' | 'LIGHT_CLEAN' | 'VACUUM_MOP_TRASH'
  | 'INSPECTION' | 'INVENTORY' | 'SUPPLY_REFILL' | 'RESTROOM_CLEAN'
  | 'FLOOR_SCRUB' | 'TRAINING' | 'CUSTOM';

export type StopStatus = 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
export type SkipReason = 'SITE_CLOSED' | 'ACCESS_ISSUE' | 'TIME_CONSTRAINT' | 'OTHER';
export type ShiftReviewStatus = 'PENDING' | 'REVIEWED' | 'NEEDS_FOLLOWUP';

export interface RouteTemplate {
  id: string;
  template_code: string;
  label: string;
  weekday: string;
  assigned_staff_id: string | null;
  default_vehicle_id: string | null;
  default_key_box: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface RouteTemplateStop {
  id: string;
  template_id: string;
  site_job_id: string;
  stop_order: number;
  access_window_start: string | null;
  access_window_end: string | null;
  notes: string | null;
  tasks: RouteTemplateTask[];
}

export interface RouteTemplateTask {
  id: string;
  template_stop_id: string;
  task_type: RouteTaskType;
  description_key: string | null;
  description_override: string | null;
  task_order: number;
  evidence_required: boolean;
  delivery_items: DeliveryItem[] | null;
}

export interface DeliveryItem {
  supply_id: string;
  supply_name?: string;
  quantity: number;
  unit?: string;
  direction: 'deliver' | 'pickup';
}

export interface RouteStopTask {
  id: string;
  route_stop_id: string;
  task_type: RouteTaskType;
  description: string;
  task_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  evidence_required: boolean;
  evidence_photos: string[] | null;
  notes: string | null;
  delivery_items: DeliveryItem[] | null;
  is_from_template: boolean;
}

export interface ShiftSummary {
  stops_completed: number;
  stops_skipped: number;
  stops_total: number;
  issues_reported: number;
  photos_uploaded: number;
  mileage_driven: number | null;
  floater_notes: string | null;
  complaints_addressed: number;
}
```

#### New Zod Schemas (`packages/shared/src/validation/route-template.ts`)

```typescript
import { z } from 'zod';

export const ROUTE_TASK_TYPES = [
  'DELIVER_PICKUP', 'FULL_CLEAN', 'LIGHT_CLEAN', 'VACUUM_MOP_TRASH',
  'INSPECTION', 'INVENTORY', 'SUPPLY_REFILL', 'RESTROOM_CLEAN',
  'FLOOR_SCRUB', 'TRAINING', 'CUSTOM',
] as const;

export const WEEKDAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'] as const;

export const routeTemplateSchema = z.object({
  label: z.string().min(1).max(200),
  weekday: z.enum(WEEKDAYS),
  assigned_staff_id: z.string().uuid().nullable(),
  default_vehicle_id: z.string().uuid().nullable(),
  default_key_box: z.string().max(20).nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000).nullable(),
});

export const routeTemplateStopSchema = z.object({
  template_id: z.string().uuid(),
  site_job_id: z.string().uuid(),
  stop_order: z.number().int().min(1),
  access_window_start: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  access_window_end: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  notes: z.string().max(2000).nullable(),
});

export const deliveryItemSchema = z.object({
  supply_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  direction: z.enum(['deliver', 'pickup']),
});

export const routeTemplateTaskSchema = z.object({
  template_stop_id: z.string().uuid(),
  task_type: z.enum(ROUTE_TASK_TYPES),
  description_key: z.string().nullable(),
  description_override: z.string().max(500).nullable(),
  task_order: z.number().int().min(1),
  evidence_required: z.boolean().default(false),
  delivery_items: z.array(deliveryItemSchema).nullable(),
});

export const startShiftSchema = z.object({
  mileage_start: z.number().int().min(0),
  vehicle_id: z.string().uuid(),
  key_box_number: z.string().max(20).nullable(),
});

export const endShiftSchema = z.object({
  mileage_end: z.number().int().min(0),
  vehicle_cleaned: z.boolean(),
  personal_items_removed: z.boolean(),
  floater_notes: z.string().max(2000).nullable(),
});

export const skipStopSchema = z.object({
  skip_reason: z.enum(['SITE_CLOSED', 'ACCESS_ISSUE', 'TIME_CONSTRAINT', 'OTHER']),
  skip_notes: z.string().max(500).nullable(),
});
```

#### New i18n Keys (add to `packages/shared/src/i18n.ts`)

Add these to the `en`, `es`, and `ptBR` dictionaries:

**English (`en`):**
```typescript
// Route templates
'route.templates.title': 'Route Templates',
'route.templates.create': 'New Template',
'route.templates.weekday': 'Weekday',
'route.templates.assignedTo': 'Assigned To',
'route.templates.stops': '{count} stops',
'route.templates.vehicle': 'Default Vehicle',
'route.templates.keyBox': 'Key Box',

// Shift flow
'route.shift.ready': 'Ready to start your shift?',
'route.shift.vehicle': 'Your vehicle: {vehicle}',
'route.shift.keybox': 'Key box: {number}',
'route.shift.mileageStart': 'Enter starting mileage',
'route.shift.mileageEnd': 'Enter ending mileage',
'route.shift.cleanVehicle': 'Is the vehicle clean inside?',
'route.shift.personalItems': 'Personal items removed?',
'route.shift.startButton': 'Start Shift',
'route.shift.endButton': 'End Shift',
'route.shift.endConfirm': 'End your shift? {done} of {total} stops completed.',
'route.shift.greatWork': 'Great work tonight!',
'route.shift.summary': 'Shift Summary',

// Stops
'route.stop.next': 'Next stop: {site}',
'route.stop.timeWindow': 'Access after {time}',
'route.stop.arrived': 'Arrived',
'route.stop.completed': 'Stop completed!',
'route.stop.skipped': 'Skipped',
'route.stop.skip': 'Skip this stop',
'route.stop.skipReason': 'Why are you skipping this stop?',
'route.stop.skipClosed': 'Site closed',
'route.stop.skipAccess': 'Cannot access',
'route.stop.skipTime': 'Not enough time',
'route.stop.skipOther': 'Other reason',

// Tasks
'route.task.deliver': 'Deliver',
'route.task.pickup': 'Pick up',
'route.task.deliverItems': 'Deliver: {items}',
'route.task.pickupItems': 'Pick up: {items}',
'route.task.inspect': 'Inspect',
'route.task.inspectCriteria': 'Check these:',
'route.task.fullClean': 'Full clean',
'route.task.lightClean': 'Light clean',
'route.task.vacuumMop': 'Vacuum and mop',
'route.task.restroomClean': 'Clean restrooms',
'route.task.floorScrub': 'Floor scrub',
'route.task.inventory': 'Inventory count',
'route.task.supplyRefill': 'Refill supplies',
'route.task.training': 'Training',
'route.task.custom': 'Task',
'route.task.addPhoto': 'Add photo',
'route.task.photoRequired': 'A photo is needed for this task.',
'route.task.addNote': 'Add a note',
'route.task.done': 'Done',

// Progress
'route.progress.stops': '{done} of {total} stops',
'route.progress.doingGreat': 'You\'re doing great.',
'route.progress.allDone': 'All stops done!',

// Task types (for labels)
'route.taskType.DELIVER_PICKUP': 'Deliver / Pick up',
'route.taskType.FULL_CLEAN': 'Full clean',
'route.taskType.LIGHT_CLEAN': 'Light clean',
'route.taskType.VACUUM_MOP_TRASH': 'Vacuum, mop, trash',
'route.taskType.INSPECTION': 'Inspection',
'route.taskType.INVENTORY': 'Inventory',
'route.taskType.SUPPLY_REFILL': 'Supply refill',
'route.taskType.RESTROOM_CLEAN': 'Restroom clean',
'route.taskType.FLOOR_SCRUB': 'Floor scrub',
'route.taskType.TRAINING': 'Training',
'route.taskType.CUSTOM': 'Custom task',
```

**Spanish (`es`):**
```typescript
'route.templates.title': 'Plantillas de Ruta',
'route.templates.create': 'Nueva Plantilla',
'route.templates.weekday': 'Día de la semana',
'route.templates.assignedTo': 'Asignado a',
'route.templates.stops': '{count} paradas',
'route.templates.vehicle': 'Vehículo predeterminado',
'route.templates.keyBox': 'Caja de llaves',

'route.shift.ready': '¿Listo para iniciar tu turno?',
'route.shift.vehicle': 'Tu vehículo: {vehicle}',
'route.shift.keybox': 'Caja de llaves: {number}',
'route.shift.mileageStart': 'Ingresa el kilometraje de inicio',
'route.shift.mileageEnd': 'Ingresa el kilometraje final',
'route.shift.cleanVehicle': '¿El vehículo está limpio por dentro?',
'route.shift.personalItems': '¿Artículos personales removidos?',
'route.shift.startButton': 'Iniciar Turno',
'route.shift.endButton': 'Finalizar Turno',
'route.shift.endConfirm': '¿Finalizar tu turno? {done} de {total} paradas completadas.',
'route.shift.greatWork': '¡Buen trabajo esta noche!',
'route.shift.summary': 'Resumen del Turno',

'route.stop.next': 'Próxima parada: {site}',
'route.stop.timeWindow': 'Acceso después de las {time}',
'route.stop.arrived': 'Llegaste',
'route.stop.completed': '¡Parada completada!',
'route.stop.skipped': 'Omitida',
'route.stop.skip': 'Omitir esta parada',
'route.stop.skipReason': '¿Por qué omites esta parada?',
'route.stop.skipClosed': 'Sitio cerrado',
'route.stop.skipAccess': 'Sin acceso',
'route.stop.skipTime': 'No hay tiempo',
'route.stop.skipOther': 'Otra razón',

'route.task.deliver': 'Entregar',
'route.task.pickup': 'Recoger',
'route.task.deliverItems': 'Entregar: {items}',
'route.task.pickupItems': 'Recoger: {items}',
'route.task.inspect': 'Inspeccionar',
'route.task.inspectCriteria': 'Revisa esto:',
'route.task.fullClean': 'Limpieza completa',
'route.task.lightClean': 'Limpieza ligera',
'route.task.vacuumMop': 'Aspirar y trapear',
'route.task.restroomClean': 'Limpieza de baños',
'route.task.floorScrub': 'Fregado de suelos',
'route.task.inventory': 'Conteo de inventario',
'route.task.supplyRefill': 'Rellenar suministros',
'route.task.training': 'Entrenamiento',
'route.task.custom': 'Tarea',
'route.task.addPhoto': 'Agregar foto',
'route.task.photoRequired': 'Se necesita una foto para esta tarea.',
'route.task.addNote': 'Agregar una nota',
'route.task.done': 'Hecho',

'route.progress.stops': '{done} de {total} paradas',
'route.progress.doingGreat': 'Vas muy bien.',
'route.progress.allDone': '¡Todas las paradas hechas!',

'route.taskType.DELIVER_PICKUP': 'Entregar / Recoger',
'route.taskType.FULL_CLEAN': 'Limpieza completa',
'route.taskType.LIGHT_CLEAN': 'Limpieza ligera',
'route.taskType.VACUUM_MOP_TRASH': 'Aspirar, trapear, basura',
'route.taskType.INSPECTION': 'Inspección',
'route.taskType.INVENTORY': 'Inventario',
'route.taskType.SUPPLY_REFILL': 'Rellenar suministros',
'route.taskType.RESTROOM_CLEAN': 'Limpieza de baños',
'route.taskType.FLOOR_SCRUB': 'Fregado de suelos',
'route.taskType.TRAINING': 'Entrenamiento',
'route.taskType.CUSTOM': 'Tarea personalizada',
```

**Brazilian Portuguese (`ptBR`):**
```typescript
'route.templates.title': 'Modelos de Rota',
'route.templates.create': 'Novo Modelo',
'route.templates.weekday': 'Dia da semana',
'route.templates.assignedTo': 'Atribuído a',
'route.templates.stops': '{count} paradas',
'route.templates.vehicle': 'Veículo padrão',
'route.templates.keyBox': 'Caixa de chaves',

'route.shift.ready': 'Pronto para iniciar seu turno?',
'route.shift.vehicle': 'Seu veículo: {vehicle}',
'route.shift.keybox': 'Caixa de chaves: {number}',
'route.shift.mileageStart': 'Insira a quilometragem de início',
'route.shift.mileageEnd': 'Insira a quilometragem final',
'route.shift.cleanVehicle': 'O veículo está limpo por dentro?',
'route.shift.personalItems': 'Itens pessoais removidos?',
'route.shift.startButton': 'Iniciar Turno',
'route.shift.endButton': 'Finalizar Turno',
'route.shift.endConfirm': 'Finalizar seu turno? {done} de {total} paradas concluídas.',
'route.shift.greatWork': 'Bom trabalho esta noite!',
'route.shift.summary': 'Resumo do Turno',

'route.stop.next': 'Próxima parada: {site}',
'route.stop.timeWindow': 'Acesso após {time}',
'route.stop.arrived': 'Chegou',
'route.stop.completed': 'Parada concluída!',
'route.stop.skipped': 'Pulada',
'route.stop.skip': 'Pular esta parada',
'route.stop.skipReason': 'Por que você está pulando esta parada?',
'route.stop.skipClosed': 'Local fechado',
'route.stop.skipAccess': 'Sem acesso',
'route.stop.skipTime': 'Sem tempo',
'route.stop.skipOther': 'Outro motivo',

'route.task.deliver': 'Entregar',
'route.task.pickup': 'Recolher',
'route.task.deliverItems': 'Entregar: {items}',
'route.task.pickupItems': 'Recolher: {items}',
'route.task.inspect': 'Inspecionar',
'route.task.inspectCriteria': 'Verifique:',
'route.task.fullClean': 'Limpeza completa',
'route.task.lightClean': 'Limpeza leve',
'route.task.vacuumMop': 'Aspirar e esfregar',
'route.task.restroomClean': 'Limpeza de banheiros',
'route.task.floorScrub': 'Limpeza de pisos',
'route.task.inventory': 'Contagem de inventário',
'route.task.supplyRefill': 'Reabastecimento',
'route.task.training': 'Treinamento',
'route.task.custom': 'Tarefa',
'route.task.addPhoto': 'Adicionar foto',
'route.task.photoRequired': 'Uma foto é necessária para esta tarefa.',
'route.task.addNote': 'Adicionar uma nota',
'route.task.done': 'Feito',

'route.progress.stops': '{done} de {total} paradas',
'route.progress.doingGreat': 'Você está indo bem.',
'route.progress.allDone': 'Todas as paradas feitas!',
```

### API Routes (Golden Module Pattern)

Create new module at `apps/web/src/modules/route-templates/`:

```
modules/route-templates/
  route-templates.service.ts
  route-templates.repository.ts
  index.ts
```

**API endpoints** (at `apps/web/src/app/api/operations/route-templates/`):

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/operations/route-templates` | List all templates, optionally filter by weekday | OWNER_ADMIN, MANAGER |
| POST | `/api/operations/route-templates` | Create a new template | OWNER_ADMIN, MANAGER |
| GET | `/api/operations/route-templates/[id]` | Get template with stops and tasks | OWNER_ADMIN, MANAGER |
| PATCH | `/api/operations/route-templates/[id]` | Update template | OWNER_ADMIN, MANAGER |
| POST | `/api/operations/route-templates/[id]/archive` | Soft-delete template | OWNER_ADMIN, MANAGER |
| POST | `/api/operations/route-templates/[id]/stops` | Add a stop to template | OWNER_ADMIN, MANAGER |
| PATCH | `/api/operations/route-templates/stops/[id]` | Update stop (reorder, edit) | OWNER_ADMIN, MANAGER |
| POST | `/api/operations/route-templates/stops/[id]/tasks` | Add task to a stop | OWNER_ADMIN, MANAGER |
| PATCH | `/api/operations/route-templates/tasks/[id]` | Update task | OWNER_ADMIN, MANAGER |

**Route generation and shift management** (extend existing `/api/operations/routes/`):

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/operations/routes/generate` | Generate routes for a target date | OWNER_ADMIN, MANAGER |
| POST | `/api/operations/routes/[id]/start-shift` | Start shift: log mileage, confirm vehicle | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/[id]/end-shift` | End shift: log mileage, vehicle clean | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/stops/[id]/arrive` | Mark arrival at stop | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/stops/[id]/complete` | Mark stop complete | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/stops/[id]/skip` | Skip with reason | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/stops/tasks/[id]/complete` | Complete a specific task | SUPERVISOR, CLEANER |
| POST | `/api/operations/routes/stops/tasks/[id]/photo` | Upload photo evidence | SUPERVISOR, CLEANER |

### Web UI Components

#### Route Templates Tab (in Operations module)

Add new tab to `apps/web/src/app/(dashboard)/operations/operations-page.tsx`:

```typescript
// Add to TABS array:
{ key: 'templates', label: 'Route Templates', icon: <Route className="h-4 w-4" /> },
```

New files:
```
apps/web/src/app/(dashboard)/operations/templates/
  route-templates-table.tsx      — Table listing all templates, grouped by weekday
  route-template-detail.tsx      — Detail view showing stops + tasks
  route-template-card-grid.tsx   — Card grid view alternative
apps/web/src/components/forms/
  route-template-form.tsx        — Create/edit template (SlideOver)
  route-template-stop-form.tsx   — Add/edit stop (SlideOver)
  route-template-task-form.tsx   — Add/edit task (SlideOver)
```

Follow the exact patterns in CLAUDE.md:
- Table: uses `useTableSort`, `usePagination`, `useViewPreference`
- Cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- Forms: `SlideOver` + `useForm` + Zod schema + optimistic locking
- Detail: back link → header → stat cards → section cards (`<dl>`)

#### Route Planner Enhancement

Extend existing `apps/web/src/app/(dashboard)/operations/routes/routes-fleet-panel.tsx`:

Add a "Generate Tomorrow's Routes" button that calls `POST /api/operations/routes/generate`. Show generated routes in the existing route list with a "DRAFT" badge. Add a "Publish" button (changes status to PUBLISHED). Add "Add One-Off Task" action on any stop (opens a small form to add a CUSTOM task).

### Mobile Changes

#### New Route Tab

Add to `apps/mobile/app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="route"
  options={{
    title: 'Route',
    headerTitle: 'Tonight\'s Route',
  }}
/>
```

New files:
```
apps/mobile/app/(tabs)/route.tsx           — Tonight's route overview
apps/mobile/app/route/start-shift.tsx      — Start shift screen
apps/mobile/app/route/load-sheet.tsx       — Load sheet (Phase 2)
apps/mobile/app/route/stop/[id].tsx        — Stop detail with task checklist
apps/mobile/app/route/end-shift.tsx        — End shift screen
apps/mobile/src/hooks/use-route.ts         — Fetch tonight's route
apps/mobile/src/hooks/use-shift.ts         — Shift state management
apps/mobile/src/components/stop-card.tsx   — Route stop card
apps/mobile/src/components/task-item.tsx   — Individual task with checkbox
```

New hooks:
```
apps/mobile/src/hooks/use-route.ts
  — useRoute(date: string) → fetches route for the current user + date
  — Returns: route, stops, tasks, loading, error
  — Uses @tanstack/react-query with offline persistence

apps/mobile/src/hooks/use-shift.ts
  — useShift(routeId: string)
  — Methods: startShift(), arriveAtStop(), completeTask(), skipStop(), endShift()
  — Uses mutation queue for offline support
```

#### Mobile Screen Flow

**Screen 1: Route Overview** (`route.tsx`)
- If no shift started: "Start Shift" card with vehicle + key box info
- If shift in progress: vertical card list of stops with status indicators
- Next Best Action bar at top: "Go to [next stop name]" or "End your shift"
- Progress bar: "{done} of {total} stops"

**Screen 2: Start Shift** (`route/start-shift.tsx`)
- Vehicle confirmation (pre-filled from template)
- Key box confirmation
- Mileage start input (number pad)
- "Start Shift" button
- On submit: POST `/api/operations/routes/[id]/start-shift`

**Screen 3: Stop Detail** (`route/stop/[id].tsx`)
- Site name + address (tappable → opens Maps via `expo-linking`)
- Access window badge (if set)
- Pinned site notes (from `sites.entry_instructions`, `sites.access_notes`)
- Task checklist:
  - Each task: checkbox + description + optional camera icon
  - Delivery tasks: show items to deliver/pickup as sub-list
  - Inspection tasks: show criteria + camera button
- "Report Issue" button (always visible at bottom)
- "Skip This Stop" button (secondary, at bottom)

**Screen 4: End Shift** (`route/end-shift.tsx`)
- Mileage end input
- "Vehicle clean inside?" toggle
- "Personal items removed?" toggle
- Free text notes field
- Shift summary preview (auto-calculated)
- "End Shift" button
- On submit: POST `/api/operations/routes/[id]/end-shift` → shows "Great work tonight!"

### Acceptance Criteria

1. Paulette can create weekday route templates with ordered stops and tasks
2. System generates tomorrow's routes from templates (triggered manually or via cron)
3. Paulette can review, modify, and publish generated routes
4. Floater opens mobile app → sees tonight's route → starts shift → navigates stops → completes tasks → ends shift
5. All mileage data is captured (start/end per shift)
6. Vehicle clean + personal items confirmed at end of shift
7. Stops can be skipped with a required reason
8. Evidence photos can be attached to tasks where required
9. The entire flow works offline (queues mutations, syncs when connected)
10. All UI strings are available in EN, ES, PT-BR

---

## Phase 2: Load Sheet

### Purpose
Before the floater leaves 103 Wayside Ave, they need to know exactly what to put in the vehicle. Today this is done by reading each task's update in Monday.com and mentally totaling supplies. The Load Sheet auto-calculates this from tonight's delivery tasks.

### What Already Exists
- `supply_catalog` table with supply items (name, unit, cost)
- `supply_assignments` table linking supplies to sites with `min_quantity`
- `supply_orders` table for ordering
- Routes and route_stop_tasks from Phase 1

### Database Changes

No new tables needed. The Load Sheet is a computed view from `route_stop_tasks` where `task_type = 'DELIVER_PICKUP'`.

Add a view for convenience:

```sql
CREATE OR REPLACE VIEW v_load_sheet AS
SELECT
  rst.tenant_id,
  r.id AS route_id,
  r.route_date,
  r.route_owner_staff_id,
  di.supply_id,
  sc.name AS supply_name,
  sc.unit,
  di.direction,
  SUM(di.quantity) AS total_quantity,
  json_agg(json_build_object(
    'stop_order', rs.stop_order,
    'site_name', s.name,
    'quantity', di.quantity
  )) AS site_breakdown
FROM route_stop_tasks rst
  JOIN route_stops rs ON rs.id = rst.route_stop_id
  JOIN routes r ON r.id = rs.route_id
  JOIN site_jobs sj ON sj.id = rs.site_job_id
  JOIN sites s ON s.id = sj.site_id
  CROSS JOIN LATERAL jsonb_to_recordset(rst.delivery_items)
    AS di(supply_id UUID, quantity INT, direction TEXT)
  LEFT JOIN supply_catalog sc ON sc.id = di.supply_id
WHERE rst.task_type = 'DELIVER_PICKUP'
  AND rst.archived_at IS NULL
  AND rs.archived_at IS NULL
  AND r.archived_at IS NULL
GROUP BY rst.tenant_id, r.id, r.route_date, r.route_owner_staff_id,
         di.supply_id, sc.name, sc.unit, di.direction;
```

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/operations/routes/[id]/load-sheet` | Get aggregated load sheet for a route |

Response shape:
```typescript
interface LoadSheetResponse {
  route_id: string;
  route_date: string;
  items: Array<{
    supply_id: string;
    supply_name: string;
    unit: string;
    direction: 'deliver' | 'pickup';
    total_quantity: number;
    site_breakdown: Array<{
      stop_order: number;
      site_name: string;
      quantity: number;
    }>;
  }>;
  special_items: Array<{
    description: string;
    for_stop: number;
    site_name: string;
  }>;
}
```

### Web UI

Add "Load Sheet" preview to the Routes panel (`routes-fleet-panel.tsx`):
- When a route is selected, show a collapsible "Load Sheet" card below the stop list
- Lists all delivery items aggregated by supply
- Expand each item to see per-site breakdown
- Print-friendly layout (Paulette can print for the floater if needed)

### Mobile UI

New screen: `apps/mobile/app/route/load-sheet.tsx`

- Shown after "Start Shift" and before first stop
- Checklist UI: each supply item is a checkbox row
  - `☐ 15 towels (5 for WIC, 5 for Hub, 5 for Tapestry)`
  - `☐ 3 mopheads`
  - `☐ 2 bottles toilet bowl cleaner`
- "Not Available" button per item → creates a `field_report` (type: SUPPLY_REQUEST) + notification to Paulette
- "All Loaded" button at bottom → proceeds to stop list
- If no delivery tasks on tonight's route → skip Load Sheet automatically

### i18n Keys

```typescript
// EN
'load.title': 'Tonight\'s Load',
'load.subtitle': 'Load these into {vehicle}:',
'load.itemLine': '{qty} {item}',
'load.forSite': 'for {site}',
'load.notAvailable': 'Not available',
'load.allLoaded': 'All loaded',
'load.noDeliveries': 'No deliveries tonight.',
'load.specialItems': 'Special Items',

// ES
'load.title': 'Carga de esta noche',
'load.subtitle': 'Cargar esto en {vehicle}:',
'load.itemLine': '{qty} {item}',
'load.forSite': 'para {site}',
'load.notAvailable': 'No disponible',
'load.allLoaded': 'Todo cargado',
'load.noDeliveries': 'Sin entregas esta noche.',
'load.specialItems': 'Artículos Especiales',

// PT-BR
'load.title': 'Carga de hoje à noite',
'load.subtitle': 'Carregar isso no {vehicle}:',
'load.itemLine': '{qty} {item}',
'load.forSite': 'para {site}',
'load.notAvailable': 'Não disponível',
'load.allLoaded': 'Tudo carregado',
'load.noDeliveries': 'Sem entregas esta noite.',
'load.specialItems': 'Itens Especiais',
```

### Acceptance Criteria
1. Load Sheet auto-calculates from delivery tasks on tonight's route
2. Floater sees checklist on mobile before first stop
3. Items aggregated by supply (not listed per-stop)
4. Per-site breakdown visible by tapping an item
5. "Not Available" creates a supply request visible to Paulette
6. Load Sheet available on web as preview for Paulette

---

## Phase 3: Night Bridge (Shift Handoff)

### Purpose
Replaces the informal "Paulette manually reviews every supervisor board on Monday.com each morning" workflow. When a floater ends their shift, the system generates a structured summary. Next morning, Paulette sees a dashboard of all shift summaries with issues highlighted.

### What Already Exists
- Routes with `shift_summary` JSONB field (added in Phase 1)
- Routes with `shift_review_status` field (added in Phase 1)
- Messaging module for real-time communication

### Database Changes

Shift summary is stored in `routes.shift_summary` (Phase 1 extension). No additional tables needed for the core handoff.

Add a convenience view:

```sql
CREATE OR REPLACE VIEW v_night_bridge AS
SELECT
  r.id AS route_id,
  r.tenant_id,
  r.route_date,
  r.status AS route_status,
  r.shift_started_at,
  r.shift_ended_at,
  r.mileage_start,
  r.mileage_end,
  r.shift_summary,
  r.shift_review_status,
  r.reviewed_by,
  r.reviewed_at,
  r.reviewer_notes,
  s.full_name AS floater_name,
  s.staff_code AS floater_code,
  v.name AS vehicle_name,
  v.vehicle_code,
  (SELECT count(*) FROM route_stops rs WHERE rs.route_id = r.id AND rs.stop_status = 'COMPLETED' AND rs.archived_at IS NULL) AS stops_completed,
  (SELECT count(*) FROM route_stops rs WHERE rs.route_id = r.id AND rs.stop_status = 'SKIPPED' AND rs.archived_at IS NULL) AS stops_skipped,
  (SELECT count(*) FROM route_stops rs WHERE rs.route_id = r.id AND rs.archived_at IS NULL) AS stops_total,
  (SELECT count(*) FROM route_stop_tasks rst
    JOIN route_stops rs2 ON rs2.id = rst.route_stop_id
    WHERE rs2.route_id = r.id AND rst.evidence_photos IS NOT NULL AND jsonb_array_length(rst.evidence_photos) > 0
  ) AS photos_uploaded
FROM routes r
  LEFT JOIN staff s ON s.id = r.route_owner_staff_id
  LEFT JOIN vehicle_checkouts vc ON vc.route_id = r.id AND vc.returned_at IS NOT NULL
  LEFT JOIN vehicles v ON v.id = vc.vehicle_id
WHERE r.status = 'COMPLETED'
  AND r.archived_at IS NULL
ORDER BY r.route_date DESC, r.shift_ended_at DESC;
```

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/operations/night-bridge` | List shift summaries needing review (filter by date, status) |
| GET | `/api/operations/night-bridge/[routeId]` | Detailed shift summary with stops, tasks, issues, photos |
| POST | `/api/operations/night-bridge/[routeId]/review` | Mark as reviewed or needs-followup |

### Web UI

New tab in Operations module: **"Night Bridge"**

Add to `operations-page.tsx` TABS:
```typescript
{ key: 'night-bridge', label: 'Night Bridge', icon: <Moon className="h-4 w-4" /> },
```

New files:
```
apps/web/src/app/(dashboard)/operations/night-bridge/
  night-bridge-dashboard.tsx     — Main dashboard
  shift-summary-card.tsx         — Individual shift card
  shift-detail-drawer.tsx        — Detailed view (SlideOver)
```

**Dashboard Layout:**
- Date picker at top (defaults to "last night")
- Grid of shift summary cards (one per floater)
- Each card shows:
  - Floater name + vehicle
  - Completion bar: "8/8 stops" or "7/8 stops (1 skipped)"
  - Issue count badge (if > 0, highlighted)
  - Photo count
  - Mileage: "Start 45,230 → End 45,298 = 68 miles"
  - Review status badge (PENDING = yellow, REVIEWED = green, NEEDS_FOLLOWUP = red)
- Card border color indicates urgency:
  - Green: all stops completed, no issues
  - Yellow: has notes or non-urgent issues
  - Red: stops skipped or urgent issues
- Tap card → opens detail drawer

**Detail Drawer:**
- Full stop-by-stop breakdown
- Each stop shows: status (completed/skipped), tasks completed, photos, notes
- Issues section: list of issues reported during this shift
- Floater's free-text notes
- "Mark as Reviewed" button
- "Needs Follow-up" button + notes field
- "Add to Tomorrow's Route" action (creates one-off task on tomorrow's route for a specific site)

### Cron Integration

Extend existing `apps/web/src/modules/cron/` to:
- At 9:00 AM daily: check for unreviewed shifts from last night
- If any exist: create notification for Paulette (use existing messaging or notification system)

### i18n Keys

```typescript
// EN
'bridge.title': 'Night Bridge',
'bridge.subtitle': 'Review last night\'s shifts',
'bridge.morning.allClear': 'Everything looks good.',
'bridge.morning.issuesFound': '{count} issues need your attention.',
'bridge.morning.markReviewed': 'Mark as reviewed',
'bridge.morning.needsFollowup': 'Needs follow-up',
'bridge.summary.stopsCompleted': '{done} of {total} stops completed',
'bridge.summary.skipped': '{count} skipped',
'bridge.summary.photos': '{count} photos',
'bridge.summary.mileage': 'Mileage: {start} → {end} = {total} miles',
'bridge.summary.noShifts': 'No completed shifts to review.',
'bridge.summary.floaterNotes': 'Floater notes',
'bridge.review.addNote': 'Add review note',
'bridge.review.addToTomorrow': 'Add task to tomorrow\'s route',

// ES
'bridge.title': 'Puente Nocturno',
'bridge.subtitle': 'Revisar los turnos de anoche',
'bridge.morning.allClear': 'Todo se ve bien.',
'bridge.morning.issuesFound': '{count} problemas necesitan tu atención.',
'bridge.morning.markReviewed': 'Marcar como revisado',
'bridge.morning.needsFollowup': 'Necesita seguimiento',
'bridge.summary.stopsCompleted': '{done} de {total} paradas completadas',
'bridge.summary.skipped': '{count} omitidas',
'bridge.summary.photos': '{count} fotos',
'bridge.summary.mileage': 'Kilometraje: {start} → {end} = {total} millas',
'bridge.summary.noShifts': 'Sin turnos completados para revisar.',
'bridge.summary.floaterNotes': 'Notas del flotante',
'bridge.review.addNote': 'Agregar nota de revisión',
'bridge.review.addToTomorrow': 'Agregar tarea a la ruta de mañana',

// PT-BR
'bridge.title': 'Ponte Noturna',
'bridge.subtitle': 'Revisar os turnos de ontem à noite',
'bridge.morning.allClear': 'Tudo parece bem.',
'bridge.morning.issuesFound': '{count} problemas precisam de sua atenção.',
'bridge.morning.markReviewed': 'Marcar como revisado',
'bridge.morning.needsFollowup': 'Precisa de acompanhamento',
'bridge.summary.stopsCompleted': '{done} de {total} paradas concluídas',
'bridge.summary.skipped': '{count} puladas',
'bridge.summary.photos': '{count} fotos',
'bridge.summary.mileage': 'Quilometragem: {start} → {end} = {total} milhas',
'bridge.summary.noShifts': 'Sem turnos concluídos para revisar.',
'bridge.summary.floaterNotes': 'Notas do motorista',
'bridge.review.addNote': 'Adicionar nota de revisão',
'bridge.review.addToTomorrow': 'Adicionar tarefa à rota de amanhã',
```

### Acceptance Criteria
1. When floater ends shift, system auto-generates `shift_summary` JSON
2. Paulette opens Night Bridge tab → sees all shift summaries from last night
3. Cards are color-coded by urgency (green/yellow/red)
4. Tap card → full detail with every stop, task, photo, issue
5. "Mark as Reviewed" updates status to REVIEWED
6. "Needs Follow-up" allows adding notes and creating tasks on tomorrow's route
7. Unreviewed shifts trigger a notification at 9 AM

---

## Phase 4: Complaint Intake + Issue Hub

### Purpose
Replaces the informal complaint flow (email → Paulette → manually create Monday.com task → floater maybe sees it) with a structured system. Complaints must be resolved same night when urgent. Before/after photos are captured in-app. Resolution emails with photos are auto-generated for customers.

### Database Changes

#### New Migration: `00091_complaint_records.sql`

**Table: `complaint_records`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `complaint_code` | TEXT | UNIQUE, NOT NULL | CMP-XXXX |
| `site_id` | UUID | FK → sites, NOT NULL | |
| `client_id` | UUID | FK → clients, nullable | Auto-populated from site |
| `reported_by_type` | TEXT | CHECK IN ('CUSTOMER','SPECIALIST','FLOATER','MANAGER','SYSTEM') | |
| `reported_by_staff_id` | UUID | FK → staff, nullable | If reported by staff |
| `reported_by_name` | TEXT | nullable | If reported by customer |
| `source` | TEXT | CHECK IN ('EMAIL','PHONE','APP','PORTAL','IN_PERSON') | |
| `customer_original_message` | TEXT | nullable | Verbatim customer text |
| `category` | TEXT | CHECK IN ('CLEANING_QUALITY','MISSED_SERVICE','SUPPLY_ISSUE','DAMAGE','BEHAVIOR','SAFETY','OTHER') | |
| `priority` | TEXT | CHECK IN ('LOW','NORMAL','HIGH','URGENT_SAME_NIGHT') | |
| `status` | TEXT | DEFAULT 'OPEN', CHECK IN ('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','ESCALATED','CLOSED') | |
| `assigned_to_staff_id` | UUID | FK → staff, nullable | |
| `linked_route_task_id` | UUID | FK → route_stop_tasks, nullable | Task created to resolve this |
| `photos_before` | JSONB | nullable | Array of storage URLs |
| `photos_after` | JSONB | nullable | Array of storage URLs |
| `resolution_description` | TEXT | nullable | |
| `resolution_email_sent` | BOOLEAN | DEFAULT false | |
| `resolution_email_sent_at` | TIMESTAMPTZ | nullable | |
| `resolved_at` | TIMESTAMPTZ | nullable | |
| `resolved_by` | UUID | FK → staff, nullable | |
| Standard columns | | | |

Indexes:
- `idx_complaints_tenant` ON (tenant_id) WHERE archived_at IS NULL
- `idx_complaints_site` ON (site_id) WHERE archived_at IS NULL
- `idx_complaints_status` ON (tenant_id, status) WHERE archived_at IS NULL
- `idx_complaints_priority` ON (tenant_id, priority) WHERE archived_at IS NULL AND status != 'CLOSED'

Code generation: use `next_code(tenant_id, 'CMP', 4)`.

### API Routes

New module at `apps/web/src/modules/complaints/`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/operations/complaints` | List complaints (filter by status, priority, site, date range) |
| POST | `/api/operations/complaints` | Create complaint |
| GET | `/api/operations/complaints/[code]` | Get complaint detail |
| PATCH | `/api/operations/complaints/[code]` | Update complaint (assign, change status) |
| POST | `/api/operations/complaints/[code]/resolve` | Mark resolved with resolution description |
| POST | `/api/operations/complaints/[code]/inject-route` | Add resolution task to tonight's route |
| POST | `/api/operations/complaints/[code]/send-resolution` | Generate + send resolution email to customer |
| POST | `/api/operations/complaints/[code]/photos/before` | Upload before photo |
| POST | `/api/operations/complaints/[code]/photos/after` | Upload after photo |

### Web UI

New files:
```
apps/web/src/app/(dashboard)/operations/complaints/
  complaints-table.tsx          — Table with status filter chips
  complaint-detail.tsx          — Detail page /operations/complaints/[code]
  complaint-card-grid.tsx       — Card grid view
apps/web/src/components/forms/
  complaint-form.tsx            — Create/edit complaint (SlideOver)
  resolution-email-preview.tsx  — Preview generated email before sending
```

Add "Complaints" tab to Operations module:
```typescript
{ key: 'complaints', label: 'Complaints', icon: <MessageSquareWarning className="h-4 w-4" /> },
```

**Complaint Detail Page** (`/operations/complaints/[code]/page.tsx`):
- Back link → "Back to Operations"
- Header: complaint code + status badge + priority badge
- Stat cards: site name, date reported, response time, assigned to
- Section 1: "Customer Message" — verbatim text from customer
- Section 2: "Before Photos" — grid of before photos
- Section 3: "After Photos" — grid of after photos (side-by-side with before if both exist)
- Section 4: "Resolution" — resolution description text
- Section 5: "Timeline" — status change history (from audit_events)
- Actions: "Assign", "Add to Route", "Resolve", "Send Resolution Email"

**Resolution Email Preview** — Shows generated email with template:
```
Subject: Cleaning Service Update — {site_name} — {date}

Dear {customer_contact},

Thank you for your feedback about {site_name}.

We took the following action on {date}:
{resolution_description}

Please see the attached photos showing the before and after results.

If you have any further concerns, please reach out.

Best regards,
{sender_name}
Anderson Cleaning
```
- Paulette can edit before sending
- Photos auto-attached
- "Send" button → sends via existing email infrastructure (SendGrid)

### Mobile UI

On the Route stop detail screen, the "Report Issue" button already exists from Phase 1. When tapped from a complaint-resolution task:

1. Task card shows: "Customer Complaint. Deep clean required."
2. "Take Before Photo" button (links to complaint's `photos_before`)
3. Complete the cleaning work
4. "Take After Photo" button (links to complaint's `photos_after`)
5. Add resolution notes
6. Complete task → complaint auto-transitions to RESOLVED

### i18n Keys

```typescript
// EN
'complaint.title': 'Complaints',
'complaint.create': 'New Complaint',
'complaint.code': 'Complaint {code}',
'complaint.whatHappened': 'What happened?',
'complaint.customerMessage': 'Customer\'s message',
'complaint.takePhotoBefore': 'Take a before photo',
'complaint.takePhotoAfter': 'Take an after photo',
'complaint.resolve': 'Mark as Resolved',
'complaint.sendResolution': 'Send Resolution Email',
'complaint.addToRoute': 'Add to Tonight\'s Route',
'complaint.resolution': 'Resolution',
'complaint.status.OPEN': 'Open',
'complaint.status.ASSIGNED': 'Assigned',
'complaint.status.IN_PROGRESS': 'In Progress',
'complaint.status.RESOLVED': 'Resolved',
'complaint.status.ESCALATED': 'Escalated',
'complaint.status.CLOSED': 'Closed',
'complaint.priority.LOW': 'Low',
'complaint.priority.NORMAL': 'Normal',
'complaint.priority.HIGH': 'High',
'complaint.priority.URGENT_SAME_NIGHT': 'Urgent — Same Night',
'complaint.category.CLEANING_QUALITY': 'Cleaning Quality',
'complaint.category.MISSED_SERVICE': 'Missed Service',
'complaint.category.SUPPLY_ISSUE': 'Supply Issue',
'complaint.category.DAMAGE': 'Damage',
'complaint.category.BEHAVIOR': 'Behavior',
'complaint.category.SAFETY': 'Safety',
'complaint.category.OTHER': 'Other',
'complaint.injected': 'Task added to tonight\'s route.',
'complaint.emailSent': 'Resolution email sent to customer.',
'complaint.reportedVia': 'Reported via {source}',

// ES
'complaint.title': 'Quejas',
'complaint.create': 'Nueva Queja',
'complaint.code': 'Queja {code}',
'complaint.whatHappened': '¿Qué pasó?',
'complaint.customerMessage': 'Mensaje del cliente',
'complaint.takePhotoBefore': 'Toma una foto antes',
'complaint.takePhotoAfter': 'Toma una foto después',
'complaint.resolve': 'Marcar como Resuelto',
'complaint.sendResolution': 'Enviar Email de Resolución',
'complaint.addToRoute': 'Agregar a la Ruta de Esta Noche',
'complaint.resolution': 'Resolución',
'complaint.status.OPEN': 'Abierto',
'complaint.status.ASSIGNED': 'Asignado',
'complaint.status.IN_PROGRESS': 'En Progreso',
'complaint.status.RESOLVED': 'Resuelto',
'complaint.status.ESCALATED': 'Escalado',
'complaint.status.CLOSED': 'Cerrado',
'complaint.priority.URGENT_SAME_NIGHT': 'Urgente — Esta Noche',
'complaint.injected': 'Tarea agregada a la ruta de esta noche.',
'complaint.emailSent': 'Email de resolución enviado al cliente.',

// PT-BR
'complaint.title': 'Reclamações',
'complaint.create': 'Nova Reclamação',
'complaint.code': 'Reclamação {code}',
'complaint.whatHappened': 'O que aconteceu?',
'complaint.customerMessage': 'Mensagem do cliente',
'complaint.takePhotoBefore': 'Tire uma foto antes',
'complaint.takePhotoAfter': 'Tire uma foto depois',
'complaint.resolve': 'Marcar como Resolvido',
'complaint.sendResolution': 'Enviar Email de Resolução',
'complaint.addToRoute': 'Adicionar à Rota de Hoje à Noite',
'complaint.resolution': 'Resolução',
'complaint.status.OPEN': 'Aberto',
'complaint.status.RESOLVED': 'Resolvido',
'complaint.priority.URGENT_SAME_NIGHT': 'Urgente — Esta Noite',
'complaint.injected': 'Tarefa adicionada à rota de hoje à noite.',
'complaint.emailSent': 'Email de resolução enviado ao cliente.',
```

### Acceptance Criteria
1. Paulette can create a complaint from the web (source: email/phone/portal)
2. Urgent complaints can be injected into tonight's published route with one tap
3. Floater sees complaint task on their route with "Before/After Photo" workflow
4. System generates resolution email with photos using template
5. Paulette previews and sends email
6. Full complaint timeline visible on detail page
7. Complaint response time KPI is measurable

---

## Phase 5: Periodic Task Scheduler

### Purpose
Replaces the "Master Tasks" group in Monday.com where Paulette manually tracks floor scrub dates, buffing schedules, log book checks, and Virex bottle fills in free-text updates. The system tracks when periodic tasks are due and auto-injects them into the correct route.

### Database Changes

#### New Migration: `00092_periodic_tasks.sql`

**Table: `periodic_tasks`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `periodic_code` | TEXT | UNIQUE, NOT NULL | PER-XXXX |
| `site_job_id` | UUID | FK → site_jobs, NOT NULL | |
| `task_type` | TEXT | NOT NULL | Same enum as route task types |
| `description_key` | TEXT | nullable | i18n key |
| `description_override` | TEXT | nullable | Free text |
| `frequency` | TEXT | NOT NULL, CHECK IN ('WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','CUSTOM') | |
| `custom_interval_days` | INTEGER | nullable, CHECK > 0 | For CUSTOM frequency |
| `last_completed_at` | TIMESTAMPTZ | nullable | |
| `last_completed_route_id` | UUID | FK → routes, nullable | Link to the route where it was done |
| `next_due_date` | DATE | NOT NULL | Auto-calculated |
| `auto_add_to_route` | BOOLEAN | DEFAULT true | |
| `preferred_staff_id` | UUID | FK → staff, nullable | |
| `evidence_required` | BOOLEAN | DEFAULT false | |
| `notes` | TEXT | nullable | |
| `status` | TEXT | DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','PAUSED','ARCHIVED') | |
| Standard columns | | | |

**RPC: `complete_periodic_task`**
```sql
CREATE OR REPLACE FUNCTION complete_periodic_task(
  p_periodic_id UUID,
  p_completed_at TIMESTAMPTZ DEFAULT now(),
  p_route_id UUID DEFAULT NULL
) RETURNS periodic_tasks AS $$
-- 1. Set last_completed_at = p_completed_at
-- 2. Set last_completed_route_id = p_route_id
-- 3. Calculate next_due_date based on frequency:
--    WEEKLY: + 7 days
--    BIWEEKLY: + 14 days
--    MONTHLY: + 1 month
--    QUARTERLY: + 3 months
--    CUSTOM: + custom_interval_days
-- 4. Return updated record
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Integration with Route Generation (Phase 1)

The `generate_daily_routes` RPC checks periodic tasks:
```sql
-- Inside generate_daily_routes:
-- For each active periodic_task where:
--   next_due_date <= p_target_date + INTERVAL '3 days'
--   AND auto_add_to_route = true
--   AND status = 'ACTIVE'
-- Find the route that visits the same site_job_id
-- Add a route_stop_task to that stop
-- If no route visits that site, flag it for Paulette's review
```

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/operations/periodic-tasks` | List all periodic tasks (filter by status, overdue, due-soon) |
| POST | `/api/operations/periodic-tasks` | Create periodic task |
| GET | `/api/operations/periodic-tasks/[code]` | Get detail |
| PATCH | `/api/operations/periodic-tasks/[code]` | Update |
| POST | `/api/operations/periodic-tasks/[code]/complete` | Mark as completed, recalculate next due |
| POST | `/api/operations/periodic-tasks/[code]/archive` | Soft-delete |

### Web UI

New tab in Operations or Schedule:
```typescript
{ key: 'periodic', label: 'Periodic Tasks', icon: <RefreshCw className="h-4 w-4" /> },
```

New files:
```
apps/web/src/app/(dashboard)/operations/periodic/
  periodic-tasks-table.tsx      — Table with overdue/due-soon/all filter chips
  periodic-task-detail.tsx      — Detail showing history of completions
apps/web/src/components/forms/
  periodic-task-form.tsx        — Create/edit (SlideOver)
```

**Table columns:** Task name, Site, Frequency, Last Done, Next Due, Status, Assigned To
**Filter chips:** Overdue (red count), Due This Week (yellow count), All
**Row click:** Opens detail with completion history timeline

### Acceptance Criteria
1. Paulette can create periodic tasks with site, frequency, and description
2. System auto-calculates next due date after each completion
3. Route generation auto-injects periodic tasks due within 3 days
4. Overdue tasks highlighted in red on the Periodic Tasks table
5. Completion history visible per periodic task

---

## Phase 6: Field Quick Forms + Specialist Mobile View

### Purpose
Replaces the text/phone/email communication for field reporting. Specialists (who don't have company phones and use personal devices) get a dead-simple mobile experience with 4 big buttons. Floaters can also submit quick reports from the route.

### Database Changes

#### New Migration: `00093_field_reports.sql`

**Table: `field_reports`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `report_code` | TEXT | UNIQUE, NOT NULL | FR-XXXX |
| `report_type` | TEXT | NOT NULL, CHECK IN ('SUPPLY_REQUEST','MAINTENANCE','DAY_OFF','INCIDENT','GENERAL') | |
| `reported_by` | UUID | NOT NULL, FK → staff | |
| `site_id` | UUID | FK → sites, nullable | |
| `description` | TEXT | NOT NULL | |
| `priority` | TEXT | DEFAULT 'NORMAL', CHECK IN ('LOW','NORMAL','HIGH','URGENT') | |
| `photos` | JSONB | nullable | Array of storage URLs |
| `requested_items` | JSONB | nullable | For supply requests: `[{supply_id, qty}]` |
| `requested_date` | DATE | nullable | For day-off requests |
| `status` | TEXT | DEFAULT 'OPEN', CHECK IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','DISMISSED') | |
| `acknowledged_by` | UUID | FK → staff, nullable | |
| `acknowledged_at` | TIMESTAMPTZ | nullable | |
| `resolution_notes` | TEXT | nullable | |
| `resolved_by` | UUID | FK → staff, nullable | |
| `resolved_at` | TIMESTAMPTZ | nullable | |
| Standard columns | | | |

### Extend Sites Table

```sql
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cleaning_procedures TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cleaning_procedures_photos JSONB;
```

These columns store the step-by-step cleaning instructions and reference photos for each site. Written by Paulette in the Site detail page. Shown to specialists in the mobile "My Site" view.

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/operations/field-reports` | List field reports (filter by type, status, site) |
| POST | `/api/operations/field-reports` | Create field report |
| PATCH | `/api/operations/field-reports/[code]` | Update (acknowledge, resolve) |
| GET | `/api/operations/field-reports/my` | Get current user's submitted reports |

### Mobile: Specialist View

When user role = CLEANER and they have no route assigned (i.e., they are a specialist, not a floater):

Replace the default "Today" tab with a specialist-specific experience.

New files:
```
apps/mobile/app/(specialist)/              — New layout group for specialists
  _layout.tsx
  my-sites.tsx                              — Tab 1: My assigned sites
  quick-report.tsx                          — Tab 2: Quick report buttons
  [siteId]/procedures.tsx                   — Site procedures view
apps/mobile/src/hooks/use-my-sites.ts       — Fetch specialist's assigned sites
apps/mobile/src/hooks/use-field-report.ts   — Submit field reports
apps/mobile/src/components/big-button.tsx   — Large action button (56px height, full width)
apps/mobile/src/components/procedure-step.tsx — Procedure step with photo
```

**Tab 1: "My Sites"**
- Shows 1-3 assigned sites as large cards
- Each card: site name, address, "View Procedures" button
- Procedures screen: rich text + embedded photos showing how to clean this site

**Tab 2: "Quick Report"**
- 4 large buttons, full-width, 56px height each, with icon + label:
  1. "I Need Supplies" → opens supply request form
  2. "Something Is Broken" → opens maintenance report with camera
  3. "Day Off Request" → opens date picker + reason
  4. "Other" → opens general text form
- Each form: 3-4 fields max, one-tap submit
- On submit: creates `field_report` → notification to Paulette + Anderson

### Web: Field Reports Tab

Add to Workforce module (since Paulette manages people):
```typescript
{ key: 'field-reports', label: 'Field Reports', icon: <Inbox className="h-4 w-4" /> },
```

New files:
```
apps/web/src/app/(dashboard)/workforce/field-reports/
  field-reports-table.tsx       — Table with type + status filter chips
  field-report-detail.tsx       — Detail view
```

### Web: Site Procedures Editor

Extend existing site detail page (`/crm/sites/[id]/page.tsx`):
- Add new section card: "Cleaning Procedures"
- Rich text editor (or textarea for v1) for step-by-step instructions
- Photo upload for procedure reference photos
- "This content is shown to specialists on their phones."

### i18n Keys

```typescript
// EN
'specialist.mySites': 'My Sites',
'specialist.viewProcedures': 'How to clean this site',
'specialist.quickReport': 'Quick Report',
'specialist.needSupplies': 'I need supplies',
'specialist.somethingBroken': 'Something is broken',
'specialist.dayOff': 'Day off request',
'specialist.other': 'Other',
'specialist.reportSent': 'Report sent. The office will see this.',
'specialist.procedures': 'Cleaning Procedures',
'specialist.noProcedures': 'No procedures available yet.',

'fieldReport.title': 'Field Reports',
'fieldReport.supplyRequest': 'Supply Request',
'fieldReport.maintenance': 'Maintenance Report',
'fieldReport.dayOffRequest': 'Day Off Request',
'fieldReport.incident': 'Incident Report',
'fieldReport.general': 'General Report',
'fieldReport.status.OPEN': 'Open',
'fieldReport.status.ACKNOWLEDGED': 'Acknowledged',
'fieldReport.status.IN_PROGRESS': 'In Progress',
'fieldReport.status.RESOLVED': 'Resolved',
'fieldReport.status.DISMISSED': 'Dismissed',
'fieldReport.acknowledge': 'Acknowledge',
'fieldReport.resolve': 'Resolve',
'fieldReport.whatDate': 'What date?',
'fieldReport.whatItems': 'What do you need?',
'fieldReport.describe': 'Describe the issue',

// ES
'specialist.mySites': 'Mis Sitios',
'specialist.viewProcedures': 'Cómo limpiar este sitio',
'specialist.quickReport': 'Reporte Rápido',
'specialist.needSupplies': 'Necesito suministros',
'specialist.somethingBroken': 'Algo está roto',
'specialist.dayOff': 'Solicitud de día libre',
'specialist.other': 'Otro',
'specialist.reportSent': 'Reporte enviado. La oficina lo verá.',
'specialist.procedures': 'Procedimientos de Limpieza',

'fieldReport.title': 'Reportes de Campo',
'fieldReport.acknowledge': 'Confirmar recibido',
'fieldReport.resolve': 'Resolver',
'fieldReport.whatDate': '¿Qué fecha?',
'fieldReport.whatItems': '¿Qué necesitas?',
'fieldReport.describe': 'Describe el problema',

// PT-BR
'specialist.mySites': 'Meus Locais',
'specialist.viewProcedures': 'Como limpar este local',
'specialist.quickReport': 'Relatório Rápido',
'specialist.needSupplies': 'Preciso de suprimentos',
'specialist.somethingBroken': 'Algo está quebrado',
'specialist.dayOff': 'Pedido de folga',
'specialist.other': 'Outro',
'specialist.reportSent': 'Relatório enviado. O escritório vai ver.',
'specialist.procedures': 'Procedimentos de Limpeza',

'fieldReport.title': 'Relatórios de Campo',
'fieldReport.acknowledge': 'Confirmar recebido',
'fieldReport.resolve': 'Resolver',
'fieldReport.whatDate': 'Qual data?',
'fieldReport.whatItems': 'O que você precisa?',
'fieldReport.describe': 'Descreva o problema',
```

### Acceptance Criteria
1. Specialists open the app on their personal phone → see their assigned sites
2. Tap a site → see cleaning procedures with photos
3. Tap "I Need Supplies" → select items → submit → Paulette sees it immediately
4. Tap "Something Is Broken" → take photo → describe → submit
5. Tap "Day Off Request" → pick date → submit → appears in Field Reports for approval
6. Paulette sees all field reports in the web dashboard, can acknowledge and resolve
7. All forms work offline (queue mutations)
8. Procedures entered by Paulette in the site detail page show up on the specialist's phone

---

## Phase 7: Customer Portal

### Purpose
Customers get transparent access to inspection reports, complaint status, and can submit new complaints. Inspection reports go directly to the customer AND Anderson — unedited. Work tickets from deficiencies are auto-generated. Kudos recognition for strong performance.

### Database Changes

#### New Migration: `00094_customer_portal.sql`

**Table: `customer_portal_sessions`**
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | NOT NULL, FK → tenants |
| `client_id` | UUID | NOT NULL, FK → clients |
| `token_hash` | TEXT | UNIQUE, NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `last_used_at` | TIMESTAMPTZ | nullable |
| `is_active` | BOOLEAN | DEFAULT true |

**Table: `customer_feedback`**
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `tenant_id` | UUID | NOT NULL, FK → tenants | |
| `feedback_code` | TEXT | UNIQUE, NOT NULL | FB-XXXX |
| `client_id` | UUID | NOT NULL, FK → clients | |
| `site_id` | UUID | FK → sites, nullable | |
| `feedback_type` | TEXT | CHECK IN ('COMPLAINT','KUDOS','SUGGESTION','QUESTION') | |
| `submitted_via` | TEXT | CHECK IN ('PORTAL','EMAIL','PHONE','IN_PERSON') | |
| `contact_name` | TEXT | nullable | |
| `message` | TEXT | NOT NULL | |
| `photos` | JSONB | nullable | |
| `linked_complaint_id` | UUID | FK → complaint_records, nullable | Auto-created for COMPLAINT type |
| `status` | TEXT | DEFAULT 'NEW', CHECK IN ('NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED') | |
| Standard columns | | | |

### Architecture

Follow existing public portal pattern at `apps/web/src/app/(public)/`. The customer portal uses signed tokens (not Supabase Auth) — same approach as `public-proposals` and `public-counts`.

New route group:
```
apps/web/src/app/(public)/portal/
  page.tsx                          — Login (enter access code / magic link)
  [token]/
    page.tsx                        — Dashboard
    layout.tsx                      — Portal layout (no app shell)
    inspections/
      page.tsx                      — Inspection reports list
      [id]/page.tsx                 — Individual inspection report
    complaints/
      page.tsx                      — Complaint history
      new/page.tsx                  — Submit new complaint
    feedback/
      new/page.tsx                  — Submit kudos/suggestion
```

### API Routes

New module at `apps/web/src/modules/public-portal/`:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/public/portal/auth` | Validate token, return session |
| GET | `/api/public/portal/[token]/dashboard` | Client dashboard data |
| GET | `/api/public/portal/[token]/inspections` | List completed inspections for client's sites |
| GET | `/api/public/portal/[token]/inspections/[id]` | Full inspection report with scores and photos |
| GET | `/api/public/portal/[token]/complaints` | Complaint history |
| POST | `/api/public/portal/[token]/feedback` | Submit new complaint, kudos, or suggestion |
| GET | `/api/public/portal/[token]/work-tickets` | Recent work tickets for visibility |

### Web UI (Portal-Side)

Portal uses a minimal layout (no AppShell sidebar). Clean, customer-facing design.

**Dashboard:**
- Welcome message with client name
- Cards: "Recent Inspections" (last 3), "Open Complaints" (count), "Submit Feedback"
- Inspection card: site name, date, score, pass/fail badge

**Inspection Report:**
- Site name + date + inspector name
- Overall score bar
- Item-by-item breakdown with scores
- Issue photos
- PDF download button (reuse existing `proposals-pdf` pattern)

**Complaint Submission:**
- Site selector (dropdown of client's sites)
- Category (cleaning quality, supply, damage, etc.)
- Message text
- Photo upload (uses existing `FileDropzone` component)
- Submit → creates `customer_feedback` (type: COMPLAINT) → auto-creates `complaint_record` → notification to Paulette + Anderson

**Kudos Submission:**
- Site selector
- Message text
- Submit → creates `customer_feedback` (type: KUDOS) → notification to assigned specialist + supervisor

### Web UI (Admin-Side)

Add "Customer Portal" section in Admin or CRM:
- Generate access tokens for clients
- View portal activity
- Manage active sessions

### Auto-Work Ticket from Inspection Deficiencies

When an inspection is completed with issues marked as MAJOR or CRITICAL:
1. System auto-creates a work ticket for the deficient site
2. Ticket type: "INSPECTION_FOLLOWUP"
3. Description includes the specific deficiency items
4. Appears on Paulette's operations dashboard
5. Can be injected into a route

### Acceptance Criteria
1. Customer accesses portal via magic link or access code
2. Sees inspection reports immediately (unedited, real-time)
3. Can submit complaints with photos
4. Complaints auto-create complaint_records in the system
5. Customer sees complaint progress updates
6. Can submit kudos for positive recognition
7. Inspection deficiencies auto-generate work tickets
8. Anderson (owner) sees all portal activity

---

## Phase 8: Owner Dashboard + Supply Cost Tracking + Microfiber Program

### Purpose
Anderson's operational command center. KPIs, supply costs per site, microfiber program tracking, and a daily overview snapshot.

### Database Changes

#### New Migration: `00095_owner_dashboard.sql`

**Extend `staff` table for microfiber program:**
```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS microfiber_enrolled BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS microfiber_enrolled_at DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS microfiber_exited_at DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS microfiber_rate_per_set NUMERIC(6,2) DEFAULT 5.00;
```

**Table: `microfiber_wash_log`**
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | NOT NULL, FK → tenants |
| `staff_id` | UUID | NOT NULL, FK → staff |
| `site_id` | UUID | NOT NULL, FK → sites |
| `wash_date` | DATE | NOT NULL |
| `sets_washed` | INTEGER | NOT NULL DEFAULT 1 |
| `amount_due` | NUMERIC(6,2) | NOT NULL |
| `payroll_period_start` | DATE | nullable |
| `payroll_period_end` | DATE | nullable |
| `exported` | BOOLEAN | DEFAULT false |
| Standard columns | | |

**Table: `site_supply_costs`**
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | NOT NULL, FK → tenants |
| `site_id` | UUID | NOT NULL, FK → sites |
| `supply_id` | UUID | NOT NULL, FK → supply_catalog |
| `delivery_date` | DATE | NOT NULL |
| `quantity` | INTEGER | NOT NULL |
| `unit_cost` | NUMERIC(12,2) | NOT NULL |
| `total_cost` | NUMERIC(12,2) | NOT NULL |
| `source` | TEXT | CHECK IN ('DELIVERY','ORDER','MANUAL') |
| `route_id` | UUID | FK → routes, nullable |
| Standard columns | | |

### API Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/reports/owner-dashboard` | Aggregated KPI data |
| GET | `/api/reports/supply-costs` | Supply costs by site, date range |
| GET | `/api/reports/supply-costs/[siteId]` | Cost breakdown for one site |
| GET | `/api/workforce/microfiber` | Microfiber enrollment list |
| POST | `/api/workforce/microfiber/[staffId]/enroll` | Enroll specialist |
| POST | `/api/workforce/microfiber/[staffId]/exit` | Remove from program |
| GET | `/api/workforce/microfiber/export` | CSV export for payroll |

### Web UI: Owner Dashboard

Extend `/home` page when role = OWNER_ADMIN:

New files:
```
apps/web/src/app/(dashboard)/home/
  owner-overview.tsx            — Owner-specific dashboard section
  kpi-cards.tsx                 — KPI stat cards
  supply-cost-chart.tsx         — Supply cost by site (bar chart)
  daily-snapshot.tsx            — "What happened yesterday / what's due today"
```

**KPI Cards (top row):**
- Complaint Response Time (avg hours, this month) — calculated from `complaint_records`
- First-Time Resolution Rate (%) — complaints resolved without reopening
- Inventory On-Time Rate (%) — from `inventory_counts` vs schedule
- Specialist Turnover (rolling 90 days) — from `staff` status changes
- Supply Cost MTD — from `site_supply_costs`

**Daily Snapshot (below KPIs):**
- Pending day-off requests (from `field_reports` type = DAY_OFF, status = OPEN)
- Tonight's routes (floater names, stop counts)
- Overdue periodic tasks (count, link to list)
- Unreviewed Night Bridge summaries (count, link)
- Open complaints (count by priority)

**Supply Cost Panel:**
- Date range picker
- Bar chart: cost per site (top 10 highest)
- Drill into a site: itemized supply cost breakdown
- Trend line: total supply cost per month

### Web UI: Microfiber Program

Add to Workforce module as a sub-section or tab:

```
apps/web/src/app/(dashboard)/workforce/microfiber/
  microfiber-table.tsx          — Enrolled specialists table
  microfiber-export.tsx         — Export for payroll
```

**Table columns:** Staff name, sites, rate per set, enrolled date, status
**Actions:** Enroll, Remove from program
**Export:** CSV download with columns: staff_name, staff_code, period_start, period_end, sets_washed, amount_due

### Supply Cost Auto-Logging

When a delivery task is completed on a route (Phase 1):
1. For each item in `delivery_items`:
   - Look up `unit_cost` from `supply_catalog`
   - Create a `site_supply_costs` record
   - Link to the route
2. This happens automatically — no manual entry needed

### Acceptance Criteria
1. Anderson opens Home → sees KPI cards with real data
2. Complaint response time is calculated from actual complaint records
3. Supply cost per site is visible with monthly trends
4. Microfiber enrollment can be managed (enroll/remove)
5. Biweekly payroll export produces CSV with accurate amounts
6. Daily snapshot shows today's pending items

---

## Complete i18n Backfill: PT-BR Full Coverage

### Purpose
This task is complete. `ptBR` now matches EN/ES key coverage for implemented locales in this codebase.

### Approach
All missing PT-BR translations were added to the `ptBR` object in `i18n.ts` using the same key structure and neutral Brazilian Portuguese.

Validation snapshot (2026-02-26):
- EN keys: 479
- ES keys: 479
- PT-BR keys: 479
- Missing PT-BR keys vs EN: 0

---

## Migration Data Strategy (Monday.com → GleamOps)

### Import Sequence

**Step 1: Verify Site Records**
Sites already exist in CRM (`sites` table). Cross-reference with Monday.com Job Master. For each of the ~150 sites:
- Verify address matches
- Add `entry_instructions` (from FYI board)
- Add `access_notes` (from supervisor board FYI)
- Add `alarm_code` (from Job Master)
- Add `cleaning_procedures` (from task updates — Phase 6)
- Set `access_window_start` / `access_window_end` (from Monday.com "Access" column) — this requires extending the `sites` table:
  ```sql
  ALTER TABLE sites ADD COLUMN IF NOT EXISTS access_window_start TIME;
  ALTER TABLE sites ADD COLUMN IF NOT EXISTS access_window_end TIME;
  ```

**Step 2: Create Route Templates**
For each weekday (Mon–Sat):
- Paulette creates a route template
- Adds stops in the order she currently uses in Monday.com
- Adds tasks per stop (deliver/pickup, inspect, clean)
- Sets access windows per stop
- Assigns floater (Jorman, Luis, or others)

This is manual entry by Paulette, not automated import. The Monday.com data is too messy for automated migration (emoji dividers, mixed languages, "Duplicate of Duplicate" groups).

**Step 3: Create Periodic Tasks**
Extract from Monday.com "Master Tasks" group (~10 items):
- Floor scrub schedules
- Buffing schedules
- Log book check dates
- Virex bottle fill schedules

Manual entry. ~30 minutes of data entry.

**Step 4: Supply Assignments**
Cross-reference Monday.com delivery task updates with `supply_assignments` table:
- For each site that receives deliveries: verify supply list matches
- Add delivery quantities to route template tasks

**Step 5: Microfiber Program Enrollment**
Mark enrolled specialists in the staff records. Set rate per set. ~5-10 records.

---

## Data NOT Imported (Archived)

- 2,000+ photos from Monday.com → remain in Monday.com as historical archive
- Completed daily tasks older than 90 days → not imported
- Empty duplicate groups → discarded
- Request Tracker (empty) → replaced by Phase 4 + Phase 6
- Paulette's personal task list → replaced by Ops Dashboard

---

## Roles + Permissions Matrix (Complete)

| Role | Web Modules | Mobile Tabs | Can Create | Can Approve | Site Scope |
|---|---|---|---|---|---|
| **OWNER_ADMIN** | All | Read-only overview | Everything | Everything | All sites |
| **MANAGER** | All except Admin billing | Floater route (optional) | Routes, complaints, templates, periodic tasks, field report resolutions | Day-off requests, complaint resolutions | All sites |
| **SUPERVISOR** | Limited (their routes, inspections) | Floater route | Issues, field reports | Nothing | Assigned sites |
| **CLEANER (floater)** | None | Floater route | Issues, task completions, photos | Nothing | Route-assigned sites |
| **CLEANER (specialist)** | None | Specialist view (My Sites + Quick Reports) | Field reports, supply requests, day-off requests | Nothing | Assigned sites only |
| **INSPECTOR** | Inspections only | Inspections tab | Inspections, issues | Nothing | Inspection-assigned sites |
| **SUBCONTRACTOR** | Limited (their sites, procedures, inventory forms) | Specialist-like view | Field reports, inventory counts | Nothing | Contracted sites only |
| **CUSTOMER** | Portal only (no app shell) | None | Feedback (complaints, kudos) | Nothing | Their sites only |

---

This is the complete implementation plan. Each phase is self-contained and can be built independently, though Phases 1-3 form the critical path (Route Templates → Load Sheet → Night Bridge). Phase 4 (Complaints) and Phase 6 (Field Reports + Specialist View) address your biggest operational pain points. Phase 7 (Customer Portal) delivers the transparency your customers need. Phase 8 (Owner Dashboard) gives you the visibility you've been missing.

---

## Dependency Graph

```
Phase 1 (Route Templates) ─────┬──→ Phase 2 (Load Sheet)
                                ├──→ Phase 3 (Night Bridge)
                                ├──→ Phase 4 (Complaints) ──→ Phase 7 (Customer Portal)
                                └──→ Phase 5 (Periodic Tasks)

Phase 6 (Field Reports + Specialist) ── independent, can run in parallel with 4-5

Phase 8 (Owner Dashboard) ── depends on Phases 1, 4, 5, 6

i18n PT-BR Backfill ── fully independent, can run in parallel with any phase
```

### Suggested Execution Order
1. Phase 1 (Route Templates) — critical path, everything depends on this
2. Phase 2 (Load Sheet) — builds on Phase 1 delivery tasks
3. Phase 3 (Night Bridge) — builds on Phase 1 shift data
4. Phase 4 (Complaints) + Phase 6 (Field Reports) — can be parallelized
5. Phase 5 (Periodic Tasks) — integrates with Phase 1 route generation
6. Phase 7 (Customer Portal) — depends on Phase 4 complaints
7. Phase 8 (Owner Dashboard) — aggregates data from all previous phases
8. i18n PT-BR Backfill — do anytime, ideally alongside Phase 1
