# QA Sweep Changelog — March 3, 2026

> Complete log of all fixes deployed during the full-application QA audit (Modules 1–19).
> All changes passed `pnpm typecheck` + `pnpm build` before deployment.

---

## Database Migrations Applied

| Migration | Description |
|-----------|-------------|
| `20260303100004_fix_anomalous_pay_rates.sql` | Normalize hourly pay_rate > $200 (preserves salary employees) |
| `20260303100005_break_rules_table.sql` | New `break_rules` table with RLS, triggers, 3 seed rules |
| `20260303100006_shift_tags_table.sql` | New `shift_tags` table with RLS, triggers, unique constraint, 4 seed tags |
| `20260303100007_fix_security_definer_views.sql` | Set `security_invoker = on` on 9 views (hr_leave_requests, v_staff_roster, daily_routes, checklist_instances, v_active_sites, v_sites_full, employees, checklist_items, v_upcoming_tickets) |

---

## New Tables

### break_rules
- **Purpose:** Configure automatic break application rules per shift duration
- **Columns:** name, duration_minutes, is_paid, applies_to, min_shift_hours, is_active
- **RLS:** tenant_id = current_tenant_id()
- **Triggers:** set_updated_at, set_version_etag, prevent_hard_delete, auto_set_tenant_id
- **Seed data:** Standard Break (30min unpaid, 6h), Short Break (15min paid, 4h), Extended Lunch (60min unpaid, 8h)

### shift_tags
- **Purpose:** Categorize and color-code shifts for visual identification
- **Columns:** name, color, description, is_active
- **Constraints:** UNIQUE(tenant_id, name)
- **RLS:** tenant_id = current_tenant_id()
- **Triggers:** set_updated_at, set_version_etag, prevent_hard_delete, auto_set_tenant_id
- **Seed data:** Training (blue), Deep Clean (green), Emergency Cover (red), Weekend Premium (purple)

---

## Security Fixes

### 9 SECURITY DEFINER Views → SECURITY INVOKER
All 9 public views were using SECURITY DEFINER (enforces view creator's RLS). Changed to `security_invoker = on` so the querying user's RLS policies are enforced. Views affected: hr_leave_requests, v_staff_roster, daily_routes, checklist_instances, v_active_sites, v_sites_full, employees, checklist_items, v_upcoming_tickets.

---

## Systemic Fixes (Applied Across All Modules)

### HEAD → GET KPI Migration
Every module page that used `select('id', { count: 'exact', head: true })` for KPI counters was converted to `select('id')` with `.data?.length`. Supabase HEAD requests returned 503 across the app, causing KPI counters to show 0 or dashes.

**Pages fixed:**
- `team-page.tsx` — payroll, microfiber, break-rules, shift-tags, fallback tabs
- `clients-page.tsx` — all tabs
- `jobs-page.tsx` — all tabs
- `inventory-page.tsx` — all tabs (supplies, kits, site-assignments, counts, warehouse, orders, forecasting, vendors)
- `equipment-page.tsx` — equipment, vehicles, key_inventory, vehicle_maintenance
- `safety-page.tsx` — staff_certifications, safety_documents, training_completions
- `catalog-page.tsx` — tasks, services, service_tasks
- `settings/settings-page.tsx` — lookups, status_transitions, geofences, system_sequences
- `admin/data-hub/data-hub-panel.tsx` — all 9 dataset count queries

### UTC Date Off-by-One Fix
`new Date().toISOString().slice(0, 10)` returns UTC date (previous day in US timezones). Fixed in:
- `owner-dashboard.service.ts` — `nowDateKey()` and `monthStartKey()` now use local date components
- `microfiber-table.tsx` — `formatDate()` parses YYYY-MM-DD as local time via `new Date(year, month-1, day)`
- `inventory/counts/[id]/page.tsx` — count detail page `formatDate()` uses same local parse pattern
- `maintenance-form.tsx` — service date default uses `todayLocal()` instead of `toISOString()`

### Breadcrumb Improvements
- `breadcrumbs.tsx` — widened max-width from 120/160/200px to 160/200/260px to reduce truncation
- `breadcrumbs.tsx` — changed `team` segment from "Workforce" to "Team"
- `breadcrumbs.tsx` — added TAB_GROUP_LABELS for Procurement tabs (orders, forecasting, vendors show "Procurement" instead of "Inventory")
- `breadcrumbs.tsx` — added PATH_OVERRIDES for vendors/supply-vendors → "Vendor Directory"

---

## Module-by-Module Fixes

### Team → Timesheets (timesheets-table.tsx)
- Added `statusFilter` state with 5 options: All, Draft, Submitted, Approved, Rejected
- Added filter chip buttons with live counts above the table
- Updated `filtered` useMemo to apply status filter before search
- Filter chips appear in both empty-state and data views

### Team → Payroll (payroll-table.tsx) — COMPLETE REWRITE
- Rewrote from 126 lines to 773 lines (single flat table → 4-panel module)
- **Scheduled Hours:** Enhanced with pay_type badge, approved hours per staff, CSV export, salary employees show `/biweekly` instead of `/hr`
- **Confirmed Hours:** NEW — timesheets table with staff join, status filter chips (All/Submitted/Approved/Rejected), approve/reject actions, CSV export
- **Confirmed Time Sheets:** NEW — payroll runs with DRAFT→CALCULATED→APPROVED→EXPORTED workflow, period dates, run type badges, "+ New Payroll Run" button
- **Payroll Settings:** NEW — pay periods CRUD with date inputs, earning codes CRUD with type select, overtime rules display
- Updated PayrollWrapper in team-page.tsx to pass subTab prop

### Team → Microfiber (microfiber-table.tsx)
- Fixed enrolled date off-by-one (BUG-C49) — both write side (nowDateKey) and display side (formatDate)
- Added ConfirmDialog before Enroll/Remove actions with contextual messages and danger variant for removes
- Made empty state search-aware ("No matching specialists" / "Try a different search term")

### Team → Break Rules (break-rules-table.tsx) — COMPLETE REWRITE
- Was: static hardcoded sample data with dead buttons (79 lines)
- Now: full Supabase-backed CRUD with SlideOver form (250+ lines)
- Add via SlideOver: Rule Name, Duration, Paid/Unpaid, Applies To, Min Shift Hours
- Edit: click any row or pencil icon to open pre-populated SlideOver
- Delete: trash icon → ConfirmDialog (danger variant) → soft delete
- Column sorting on Rule Name, Duration, Min Shift Hours
- Created `break_rules` table via migration

### Team → Shift Tags (shift-tags-table.tsx) — COMPLETE REWRITE
- Was: static hardcoded sample data with dead buttons (88 lines)
- Now: full Supabase-backed CRUD with SlideOver form (240+ lines)
- Add via SlideOver: Tag Name, Color (7 presets), Description
- Live color preview badge in form
- Edit: click any row or pencil icon
- Delete: trash icon → ConfirmDialog (danger variant)
- Column sorting on Tag Name and Description
- Unique constraint on (tenant_id, name) with friendly duplicate error
- Created `shift_tags` table via migration

### Team KPIs (team-page.tsx)
- **Payroll tab:** Switched from HEAD to GET; shows Staff on Payroll, Scheduled Hours, Confirmed Hours, Pending Confirm
- **Microfiber tab:** NEW — Enrolled Specialists, Total Staff, Avg Rate/Set, Enrollment %
- **Break Rules tab:** NEW — Rules Configured, Paid Breaks, Unpaid Breaks, Positions
- **Shift Tags tab:** NEW — Tags Configured, Colors Used, Active Staff, Positions
- Fallback tabs also switched from HEAD to GET

### Clients Hub (clients-page.tsx)
- Converted to tab-aware dynamic KPI array
- **Contacts tab:** Total Contacts, Primary Contacts, With Email, With Phone
- **Requests tab:** Open Requests (warn), Approved, Rejected, Total Requests
- **Sites tab:** Total Sites, Active Sites, Total Clients, Active Clients
- **Clients tab (default):** Total Clients, Active Clients, Total Sites, Active Sites

### Clients → Requests (change-requests-table.tsx)
- Empty state now renders Table + TableHeader with 7 column headers above EmptyState

### Jobs Hub (jobs-page.tsx)
- Converted to tab-aware dynamic KPI array
- **Time tab:** Open Exceptions (warn), Critical (warn), Warnings, This Week
- All other tabs: Tickets Today, Open Tickets, Active Service Plans, Open Alerts

### Inventory → Supply Catalog (supplies-table.tsx)
- Extended search to match brand and preferred_vendor (not just name/code/category)
- Widened name column from max-w-[220px] to max-w-[320px]

### Inventory → Supply Form (supply-form.tsx)
- Added Markup (%) and Billing Rate ($) fields with auto-calculation
- Billing rate = unit_cost * (1 + markup / 100)
- Both fields persist to supply_catalog table on save

### Inventory → Supply Detail ([id]/page.tsx)
- Fixed back link from `/inventory` to `/inventory?tab=supplies`
- Updated label from "Back to Inventory" to "Back to Supply Catalog"

### Inventory → Kits (kits-table.tsx)
- Fixed Kit Code auto-generation (BUG-C52): pass proper tenant_id to next_code RPC instead of null
- Added client-side fallback code (KIT-{timestamp}) if RPC fails
- Restructured empty state: table header + Export CSV now render even with 0 kits
- Added inline "+ New Kit" action button in empty state

### Inventory → Site Assignments (site-assignments-table.tsx)
- Filter out via.placeholder.com URLs from image_url (503 broken images → Package2 fallback icon)
- Added responsive column hiding: Img/Type/Vendor/Assigned Date/SDS hidden on mobile; Par Level and Action always visible

### Inventory → Stock Counts Detail (counts/[id]/page.tsx)
- Fixed UTC date off-by-one on detail page formatDate
- Updated back link label to "Back to Stock Counts"

### Inventory → Warehouse (warehouse-panel.tsx)
- Added search feedback message when all sections are empty and search is active

### Inventory → Purchase Orders (orders-table.tsx)
- Removed duplicate "+ New Order" button from inventory page toolbar (table has its own)
- Show onboarding CTA with bullets on ALL status tabs when zero total orders (not just "All" tab)

### Inventory → Forecasting (forecasting-panel.tsx)
- Replaced non-functional location dropdown with "No locations configured" hint when empty
- Skip shared Inventory KPIs for forecasting tab (panel renders its own 4 domain-specific cards)

### Inventory KPIs (inventory-page.tsx) — Tab-Aware
- **Supplies:** Active Supplies, Below Par (destructive), Open Orders, Pending Counts
- **Kits:** Total Kits, Kit Items, Catalog Supplies, Avg Items/Kit
- **Site Assignments:** Total Assignments, Sites Assigned, Total Sites, Catalog Supplies
- **Counts:** Total Counts, Pending (warn), This Month, Items Counted
- **Warehouse:** Locations, Movements, Open Requests (warn), Purchase Orders
- **Orders:** Total Orders, Ordered, Shipped, Drafts
- **Forecasting:** Skipped (panel has own KPIs)
- **Vendors:** Total Vendors, Linked Supplies, Total Orders, Avg Supplies/Vendor

### Vendor Directory Detail (vendors/supply-vendors/[slug]/page.tsx)
- Fixed back links from `/vendors?tab=vendors` (old route) to `/inventory?tab=vendors`
- Updated label to "Back to Vendor Directory"

### Assets → Equipment (equipment-table.tsx)
- Added IN_SERVICE to condition filter tabs and EQUIPMENT_CONDITION_COLORS (green)
- Widened equipment name column from max-w-[220px] to max-w-[320px]

### Assets → Assigned Gear (eq-assignments-table.tsx)
- Made empty state search-aware

### Assets → Keys Form (key-form.tsx)
- Added "Assigned To" staff dropdown (47 active staff)
- Added auto-generated key codes via next_code RPC with KEY prefix + fallback
- Hint text: "Auto-generated — editable if needed"

### Assets → Fleet Form (vehicle-form.tsx)
- Added "Assigned To" staff dropdown
- Added auto-generated vehicle codes via next_code RPC with VEH prefix + fallback
- Added sorting to Make/Model column header in vehicles-table.tsx

### Assets → Maintenance (maintenance-form.tsx + maintenance-table.tsx)
- **BUG-C53 FIX:** Added "Vehicle / Equipment" dropdown to maintenance form (was missing — orphaned records)
- Fixed service_date default from UTC toISOString to local todayLocal()
- Added table headers that render even with 0 records
- Added Export CSV button with maintenance-specific columns
- Made empty state search-aware

### Compliance KPIs (safety-page.tsx)
- Converted all 4 KPIs from HEAD to GET
- Made KPIs tab-aware: incidents tab shows Open Incidents, High/Critical, Total, Resolved

### Compliance → Incidents (incidents-table.tsx)
- Added "Assigned To" staff dropdown (persists assigned_to_staff_id)
- Added Status dropdown: Open, In Progress, Resolved, Closed
- Auto-filled due date with today's local date
- Made empty state search-aware
- Loaded staff list for dropdown

### Compliance → Expiration Tracker (safety-page.tsx)
- Added 'expiration-tracker' as tab alias for 'calendar'

### Reports → Overview (NEW: overview/overview-dashboard.tsx)
- Created full executive overview dashboard replacing 4 bare KPIs
- **8 KPI cards:** Monthly Revenue, Annual Projection, Open Tickets (with today count), Pipeline Value (with opp count), Active Staff, Supply Items, Active Jobs, Inspection Pass Rate
- **4 visualization cards:** Top Clients by Revenue (top 5 + progress bars), Ticket Status (breakdown + badges), Staff by Role (distribution + bars), Supplies by Category (breakdown + bars)
- Cross-navigation buttons: View Clients, View Jobs, View Team, View Inventory
- Queries 7 Supabase tables with FK joins
- Loading skeletons + empty states per card

### Reports → MetricCard (report-components.tsx)
- Fixed KPI value line-break at 768px: replaced `[overflow-wrap:anywhere]` with `whitespace-nowrap overflow-hidden text-ellipsis`
- Reduced clamp minimum from 1rem to 0.875rem for tighter mobile fit

### Service Catalog → Task Library (tasks-table.tsx)
- Added category filter pill buttons with live counts above table
- Categories auto-computed from task data (not hardcoded)
- Filter applies before search (combinable)

### Service Catalog → Service Definitions (service-config.tsx)
- **BUG-C54 FIX:** Fixed search crash (TypeError: Cannot read properties of undefined 'toLowerCase') — added null-safe fallbacks `(r.name ?? '')`, `(r.code ?? '')`, `(r.description ?? '')`
- Added task count filter chips: All / Has Tasks / No Tasks

### Service Catalog → Task Mapping (service-task-mapping.tsx) — COMPLETE REWRITE
- **BUG-C55 FIX:** Rewrote data fetch with explicit column select (not SELECT *), error handling with toast, limit 500
- **BUG-C56 FIX:** Fixed catalog KPIs from HEAD to GET
- Added Category column from task join
- Added Export CSV button
- Added pagination (25 per page)
- Added 4 sortable columns (Service, Task, Frequency, Seq #)
- Added mapping count display and search-aware empty state

### Service Catalog KPIs (catalog-page.tsx)
- Converted from HEAD to GET
- Consolidated from 4+1 sequential queries to 3 parallel queries

### Settings (settings-page.tsx)
- Removed `tab !== 'general'` guard on KPI grid — all 9 tabs now show KPIs
- Fixed 4 Settings KPIs from HEAD to GET

### Settings → Data Hub (data-hub-panel.tsx)
- Replaced hardcoded "Export CSV (500 rows)" with dynamic `Export CSV ({count} rows)`
- Fixed count queries from HEAD to GET with archived_at filter

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Commits deployed | 30+ |
| Files modified | 50+ |
| New files created | 5 (overview-dashboard.tsx, break_rules migration, shift_tags migration, security views migration, pay rates migration) |
| Database migrations | 4 |
| Critical bugs fixed | 8 (C48 payroll tabs, C49 date off-by-one, C50 break rules CRUD, C51 shift tags CRUD, C52 kit code, C53 maintenance vehicle, C54 service search crash, C55/C56 task mapping) |
| HEAD→GET KPI fixes | 40+ individual queries across 10 page files |
| New CRUD modules | 2 (break_rules, shift_tags — from static stubs to full Supabase-backed CRUD) |
| New dashboard | 1 (Reports Overview with 8 KPIs + 4 visualization cards) |
| Form field additions | 8 (markup/billing on supplies, assigned_to on keys/vehicles/incidents, status on incidents, vehicle on maintenance, date auto-fill) |
| Filter additions | 6 (timesheet status, task categories, service task counts, equipment IN_SERVICE condition) |
