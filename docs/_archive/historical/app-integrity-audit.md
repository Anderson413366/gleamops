# App Integrity Audit — Route Inventory

> Full route inventory with pass/fail status. Generated 2026-03-01.

## Summary

- **Total page.tsx files:** 76
- **Dashboard modules:** 20
- **Detail pages:** 18 dynamic routes
- **Public pages:** 3
- **Auth pages:** 1

## Route Status Legend

- PASS: Route renders correctly, data loads, navigation works
- FIXED: Had an issue that was resolved in this sprint
- ALIAS: Re-exports from another route (back-compat)

---

## Auth Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/login` | PASS | Email/password login |

## Public Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/public/forms/[token]` | PASS | Staff self-service forms |
| `/public/proposals/[id]` | PASS | Public proposal view + signature |
| `/public/work-orders/[id]` | PASS | Public work order view |

## Dashboard Routes

### Home (`/home`)

| Route | Status | Notes |
|-------|--------|-------|
| `/home` | PASS | Owner dashboard with KPI widgets + command center |

### Schedule (`/schedule`)

| Route | Status | Notes |
|-------|--------|-------|
| `/schedule` | PASS | Tabbed: Recurring, Work Orders, Calendar, Planning, Boards |

### Jobs (`/jobs`)

| Route | Status | Notes |
|-------|--------|-------|
| `/jobs` | PASS | Tabbed: Service Plans, Job Log, Inspections, Time, Routes, Checklists, Forms |

### Clients (`/clients`) — Canonical

| Route | Status | Notes |
|-------|--------|-------|
| `/clients` | PASS | Tabbed: Clients, Sites, Contacts, Requests, Partners |
| `/clients/[id]` | PASS | Client detail page |
| `/clients/sites/[id]` | PASS | Site detail page |
| `/clients/contacts/[code]` | PASS | Contact detail page |

### CRM (`/crm`) — Legacy

| Route | Status | Notes |
|-------|--------|-------|
| `/crm` | PASS | Legacy back-compat, redirects to /clients |
| `/crm/clients/[id]` | PASS | Client detail (legacy route) |
| `/crm/sites/[id]` | PASS | Site detail (legacy route) |
| `/crm/contacts/[code]` | PASS | Contact detail (legacy route) |

### Pipeline (`/pipeline`)

| Route | Status | Notes |
|-------|--------|-------|
| `/pipeline` | PASS | Tabbed: Prospects, Opportunities, Bids, Proposals |
| `/pipeline/prospects/[id]` | PASS | Prospect detail |
| `/pipeline/opportunities/[id]` | PASS | Opportunity detail |
| `/pipeline/bids/[id]` | PASS | Bid detail |
| `/pipeline/proposals/[id]` | PASS | Proposal detail |

### Catalog (`/catalog`)

| Route | Status | Notes |
|-------|--------|-------|
| `/catalog` | PASS | Tabbed: Tasks, Services, Mapping, Scope Library |

### Team (`/team`) — Canonical

| Route | Status | Notes |
|-------|--------|-------|
| `/team` | FIXED | Positions KPI was querying wrong table (position_types → staff_positions) |
| `/team/staff/[code]` | PASS | Staff detail page |
| `/team/employees/[code]` | PASS | Employee detail (alias for staff) |
| `/team/positions/[code]` | FIXED | NEW — Position detail page created this sprint |

### Workforce (`/workforce`) — Legacy

| Route | Status | Notes |
|-------|--------|-------|
| `/workforce` | PASS | Legacy back-compat, hosts field-reports tab |
| `/workforce/staff/[code]` | PASS | Staff detail (legacy route) |
| `/workforce/positions/[code]` | FIXED | NEW — Route alias to team/positions/[code] |
| `/workforce/field-reports/[code]` | PASS | Field report detail |

### Inventory (`/inventory`)

| Route | Status | Notes |
|-------|--------|-------|
| `/inventory` | PASS | Tabbed: Supplies, Kits, Site Assignments, Counts, Orders, Vendors |
| `/inventory/supplies/[id]` | PASS | Supply detail |
| `/inventory/counts/[id]` | PASS | Inventory count detail |

### Equipment (`/equipment`)

| Route | Status | Notes |
|-------|--------|-------|
| `/equipment` | PASS | Tabbed: Equipment, Assignments, Keys, Vehicles, Maintenance |

### Assets (`/assets`) — Legacy Alias

| Route | Status | Notes |
|-------|--------|-------|
| `/assets` | ALIAS | Alias for /equipment |
| `/assets/equipment/[code]` | PASS | Equipment detail |
| `/assets/keys/[id]` | PASS | Key detail |
| `/assets/vehicles/[id]` | PASS | Vehicle detail |

### Safety (`/safety`)

| Route | Status | Notes |
|-------|--------|-------|
| `/safety` | PASS | Tabbed: Certifications, Training, Incidents, Calendar |

### Reports (`/reports`)

| Route | Status | Notes |
|-------|--------|-------|
| `/reports` | PASS | Tabbed: Ops, Sales, Financial, Quality, Workforce, Inventory |

### Settings (`/settings`)

| Route | Status | Notes |
|-------|--------|-------|
| `/settings` | PASS | Tabbed: General, Lookups, Geofences, Rules, Data Hub, Sequences, Import |

### Shifts & Time (`/shifts-time`)

| Route | Status | Notes |
|-------|--------|-------|
| `/shifts-time` | PASS | Role-gated: Shifts, Timesheets, Clock In/Out |

### Operations (`/operations`) — Legacy

| Route | Status | Notes |
|-------|--------|-------|
| `/operations` | PASS | Hosts: complaints, periodic, task-catalog, alerts, night-bridge |
| `/operations/jobs/[id]` | PASS | Job detail |
| `/operations/tickets/[id]` | PASS | Ticket detail |
| `/operations/complaints/[code]` | PASS | Complaint detail |
| `/operations/periodic/[code]` | PASS | Periodic task detail |
| `/operations/task-catalog/[id]` | PASS | Task catalog detail |

### Admin (`/admin`)

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | PASS | Settings admin, position types, portal settings |
| `/admin/services/tasks/[id]` | PASS | Task detail (admin) |

### Vendors (`/vendors`)

| Route | Status | Notes |
|-------|--------|-------|
| `/vendors` | PASS | Subcontractors, supply vendors, vendor directory |
| `/vendors/subcontractors/[code]` | PASS | Subcontractor detail |
| `/vendors/supply-vendors/[slug]` | PASS | Supply vendor detail |

### Services (`/services`) — Legacy Alias

| Route | Status | Notes |
|-------|--------|-------|
| `/services` | ALIAS | Alias for /catalog |
| `/services/tasks/[id]` | PASS | Task detail (alias) |

---

## Issues Fixed This Sprint

1. **Positions KPI bug** — `team-page.tsx` queried non-existent `position_types` table
2. **Staff count = 0** — `positions-table.tsx` used fuzzy string matching instead of `staff_eligible_positions`
3. **No position detail page** — Rows opened SlideOver instead of navigating to detail
4. **No route for `/team/positions/[code]`** — Created new detail page
5. **Terminology: "Specialist"** — Changed to "Staff" in generic UI labels
