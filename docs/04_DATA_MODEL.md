# Data model

This is the **implementation-ready** data model: it keeps the v7.0 “business tables” intact *and* adds the missing platform requirements (tenant isolation, auditability, constraints, indexes, and the missing objects for scheduling/timekeeping/quality).

## 1) Cross-cutting standards (apply to almost every table)

### Dual-key pattern
Every business entity has:
- `id UUID` (internal, immutable)
- `{entity}_code TEXT` (human-readable, unique)

Example codes:
- `CLI-1001` client
- `SIT-2050` site
- `SER-0001` service template
- `BID-000123` bid
- `PRP-000456` proposal

### Standard columns
Add these to *all* business tables (even if not shown in v7.0 snippet):

- `tenant_id UUID NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- soft delete:
  - `archived_at TIMESTAMPTZ NULL`
  - `archived_by UUID NULL`
  - `archive_reason TEXT NULL`
- optimistic locking:
  - `version_etag UUID NOT NULL DEFAULT gen_random_uuid()`

### Lookups table (no hardcoded enums)
Use database-driven lookups:

- `lookups(category, code, label, sort_order, is_active)`

Everything that looks like an enum should be a lookup:
- statuses
- stages
- building types
- floor types
- frequencies
- roles
- exception types

### Status transition rules
Enforce legal state changes with `status_transitions` (table) + a DB function/trigger.

### Audit events
Every state-changing action writes:
- `audit_events(entity_type, entity_code, action, before, after, actor_user_id, created_at)`

## 2) Tenancy and access model (minimum)

### Tenants
- `tenants(id, tenant_code, name, default_timezone, created_at, ...)`

### Memberships
- `tenant_memberships(tenant_id, user_id, role_code, created_at, ...)`

### Site scoping
- `user_site_assignments(tenant_id, user_id, site_id, role_at_site)`

This is how supervisors see only assigned sites.

## 3) Core v7.0 module tables (business columns)

These are the tables explicitly defined in v7.0 (business columns shown):

### Module A: CRM
- `clients(client_code, name, status, billing_address)`
- `sites(site_code, client_id, address, alarm_code, access_notes)`

**Add (missing but required):**
- `contacts` (post-conversion CRM contacts linked to clients/sites)
- `site_access_rules` (optional: door codes, access windows, etc.)

### Module B: Service DNA
- `tasks(task_code, name, production_rate_sqft_per_hour, category)`
- `services(service_code, name, description)`
- `service_tasks(service_id, task_id, frequency_default)`

**Add (to support real math):**
- `task_production_rates` (most-specific matching: task + floor type + building type)
- `task_units` (SQFT, EACH, ROOM, etc.) and rate normalization

### Module C: Sales
- `sales_bids(bid_code, client_id, service_id, total_sqft, status, bid_monthly_price, target_margin_percent)`
- `sales_bid_scopes(bid_id, area_name, tasks JSONB)`

**Expand (required for CleanFlow):**
- `sales_prospects` + `sales_prospect_contacts` (pre-conversion pipeline)
- `sales_opportunities` (pipeline stages, competitor tracking)
- `sales_bid_versions` (versioning + immutable sent snapshots)
- normalized measurement/task tables:
  - `sales_bid_sites`
  - `sales_bid_areas` (with grouping and fixtures)
  - `sales_bid_area_tasks`
  - `sales_bid_general_tasks`
- costing/pricing tables:
  - `sales_bid_schedule`
  - `sales_bid_labor_rates`
  - `sales_bid_burden_components`
  - `sales_bid_consumables`
  - `sales_bid_supply_allowances`
  - `sales_bid_equipment_plan_items`
  - `sales_bid_overhead`
  - `sales_bid_workload_results`
  - `sales_bid_pricing_results`
- proposal & email tables:
  - `sales_proposals`
  - `sales_proposal_pricing_options` (Good/Better/Best)
  - `sales_proposal_attachments`
  - `sales_proposal_marketing_inserts`
  - `sales_proposal_signatures`
  - `sales_proposal_sends`
  - `sales_email_events`
  - follow-up sequence tables
- conversion tables:
  - `sales_bid_conversions`
  - `sales_conversion_events`

### Module D: Operations
- `site_jobs(job_code, site_id, source_bid_id, billing_amount, frequency)`
- `work_tickets(ticket_code, job_id, scheduled_date, assigned_staff_id, status)`

**Expand (required):**
- `recurrence_rules` (RRULE-like)
- `ticket_assignments` (support teams)
- `ticket_status_history`
- `ticket_checklists` (instances) + `ticket_checklist_items` + `checklist_photos`

### Module E: Workforce & HR
- `staff(staff_code, full_name, role, is_subcontractor, pay_rate)`
- `staff_certifications(staff_id, cert_name, expiry_date, doc_url)`
- `attendance(staff_id, ticket_id, check_in, check_out)`

**Expand (required):**
- geofence/timekeeping/timesheets/exceptions tables (see `docs/12_TIMEKEEPING.md`)

### Module F: Assets
- `vehicles(vehicle_code, vin, mileage, status)`
- `vehicle_maintenance(vehicle_id, service_date, description, cost)`
- `keys(key_code, site_id)`
- `key_assignments(key_id, staff_id, assigned_at, returned_at)`

**Add:**
- `equipment` + `equipment_assignments`
- `vehicle_checkouts` (tie vehicles to tickets or shifts)

### Module G: Inventory
- `supplies(supply_code, name, sds_url, cost_per_unit)`
- `supply_assignments(site_id, supply_id, min_quantity)`

**Add:**
- `supply_kits` + `supply_kit_items`
- `purchase_orders` + `purchase_order_items` (later phase)

### Module H: Safety
- surfaced via `supplies.sds_url`
- training/certification tracking via `staff_certifications`

## 4) Table catalog
The full table list with purposes is in `docs/appendices/A_TABLE_CATALOG.md`.

## 5) Naming conventions
- tables: `snake_case`, plural where it reads naturally (`work_tickets`)
- UUID keys: `{thing}_id`
- business keys: `{thing}_code`
- statuses/stages: lookup `code` is **SCREAMING_SNAKE_CASE**
