# Appendix A: Table Catalog

Complete inventory of all tables and views in the GleamOps schema, derived from 111 SQL migration files (`supabase/migrations/`).

**Total: 241 tables + 7 views + 3 materialized views = 251 objects**

Legend: **Active** = queried in app code (`supabase.from()`). **Dormant** = exists in migrations but not yet consumed by UI.

---

## Platform / System (18 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `tenants` | Multi-tenant root; every business table references this | 00001 | Active |
| `tenant_memberships` | User-to-tenant binding with role_code | 00001 | Active |
| `tenant_org_profiles` | Organization display/branding metadata | 00066 | Dormant |
| `lookups` | Shared lookup values (categories, codes, labels) | 00001 | Active |
| `status_transitions` | Allowed entity status transitions (state machine) | 00001 | Active |
| `system_sequences` | Auto-incrementing entity code sequences | 00001 | Active |
| `audit_events` | Audit trail for entity CRUD actions | 00001 | Active |
| `audit_log` | Enterprise-format audit log | 00065 | Dormant |
| `files` | Storage metadata for uploaded files | 00001 | Active |
| `file_links` | Polymorphic file-to-entity associations | 00066 | Dormant |
| `notifications` | User notifications (title, body, link, read_at) | 00001 | Active |
| `notification_preferences` | Per-user notification channel preferences | 00066 | Dormant |
| `tags` | Freeform tagging system | 00066 | Dormant |
| `tag_assignments` | Polymorphic tag-to-entity assignments | 00066 | Dormant |
| `custom_fields` | Tenant-configurable custom fields per entity type | 00066 | Dormant |
| `custom_field_options` | Dropdown options for custom select fields | 00066 | Dormant |
| `custom_field_values` | Stored custom field values per entity | 00066 | Dormant |
| `timeline_events` | Polymorphic activity stream for CRM entities | 00011 | Active |

## RBAC / Auth (12 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `users` | Enterprise user accounts (email, MFA, type) | 00065 | Dormant |
| `user_sessions` | Session tracking (IP, user agent, expiry) | 00065 | Dormant |
| `user_profiles` | Display name, avatar, phone, preferences | 00033 | Active |
| `user_roles` | User-to-role assignments | 00065 | Dormant |
| `user_site_assignments` | User access scoped to specific sites | 00005 | Active |
| `user_client_access` | User access scoped to specific clients | 00033 | Active |
| `user_team_memberships` | Team grouping for users | 00045 | Active |
| `user_access_grants` | Granular entity-level permission grants | 00045 | Dormant |
| `user_security_profiles` | Security profile metadata | 00066 | Dormant |
| `roles` | Role definitions (system + custom) | 00065 | Dormant |
| `permissions` | Permission codes by module | 00065 | Dormant |
| `role_permissions` | Role-to-permission mappings with access levels | 00065 | Dormant |

## CRM (5 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `clients` | Customer companies | 00011 | Active |
| `sites` | Service locations belonging to clients | 00011 | Active |
| `contacts` | People associated with clients and/or sites | 00011 | Active |
| `site_areas` | Named areas within a site (rooms, floors) | 00051 | Active |
| `site_types` | Site classification types | 00051 | Active |

## Service DNA (7 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `tasks` | Cleaning task definitions (vacuum, mop, etc.) | 00012 | Active |
| `task_production_rates` | Per-task production rates by floor/building type | 00012 | Active |
| `task_categories` | Task category groupings | 00065 | Dormant |
| `services` | Service bundles (daily clean, deep clean) | 00012 | Active |
| `service_tasks` | Tasks included in a service with frequency/priority | 00012 | Active |
| `service_categories` | Service category groupings | 00065 | Dormant |
| `site_type_tasks` | Default tasks per site type | 00051 | Active |

## Sales / Pipeline (33 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `sales_prospects` | Sales leads / prospect companies | 00013 | Active |
| `sales_prospect_contacts` | Contacts on prospects | 00013 | Active |
| `sales_opportunities` | Qualified opportunities with stage tracking | 00013 | Active |
| `sales_bids` | Bid headers (client, status, pricing summary) | 00013 | Active |
| `sales_bid_versions` | Bid snapshots for version control | 00013 | Active |
| `sales_bid_sites` | Multi-site info per bid version | 00039 | Active |
| `sales_bid_areas` | Area breakdowns per bid version | 00013 | Active |
| `sales_bid_area_tasks` | Tasks assigned per area in a bid | 00013 | Active |
| `sales_bid_general_tasks` | Non-area tasks (quality, setup, travel) | 00039 | Active |
| `sales_bid_schedule` | Scheduling parameters per bid | 00013 | Active |
| `sales_bid_labor_rates` | Labor rates per bid version | 00013 | Active |
| `sales_bid_burden` | Burden/overhead percentages per bid | 00013 | Active |
| `sales_bid_consumables` | Consumable cost inputs per bid | 00039 | Active |
| `sales_bid_supply_allowances` | Supply cost allowances per bid | 00039 | Active |
| `sales_bid_supply_kits` | Supply kit selections per bid | 00039 | Active |
| `sales_bid_equipment_plan_items` | Equipment depreciation planning per bid | 00039 | Active |
| `sales_bid_overhead` | Overhead cost breakdown per bid | 00039 | Active |
| `sales_bid_workload_results` | Computed workload results per bid | 00013 | Active |
| `sales_bid_pricing_results` | Computed pricing results per bid | 00013 | Active |
| `sales_bid_pricing_strategy` | Pricing method/strategy config per bid | 00039 | Active |
| `sales_proposals` | Generated proposals from bids | 00014 | Active |
| `sales_proposal_pricing_options` | Good/Better/Best pricing tiers | 00014 | Active |
| `sales_proposal_attachments` | File attachments on proposals | 00039 | Active |
| `sales_proposal_marketing_inserts` | Marketing insert selections per proposal | 00039 | Active |
| `sales_proposal_signatures` | E-signature capture (drawn/typed/uploaded) | 00039 | Active |
| `sales_proposal_sends` | Email send tracking per proposal | 00014 | Active |
| `sales_email_events` | SendGrid webhook events (open, click, bounce) | 00014 | Active |
| `sales_followup_templates` | Follow-up email templates | 00039 | Active |
| `sales_followup_sequences` | Active follow-up sequences per proposal | 00014 | Active |
| `sales_followup_sends` | Individual follow-up email sends | 00014 | Active |
| `sales_marketing_inserts` | Reusable marketing insert library | 00039 | Active |
| `sales_production_rates` | Sales-specific production rate overrides | 00039 | Active |
| `sales_bid_conversions` | Bid-to-contract conversion records | 00016 | Active |
| `sales_conversion_events` | Step-by-step conversion audit trail | 00016 | Active |

## Operations (19 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `site_jobs` | Recurring job contracts per site | 00016 | Active |
| `recurrence_rules` | Recurrence patterns (days, times, exceptions) | 00016 | Active |
| `work_tickets` | Individual scheduled service visits | 00016 | Active |
| `ticket_assignments` | Staff-to-ticket assignments | 00016 | Active |
| `job_status_events` | Job status change history | 00065 | Dormant |
| `job_visits` | Planned/actual visit windows | 00065 | Dormant |
| `job_tasks` | Tasks assigned to a specific job | 00031 | Active |
| `job_staff_assignments` | Permanent staff-to-job assignments | 00034 | Active |
| `job_logs` | Operational logs per job | 00031 | Active |
| `job_schedule_rules` | Schedule rules per job | 00051 | Active |
| `checklist_templates` | Reusable checklist templates | 00017 | Active |
| `checklist_template_items` | Items within a checklist template | 00017 | Active |
| `checklist_template_sections` | Section groupings within templates | 00065 | Active |
| `ticket_checklists` | Checklist instances per ticket | 00017 | Active |
| `ticket_checklist_items` | Checklist item completion tracking | 00017 | Active |
| `ticket_photos` | Photos attached to tickets | 00017 | Active |
| `complaint_records` | Customer complaint tracking | 00093 | Active |
| `periodic_tasks` | Recurring maintenance task definitions | 00094 | Active |
| `ticket_supply_usage` | Supply consumption per ticket | 00073 | Active |

## Inspections / Quality (7 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `inspection_templates` | Inspection scoring templates | 00022 | Active |
| `inspection_template_items` | Items within inspection templates | 00022 | Active |
| `inspections` | Completed inspection records | 00022 | Active |
| `inspection_items` | Per-item scores within an inspection | 00022 | Active |
| `inspection_issues` | Issues found during inspections | 00022 | Active |
| `quality_control_inspections` | Enterprise QC inspection records | 00066 | Dormant |
| `field_reports` | Field inspection / site audit reports | 00095 | Active |

## Workforce / HR (20 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `staff` | Employee/contractor records | 00015 | Active |
| `staff_positions` | Position/title definitions | 00030 | Active |
| `staff_certifications` | Certification tracking per staff member | 00045 | Active |
| `staff_attendance` | Attendance records | 00052 | Active |
| `staff_payroll` | Payroll configuration per staff | 00052 | Dormant |
| `employees` | Enterprise employee records | 00066 | Dormant |
| `pay_rate_history` | Pay rate change audit trail | 00045 | Active |
| `hr_pto_requests` | PTO / time-off requests | 00071 | Active |
| `hr_performance_reviews` | Performance review records | 00071 | Active |
| `hr_goals` | Staff development goals | 00071 | Active |
| `hr_badges` | Achievement badge definitions | 00071 | Active |
| `hr_staff_badges` | Badge awards per staff member | 00071 | Active |
| `hr_staff_documents` | Document tracking per staff | 00071 | Active |
| `attendance_policies` | Attendance policy rules and thresholds | 00105 | Active |
| `holiday_calendar` | Company holiday definitions with pay multipliers | 00105 | Active |
| `callout_events` | Staff callout/absence event tracking | 00102 | Active |
| `coverage_offers` | Coverage offers to fill callout gaps | 00102 | Active |
| `on_call_pool` | On-call staff availability pool | 00102 | Active |
| `geofences` | GPS geofence boundaries per site | 00018 | Active |
| `nfc_tags` | NFC tag registrations for check-in | 00065 | Dormant |

## Timekeeping (9 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `time_events` | Clock in/out and break events | 00018 | Active |
| `time_entries` | Aggregated time entry records | 00018 | Active |
| `time_exceptions` | Time anomalies (geofence, late, missing checkout) | 00018 | Active |
| `time_punches` | Enterprise time punch records | 00065 | Dormant |
| `time_policies` | Clock-in restriction policies | 00065 | Active |
| `timesheets` | Weekly timesheet aggregations | 00018 | Active |
| `timesheet_approvals` | Timesheet approval actions | 00018 | Active |
| `alerts` | Time/attendance alert notifications | 00018 | Active |
| `site_pin_codes` | PIN codes for site clock-in | 00057 | Active |

## Routes & Schedule (15 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `routes` | Daily route definitions per staff | 00065 | Active |
| `route_stops` | Ordered stops within a route | 00065 | Active |
| `route_stop_tasks` | Tasks assigned to a route stop | 00090 | Active |
| `route_templates` | Reusable route templates | 00089 | Active |
| `route_template_stops` | Stops within route templates | 00089 | Active |
| `route_template_tasks` | Tasks within route template stops | 00089 | Active |
| `schedule_periods` | Publishing periods for schedules | 00075 | Active |
| `schedule_conflicts` | Scheduling conflict detection | 00078 | Active |
| `staff_availability_rules` | Staff availability preferences | 00076 | Active |
| `shift_trade_requests` | Shift swap/release requests | 00077 | Active |
| `travel_segments` | Travel time tracking between stops | 00101 | Active |
| `work_orders` | Work order records | 00066 | Active |
| `schedules` | Enterprise schedule records | 00066 | Dormant |
| `site_books` | Site-specific instruction books | 00103 | Active |
| `site_book_checklist_items` | Checklist items within site books | 00103 | Active |

## Assets & Fleet (9 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `vehicles` | Fleet vehicle records | 00027 | Active |
| `vehicle_maintenance` | Vehicle maintenance history | 00030 | Active |
| `vehicle_checkouts` | Vehicle check-out/return tracking | 00045 | Active |
| `vehicle_dvir_logs` | Driver Vehicle Inspection Reports | 00070 | Active |
| `vehicle_fuel_logs` | Fuel purchase tracking | 00070 | Active |
| `equipment` | Equipment inventory | 00030 | Active |
| `equipment_assignments` | Equipment-to-staff/site assignments | 00030 | Active |
| `key_inventory` | Key/fob/card inventory | 00027 | Active |
| `key_event_log` | Key assignment/return event log | 00045 | Active |

## Inventory & Procurement (22 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `supply_catalog` | Master supply item catalog | 00027 | Active |
| `supply_kits` | Predefined supply kit bundles | 00027 | Active |
| `supply_kit_items` | Items within supply kits | 00027 | Active |
| `site_supplies` | Supply assignments per site | 00026 | Active |
| `site_supply_costs` | Supply cost tracking per site | 00097 | Active |
| `supply_orders` | Purchase/supply orders | 00030 | Active |
| `supply_order_items` | Line items within supply orders | 00061 | Active |
| `supply_order_deliveries` | Proof-of-delivery records | 00068 | Active |
| `supply_requests` | Internal supply requests | 00066 | Dormant |
| `supply_request_lines` | Line items within supply requests | 00066 | Dormant |
| `inventory_counts` | Physical inventory count events | 00030 | Active |
| `inventory_count_details` | Per-item count details | 00030 | Active |
| `inventory_forms` | Custom inventory form definitions | 00053 | Active |
| `processed_form_responses` | Submitted inventory form responses | 00053 | Active |
| `inventory_locations` | Warehouse/storage location definitions | 00066 | Dormant |
| `inventory_items` | Enterprise inventory item records | 00066 | Dormant |
| `inventory_transactions` | Enterprise stock movement records | 00066 | Dormant |
| `items` | Enterprise item master | 00066 | Dormant |
| `stock_levels` | Current stock levels per location | 00066 | Dormant |
| `stock_movements` | Stock transfer records | 00066 | Dormant |
| `purchase_orders` | Enterprise purchase orders | 00066 | Dormant |
| `purchase_order_lines` | Enterprise PO line items | 00066 | Dormant |
| `procurement_approval_workflows` | Procurement approval workflow instances | 00069 | Active |
| `procurement_approval_steps` | Steps within approval workflows | 00069 | Active |
| `procurement_approval_actions` | Actions taken on approval workflows | 00069 | Active |
| `microfiber_wash_log` | Microfiber cloth wash tracking | 00097 | Active |

## Site Access & Assets Gating (3 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `site_asset_requirements` | Required assets per site (keys, vehicles, equipment) | 00026 | Active |
| `ticket_asset_checkouts` | Asset checkout per ticket | 00026 | Active |
| `location_access` | Enterprise site access credentials | 00065 | Dormant |

## Vendors & Subcontractors (5 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `subcontractors` | Subcontractor company records | 00030 | Active |
| `subcontractor_jobs` | Subcontractor-to-job assignments | 00054 | Active |
| `vendors` | Supply vendor records | 00066 | Active |
| `asset_transfers` | Equipment transfers between locations | 00066 | Dormant |
| `asset_maintenance_logs` | Equipment maintenance records | 00066 | Dormant |

## Safety & Training (3 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `safety_documents` | SDS, safety plans, regulatory documents | 00045 | Active |
| `training_courses` | Training course definitions | 00045 | Active |
| `training_completions` | Staff training completion records | 00045 | Active |

## Messaging (5 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `message_threads` | Conversation threads (direct, group, ticket-context) | 00057 | Active |
| `message_thread_members` | Thread membership and read state | 00057 | Active |
| `messages` | Individual messages within threads | 00057 | Active |
| `conversations` | Enterprise conversation records | 00066 | Dormant |
| `conversation_participants` | Enterprise conversation participants | 00066 | Dormant |

## Payroll Export (4 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `payroll_export_mappings` | Export template configurations | 00104 | Active |
| `payroll_export_mapping_fields` | Field mappings per export template | 00104 | Active |
| `payroll_export_runs` | Export execution records | 00104 | Active |
| `payroll_export_items` | Per-staff line items in export runs | 00104 | Active |

## Customer Portal (3 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `customer_portal_sessions` | Portal session tokens | 00096 | Active |
| `customer_feedback` | Customer feedback submissions | 00096 | Active |
| `customer_contacts` | Enterprise customer contact records | 00065 | Dormant |

## Enterprise Parity (dormant) (22 tables)

Tables from migration 00065/00066 that mirror enterprise ERP patterns. Not yet consumed by GleamOps UI.

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `organizations` | Enterprise org records | 00065 | Dormant |
| `organization_settings` | Org-level default settings | 00065 | Dormant |
| `customers` | Enterprise customer records | 00065 | Dormant |
| `locations` | Enterprise location records | 00065 | Dormant |
| `location_contacts` | Contacts at enterprise locations | 00065 | Dormant |
| `jobs` | Enterprise job records | 00065 | Dormant |
| `job_sites` | Enterprise job-site linkage | 00066 | Dormant |
| `leads` | Enterprise sales leads | 00065 | Dormant |
| `opportunities` | Enterprise opportunity records | 00065 | Dormant |
| `quotes` | Enterprise quote/proposal records | 00066 | Dormant |
| `quote_line_items` | Enterprise quote line items | 00065 | Dormant |
| `quote_workload_inputs` | Enterprise quote workload data | 00065 | Dormant |
| `contracts` | Enterprise contract records | 00065 | Dormant |
| `contract_locations` | Enterprise contract-location linkage | 00065 | Dormant |
| `contract_service_lines` | Enterprise contract service items | 00065 | Dormant |
| `contract_slas` | Enterprise SLA definitions | 00065 | Dormant |
| `issues` | Enterprise issue/defect tracking | 00065 | Dormant |
| `issue_comments` | Comments on enterprise issues | 00065 | Dormant |
| `issue_work_logs` | Work logs on enterprise issues | 00065 | Dormant |
| `invoices` | Enterprise invoice records | 00066 | Dormant |
| `invoice_line_items` | Enterprise invoice line items | 00066 | Dormant |
| `invoice_jobs` | Enterprise invoice-job linkage | 00066 | Dormant |

## Enterprise Finance (dormant) (6 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `payments` | Enterprise payment records | 00066 | Dormant |
| `pay_periods` | Enterprise pay period definitions | 00066 | Dormant |
| `payroll_runs` | Enterprise payroll run records | 00066 | Dormant |
| `payroll_line_items` | Enterprise payroll line items | 00066 | Dormant |
| `earning_codes` | Enterprise earning code definitions | 00066 | Dormant |
| `real_estate_properties` | Enterprise real estate records | 00066 | Dormant |

## Enterprise Training & Integration (dormant) (6 tables)

| Table | Purpose | Migration | Status |
|-------|---------|-----------|--------|
| `training_modules` | Enterprise training modules | 00066 | Dormant |
| `training_records` | Enterprise training records | 00066 | Dormant |
| `equipment_maintenance_logs` | Enterprise equipment maintenance | 00066 | Dormant |
| `integration_connections` | Enterprise API integration configs | 00066 | Dormant |
| `integration_sync_logs` | Integration sync history | 00066 | Dormant |
| `external_id_map` | External system ID mapping | 00066 | Dormant |
| `webhooks` | Enterprise webhook registrations | 00066 | Dormant |
| `assets` | Enterprise asset records | 00066 | Dormant |

## Views (7 regular views)

| View | Purpose | Migration | Status |
|------|---------|-----------|--------|
| `v_clients_contract_age` | Client contract age calculations | 00055 | Active |
| `v_job_profitability` | Job-level profitability metrics | 00055 | Active |
| `v_jobs_service_window` | Job service window summaries | 00055 | Active |
| `v_load_sheet` | Load sheet generation data | 00091 | Active |
| `v_night_bridge` | Night shift handoff data | 00092 | Active |
| `v_site_supply_assignments` | Site supply assignment summaries | 00054 | Active |
| `v_subcontractor_job_assignments` | Subcontractor assignment view | 00054 | Active |

## Materialized Views (3)

| View | Purpose | Migration | Status |
|------|---------|-----------|--------|
| `mv_job_financials` | Job financial summary (billing, hours, client) | 00036 | Active |
| `mv_client_summary` | Client summary (site count, job count, revenue) | 00036 | Active |
| `mv_staff_performance` | Staff performance metrics (hours, exceptions) | 00036 | Active |

---

## Summary

| Category | Tables | Active | Dormant |
|----------|--------|--------|---------|
| Platform / System | 18 | 8 | 10 |
| RBAC / Auth | 12 | 5 | 7 |
| CRM | 5 | 5 | 0 |
| Service DNA | 7 | 5 | 2 |
| Sales / Pipeline | 34 | 34 | 0 |
| Operations | 19 | 17 | 2 |
| Inspections / Quality | 7 | 6 | 1 |
| Workforce / HR | 20 | 18 | 2 |
| Timekeeping | 9 | 8 | 1 |
| Routes & Schedule | 15 | 13 | 2 |
| Assets & Fleet | 9 | 9 | 0 |
| Inventory & Procurement | 25 | 15 | 10 |
| Site Access & Assets Gating | 3 | 2 | 1 |
| Vendors & Subcontractors | 5 | 3 | 2 |
| Safety & Training | 3 | 3 | 0 |
| Messaging | 5 | 3 | 2 |
| Payroll Export | 4 | 4 | 0 |
| Customer Portal | 3 | 2 | 1 |
| Enterprise Parity (dormant) | 22 | 0 | 22 |
| Enterprise Finance (dormant) | 6 | 0 | 6 |
| Enterprise Training & Integration (dormant) | 8 | 0 | 8 |
| Views (regular) | 7 | 7 | 0 |
| Materialized Views | 3 | 3 | 0 |
| **Total** | **251** | ~**171** | ~**80** |

---

*Auto-generated reference. Source of truth: `supabase/migrations/` (111 SQL files). Run `pnpm generate:schema` to regenerate `docs/schema/required-schema-gleamops.json`.*
