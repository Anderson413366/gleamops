# Supabase Architecture — Deep Dive

> Everything about the database, auth, storage, and how they connect to the app.

---

## Overview

GleamOps uses Supabase as its entire backend:

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | 220+ tables, RLS, triggers, functions, views |
| **Auth** | Email/password + OAuth, JWT with tenant_id + role |
| **Storage** | File uploads (selfies, PDFs, photos) |
| **Realtime** | Live dashboard updates |
| **PostgREST** | Auto-generated REST API from schema |

---

## Multi-Tenant Architecture

Every business table has a `tenant_id UUID NOT NULL` column. Row-Level Security (RLS) policies on every table ensure complete tenant isolation.

```
User logs in
  → Supabase Auth issues JWT
  → custom_access_token_hook fires:
      Reads user_roles table → injects tenant_id + role into JWT claims
  → Every Supabase query goes through PostgREST
  → RLS policy on each table checks:
      tenant_id = current_tenant_id()
  → User can ONLY read/write their own company's data
```

### Key SQL Function: `current_tenant_id()`

```sql
-- Reads tenant_id from the JWT claims injected by the auth hook
CREATE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
$$ LANGUAGE sql STABLE;
```

### Test Tenants

| Tenant | Code | Name | Purpose |
|--------|------|------|---------|
| A | TNT-0001 | Anderson Cleaning Services | Primary test tenant |
| B | TNT-0002 | Other Cleaning Co | Isolation testing |

New auth.users are auto-assigned OWNER_ADMIN on TNT-0001.

---

## Complete Database Tree (220+ tables, organized by domain)

```
PostgreSQL (Supabase)
│
├── FOUNDATION
│   ├── tenants                          Multi-tenant root
│   ├── tenant_memberships               User ↔ tenant links
│   ├── tenant_org_profiles              Company profile settings
│   ├── organization_settings            Org-level settings
│   ├── lookups                          Configurable dropdown values
│   ├── system_sequences                 Auto-numbering sequences (next_code)
│   ├── status_transitions               Legal status change definitions
│   ├── feature_flags                    18 DB domain readiness seeds
│   ├── tags                             Tagging system
│   └── tag_assignments                  Tag ↔ entity links
│
├── AUTH & USERS
│   ├── user_roles                       User ↔ role assignments (RBAC)
│   ├── roles                            Role definitions
│   ├── permissions                      Permission definitions
│   ├── role_permissions                 Role ↔ permission links
│   ├── user_profiles                    User display preferences
│   ├── user_security_profiles           Security settings
│   ├── user_sessions                    Active session tracking
│   ├── user_access_grants               Temporary access grants
│   ├── user_client_access               User ↔ client access scoping
│   ├── user_site_assignments            User ↔ site access scoping
│   └── user_team_memberships            User ↔ team links
│
├── CRM (Clients, Sites, Contacts)
│   ├── clients                          Client companies
│   ├── sites                            Physical locations (→ clients)
│   ├── site_types                       Site type definitions (Office, Medical...)
│   ├── site_type_tasks                  Default tasks per site type
│   ├── site_areas                       Areas within a site (floors, wings)
│   ├── area_fixtures                    Fixtures per area (sinks, toilets)
│   ├── site_access_details              Access instructions (decomposed)
│   ├── site_compliance                  Compliance data (decomposed)
│   ├── site_pin_codes                   PIN access codes
│   ├── site_books                       Site-specific docs/manuals
│   ├── site_book_checklist_items        Checklist items in site books
│   ├── contacts                         People at client companies
│   ├── location_contacts                Location-specific contact links
│   ├── location_access                  Location access instructions
│   ├── contract_locations               Contract ↔ location links
│   ├── contract_service_lines           Contract service line items
│   ├── contract_slas                    Service level agreements
│   ├── contracts                        Active contracts
│   ├── customer_feedback                Customer satisfaction feedback
│   └── customer_portal_sessions         Customer portal access sessions
│
├── SALES PIPELINE
│   ├── sales_prospects                  Potential clients
│   ├── sales_prospect_contacts          Prospect contact people
│   ├── sales_opportunities              Qualified opportunities
│   ├── sales_bids                       Price quotes (CleanFlow)
│   ├── sales_bid_versions               Bid version history
│   ├── sales_bid_sites                  Sites included in a bid
│   ├── sales_bid_areas                  Areas within bid sites
│   ├── sales_bid_area_tasks             Tasks per bid area
│   ├── sales_bid_general_tasks          General tasks on a bid
│   ├── sales_bid_labor_rates            Labor rate inputs
│   ├── sales_bid_burden                 Burden/overhead rates
│   ├── sales_bid_consumables            Consumable cost inputs
│   ├── sales_bid_overhead               Overhead cost inputs
│   ├── sales_bid_supply_allowances      Supply cost allowances
│   ├── sales_bid_supply_kits            Supply kits on a bid
│   ├── sales_bid_schedule               Bid scheduling details
│   ├── sales_bid_pricing_strategy       Pricing strategy selections
│   ├── sales_bid_pricing_results        Calculated pricing results
│   ├── sales_bid_workload_results       Calculated workload results
│   ├── sales_bid_equipment_plan_items   Equipment plan for bid
│   ├── sales_bid_conversions            Bid → contract conversion records
│   ├── sales_conversion_events          Conversion event log
│   ├── sales_proposals                  Formal proposal documents
│   ├── sales_proposal_sends             Email send records
│   ├── sales_proposal_signatures        Signature capture data
│   ├── sales_proposal_attachments       Proposal file attachments
│   ├── sales_proposal_pricing_options   Pricing option variants
│   ├── sales_proposal_marketing_inserts Marketing insert selections
│   ├── sales_email_events               Email tracking (open, click, bounce)
│   ├── sales_followup_templates         Follow-up email templates
│   ├── sales_followup_sequences         Automated follow-up sequences
│   ├── sales_followup_sends             Follow-up send records
│   ├── sales_production_rates           Production rate library
│   └── sales_marketing_inserts          Marketing insert content library
│
├── SERVICES & CATALOG
│   ├── services                         Service type definitions
│   ├── service_categories               Service groupings
│   ├── service_tasks                    Service ↔ task links
│   ├── tasks                            Cleaning task definitions
│   ├── task_categories                  Task groupings
│   └── task_production_rates            Production rates per task
│
├── OPERATIONS (Jobs, Tickets, Schedules)
│   ├── site_jobs                        Service plans (recurring contracts)
│   ├── site_job_financials              Financial data per job (decomposed)
│   ├── job_schedule_rules               Recurrence rules for jobs
│   ├── job_tasks                        Tasks assigned to a job
│   ├── job_staff_assignments            Staff assigned to a job
│   ├── job_visits                       Completed job visits
│   ├── job_logs                         Job activity log
│   ├── job_status_events                Job status change events
│   ├── work_tickets                     Individual scheduled work instances
│   ├── ticket_assignments               Staff ↔ ticket links
│   ├── ticket_checklists                Checklists on tickets
│   ├── ticket_checklist_items           Individual checklist items
│   ├── ticket_photos                    Photos attached to tickets
│   ├── ticket_supply_usage              Supplies used on a ticket
│   ├── ticket_asset_checkouts           Equipment checked out for ticket
│   ├── complaint_records                Customer complaints
│   ├── periodic_tasks                   Recurring tasks (non-schedule)
│   ├── field_reports                    Field inspection reports
│   └── data_hygiene_issues              Automated quality scan results
│
├── SCHEDULING
│   ├── schedule_periods                 Week/date-range scheduling blocks
│   ├── schedule_templates               Schedule template definitions
│   ├── schedule_conflicts               Detected scheduling conflicts
│   ├── tenant_schedule_settings         Tenant scheduling preferences
│   ├── recurrence_rules                 Recurrence pattern definitions
│   ├── staff_availability_rules         Staff availability patterns
│   ├── shift_trade_requests             Shift swap requests
│   ├── attendance_policies              Attendance policy definitions
│   ├── holiday_calendar                 Company holidays
│   ├── on_call_pool                     On-call staff pool
│   ├── callout_events                   Callout/absence events
│   └── coverage_offers                  Coverage offer records
│
├── ROUTES
│   ├── routes                           Active route instances
│   ├── route_stops                      Stops on a route
│   ├── route_templates                  Route template definitions
│   ├── route_template_stops             Template stop definitions
│   ├── route_template_tasks             Tasks per template stop
│   ├── route_stop_tasks                 Tasks per active route stop
│   └── travel_segments                  Travel tracking between stops
│
├── TIMEKEEPING
│   ├── time_entries                     Clock in/out records
│   ├── time_events                      Granular time events (CHECK_IN, CHECK_OUT, BREAK_*)
│   ├── time_punches                     Raw punch records
│   ├── time_exceptions                  Exception/override records
│   ├── time_policies                    Time tracking policies
│   ├── timesheets                       Aggregated timesheet records
│   ├── timesheet_approvals              Timesheet approval workflow
│   ├── pay_periods                      Pay period definitions
│   └── staff_attendance                 Attendance records
│
├── WORKFORCE (Staff, HR)
│   ├── staff                            Staff members
│   ├── staff_positions                  Position assignments
│   ├── staff_eligible_positions         Position eligibility
│   ├── staff_certifications             Certification records
│   ├── staff_payroll                    Payroll data
│   ├── pay_rate_history                 Pay rate change history
│   ├── hr_badges                        Badge definitions
│   ├── hr_staff_badges                  Badge ↔ staff awards
│   ├── hr_goals                         Performance goals
│   ├── hr_performance_reviews           Performance review records
│   ├── hr_pto_requests                  PTO request records
│   ├── hr_staff_documents               Staff document attachments
│   ├── subcontractors                   Subcontractor companies
│   ├── subcontractor_jobs               Subcontractor job assignments
│   ├── microfiber_wash_log              Microfiber tracking
│   └── earning_codes                    Payroll earning code definitions
│
├── PAYROLL EXPORT
│   ├── payroll_runs                     Payroll run records
│   ├── payroll_line_items               Payroll line items
│   ├── payroll_export_runs              Export batch records
│   ├── payroll_export_items             Export line items
│   ├── payroll_export_mappings          Export field mappings
│   └── payroll_export_mapping_fields    Mapping field definitions
│
├── INVENTORY & SUPPLIES
│   ├── supply_catalog                   Supply item definitions
│   ├── supply_kits                      Pre-built supply kits
│   ├── supply_kit_items                 Items in a supply kit
│   ├── site_supplies                    Supplies assigned to sites
│   ├── site_supply_costs                Supply cost tracking per site
│   ├── supply_orders                    Supply purchase orders
│   ├── supply_order_items               Items in an order
│   ├── supply_order_deliveries          Delivery records
│   ├── supply_requests                  Internal supply requests
│   ├── supply_request_lines             Request line items
│   ├── inventory_counts                 Physical count events
│   ├── inventory_count_details          Count line items
│   ├── inventory_forms                  Inventory form submissions
│   ├── inventory_locations              Warehouse/storage locations
│   ├── stock_levels                     Current stock quantities
│   ├── stock_movements                  Stock in/out movements
│   ├── items                            Generic item master
│   ├── procurement_approval_workflows   Approval workflow definitions
│   ├── procurement_approval_steps       Workflow step definitions
│   └── procurement_approval_actions     Approval action records
│
├── EQUIPMENT & ASSETS
│   ├── equipment                        Equipment inventory
│   ├── equipment_assignments            Equipment ↔ staff/site links
│   ├── asset_maintenance_logs           Maintenance history
│   ├── asset_transfers                  Equipment transfer records
│   ├── key_inventory                    Physical key inventory
│   ├── key_event_log                    Key checkout/return log
│   ├── vehicles                         Vehicle fleet
│   ├── vehicle_checkouts                Vehicle checkout records
│   ├── vehicle_dvir_logs                Daily Vehicle Inspection Reports
│   ├── vehicle_fuel_logs                Fuel purchase records
│   ├── vehicle_maintenance              Maintenance schedule/records
│   └── nfc_tags                         NFC tag registry
│
├── SAFETY & COMPLIANCE
│   ├── training_courses                 Training course definitions
│   ├── training_completions             Training completion records
│   ├── safety_documents                 Safety document library
│   ├── issues                           Safety issues
│   ├── issue_comments                   Issue discussion threads
│   ├── issue_work_logs                  Issue resolution work log
│   ├── geofences                        Geographic boundary definitions
│   ├── inspection_templates             Inspection template definitions
│   ├── inspection_template_items        Template item definitions
│   ├── inspections                      Completed inspections
│   └── inspection_issues                Issues found in inspections
│
├── CHECKLISTS & FORMS
│   ├── checklist_templates              Template definitions
│   ├── checklist_template_sections      Template section groupings
│   ├── checklist_template_items         Template item definitions
│   └── processed_form_responses         Submitted form response data
│
├── MESSAGING & NOTIFICATIONS
│   ├── conversations                    Conversation threads
│   ├── conversation_participants        Thread participants
│   ├── messages                         Individual messages
│   ├── message_threads                  Legacy message threads
│   ├── message_thread_members           Legacy thread members
│   ├── notifications                    In-app notifications
│   └── notification_preferences         User notification settings
│
├── FINANCE (read-only integration)
│   ├── invoices                         Invoice records
│   ├── invoice_line_items               Invoice line items
│   ├── invoice_jobs                     Invoice ↔ job links
│   ├── payments                         Payment records
│   ├── purchase_orders                  Purchase orders
│   ├── purchase_order_lines             PO line items
│   ├── quote_line_items                 Quote line items
│   └── quote_workload_inputs            Quote workload data
│
├── FILES & INTEGRATIONS
│   ├── files                            File metadata registry
│   ├── file_links                       File ↔ entity links
│   ├── integration_connections          External integration configs
│   ├── integration_sync_logs            Sync history
│   ├── external_id_map                  External ID mappings
│   ├── webhooks                         Webhook endpoint configs
│   └── custom_fields / custom_field_values / custom_field_options
│
├── AUDIT & SYSTEM
│   ├── audit_events                     Audit trail records
│   ├── timeline_events                  Activity timeline
│   ├── alerts                           System alerts
│   └── real_estate_properties           Property records
│
└── VIEWS (pre-built queries)
    ├── v_sites_full                     Site + access + compliance (joined)
    ├── v_active_sites                   Active sites only
    ├── v_staff_roster                   Active staff + positions
    ├── v_upcoming_tickets               Next 7 days' tickets
    ├── v_site_supply_assignments        Supply assignments per site
    ├── v_subcontractor_job_assignments  Subcontractor job links
    ├── v_clients_contract_age           Client contract age analytics
    ├── v_job_profitability              Job profit metrics
    ├── v_jobs_service_window            Job service time windows
    ├── v_load_sheet                     Route load sheet data
    ├── v_night_bridge                   Night bridge handoff data
    ├── audit_log                        Formatted audit trail
    ├── customers / customer_contacts    CRM compatibility views
    ├── locations / leads / opportunities Pipeline compatibility views
    ├── employees / users                Workforce compatibility views
    ├── assets / inventory_items         Asset compatibility views
    ├── schedules / work_orders          Schedule compatibility views
    ├── jobs / job_sites                 Operations compatibility views
    └── quotes / organizations           Finance compatibility views
```

---

## Table Design Patterns

### Standard Columns

Every business table includes these columns:

```sql
CREATE TABLE example (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  example_code    TEXT UNIQUE,          -- human-readable ID
  -- ... business columns ...
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_at     TIMESTAMPTZ,          -- NULL means active
  archived_by     UUID REFERENCES auth.users(id),
  archive_reason  TEXT,
  version_etag    UUID DEFAULT gen_random_uuid() NOT NULL
);
```

### Standard Triggers

Every business table gets these three triggers:

```sql
-- 1. Auto-update timestamp
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON example
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Auto-roll optimistic lock
CREATE TRIGGER set_version_etag
  BEFORE INSERT OR UPDATE ON example
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();

-- 3. Prevent hard deletes
CREATE TRIGGER prevent_hard_delete
  BEFORE DELETE ON example
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
```

### Dual-Key Pattern

Every entity has two identifiers:
- `id UUID` — Internal, never shown to users, used in foreign keys
- `*_code TEXT` — Human-readable, unique, shown in the UI (CLI-1001, STF-1042, etc.)

Codes are generated by `next_code(tenant_id, prefix, padding)`:

```sql
-- next_code('tenant-uuid', 'CLI', 4) → 'CLI-1001'
-- next_code('tenant-uuid', 'BID', 6) → 'BID-000001'
```

---

## Key SQL Functions

### Auth & Roles

| Function | Signature | Purpose |
|----------|-----------|---------|
| `current_tenant_id()` | `→ UUID` | Get tenant from JWT |
| `has_role(user_id, role_code)` | `→ BOOLEAN` | Check single role |
| `has_any_role(user_id, roles[])` | `→ BOOLEAN` | Check multiple roles |
| `user_can_access_site(user_id, site_id)` | `→ BOOLEAN` | Site-level access check |

### Entity Management

| Function | Signature | Purpose |
|----------|-----------|---------|
| `next_code(tenant_id, prefix, padding)` | `→ TEXT` | Generate entity code |
| `validate_status_transition(tenant_id, entity, from, to)` | `→ BOOLEAN` | Check if transition is legal |

### Trigger Functions

| Function | Type | Purpose |
|----------|------|---------|
| `set_updated_at()` | BEFORE UPDATE | Sets `updated_at = now()` |
| `set_version_etag()` | BEFORE INSERT/UPDATE | Rolls `version_etag` |
| `prevent_hard_delete()` | BEFORE DELETE | Raises exception |
| `enforce_status_transition()` | BEFORE UPDATE | Blocks invalid status changes (6 tables) |
| `cascade_archive()` | AFTER UPDATE | Propagates soft-delete to children |
| `auto_archive_on_terminal_status()` | AFTER UPDATE | Archives on CANCELED/TERMINATED |
| `normalize_name_fields()` | BEFORE INSERT/UPDATE | Trims whitespace on name columns |
| `auto_set_tenant_id()` | BEFORE INSERT | Sets tenant_id from JWT if not provided |

### RPCs (Remote Procedure Calls)

| Function | Purpose |
|----------|---------|
| `run_data_hygiene_scan(p_tenant_id)` | Scan for data quality issues |
| `fn_generate_tickets_for_period(p_period_id)` | Generate work tickets from schedule rules |

---

## Status State Machine

6 entity types have database-enforced status transitions via `enforce_status_transition()`:

### Client Status
```
PROSPECT → ACTIVE → ON_HOLD → INACTIVE → CANCELED
                   ↑          ↓
                   └──────────┘ (reactivate)
```

### Staff Status
```
DRAFT → ACTIVE → ON_LEAVE → INACTIVE → TERMINATED
               ↑          ↓
               └──────────┘ (return from leave)
```

### Work Ticket Status
```
SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED
                        ↓
                     CANCELED
```

### Service Plan (Job) Status
```
DRAFT → ACTIVE → ON_HOLD → COMPLETED
                          → CANCELED
```

### Schedule Period Status
```
DRAFT → PUBLISHED → LOCKED
```

### Proposal Status
```
DRAFT → SENT → VIEWED → SIGNED
                       → EXPIRED
                       → REJECTED
```

---

## Cascade Archive

When a parent entity is archived, the `cascade_archive()` trigger propagates to children:

```
Client archived
  → Sites archived
    → Service Plans (site_jobs) archived
      → Work Tickets archived
        → Ticket Assignments archived
```

---

## Operational Views

Pre-built views for common queries:

| View | Purpose | Key Columns |
|------|---------|-------------|
| `v_sites_full` | Site + access details + compliance | All site columns + joined sub-tables |
| `v_active_sites` | Active sites only | Filters `archived_at IS NULL AND status = 'ACTIVE'` |
| `v_staff_roster` | Active staff + positions | Staff columns + position type name + color |
| `v_upcoming_tickets` | Next 7 days' tickets | ticket_code, site, date, time, status, staff |

---

## Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `time-verification-selfies` | Clock in/out selfie evidence | Private (service role upload) |

PDFs, photos, and attachments use additional buckets as needed.

---

## Migration History (134 files, 19,682 lines)

| Range | What |
|-------|------|
| 00001–00010 | Foundation: tables, helpers, triggers, RLS, seeds, auth hook, audit |
| 00011–00018 | Business tables: CRM, services, bids, proposals, workforce |
| 00019–00049 | Auth fixes, inventory, assets, search, storage, follow-ups |
| 00050–00084 | HR, fleet, messaging, schedule, safety, geofences, warehouse |
| 00085–00111 | Complaints, routes, field reports, night bridge, portal, shifts, work orders |
| 00112–00116 | Scheduling parity: positions, templates, period types |
| 00117–00130 | Data Quality Sprints 1–14 |
| 20260302* | Empty Tables Audit |

### Tables Added in Data Quality Sprints

- `site_access_details` — Decomposed from sites table
- `site_compliance` — Compliance data extracted from sites
- `data_hygiene_issues` — Automated quality scan results
- `site_job_financials` — Financial data extracted from site_jobs
- `feature_flags` — 18 DB domain readiness seeds

### Key Schema Changes in Data Quality Sprints

- `staff.staff_status` → `staff.status` (aligned with other entities)
- `staff.staff_type` → `staff_type_deprecated` (use `employment_type`)
- `lookups.tenant_id` now `NOT NULL`
- `site_jobs.start_date` now `NOT NULL DEFAULT CURRENT_DATE`
- 10 composite performance indexes on hot query paths
- `normalized_name` generated columns on clients, sites, staff

---

## RLS Policy Pattern

Every table follows this pattern:

```sql
-- SELECT: users can only see their tenant's data
CREATE POLICY "tenant_select" ON example
  FOR SELECT USING (tenant_id = current_tenant_id());

-- INSERT: users can only insert into their tenant
CREATE POLICY "tenant_insert" ON example
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE: users can only update their tenant's data
CREATE POLICY "tenant_update" ON example
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- DELETE: blocked by prevent_hard_delete trigger
-- (RLS allows it, but the trigger raises an exception)
```

Some tables add role-based restrictions:

```sql
-- Only managers+ can update staff records
CREATE POLICY "staff_update_managers" ON staff
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER'])
  );
```

---

## Connecting From the App

### Browser Client (RLS-scoped)

```tsx
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = getSupabaseBrowserClient();
const { data } = await supabase
  .from('clients')
  .select('id, client_code, name, status')
  .is('archived_at', null)
  .order('name');
// RLS automatically filters by current user's tenant
```

### Server Client (API routes, RLS-scoped)

```tsx
import { getSupabaseServerClient } from '@/lib/supabase/server';

const supabase = getSupabaseServerClient();
// Same RLS filtering as browser client
```

### Admin Client (bypasses RLS)

```tsx
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const supabase = getSupabaseAdminClient();
// Use for: audit logging, background jobs, cross-tenant operations
// NEVER use for user-facing queries
```
