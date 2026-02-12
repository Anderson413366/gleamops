# Appendix A: Table catalog (vFinal)

This is the *intended* table list for the full GleamOps scope (Pipeline → Ops → Timekeeping → Quality → Assets → Safety).

## Platform / System
- tenants
- tenant_memberships
- users (Supabase auth)
- roles (lookup)
- user_roles (if not using memberships role)
- user_site_assignments
- lookups
- status_transitions
- system_sequences
- files (storage metadata)
- audit_events
- notifications
- rate_limits

## CRM (Module A)
- clients
- sites
- contacts
- site_files (optional)
- timeline_events (polymorphic activity stream)

## Service DNA (Module B)
- tasks
- task_production_rates
- services
- service_tasks

## Sales / Pipeline (Module C)
- sales_prospects
- sales_prospect_contacts
- sales_opportunities
- sales_competitors
- sales_opportunity_competitors
- sales_bids
- sales_bid_versions
- sales_bid_sites
- sales_bid_areas
- sales_bid_area_tasks
- sales_bid_general_tasks
- sales_bid_schedule
- sales_bid_labor_rates
- sales_bid_burden_components
- sales_bid_consumables
- sales_bid_supply_allowances
- sales_bid_equipment_plan_items
- sales_bid_overhead
- sales_bid_workload_results
- sales_bid_pricing_results
- sales_proposals
- sales_proposal_pricing_options
- sales_proposal_attachments
- sales_proposal_marketing_inserts
- sales_proposal_signatures
- sales_proposal_sends
- sales_email_events
- sales_followup_templates
- sales_followup_sequences
- sales_followup_sends
- sales_bid_conversions
- sales_conversion_events
- sales_activities (polymorphic timeline)

## Operations (Module D)
- site_jobs
- recurrence_rules
- work_tickets
- ticket_assignments
- ticket_status_history
- checklist_templates
- ticket_checklists
- ticket_checklist_items
- ticket_photos
- ticket_files

## Workforce & HR (Module E)
- staff
- staff_certifications
- positions (optional)
- attendance (legacy/simple)
- geofences
- time_events
- time_entries
- time_exceptions
- alerts
- timesheets
- timesheet_approvals

## Assets (Module F)
- vehicles
- vehicle_maintenance
- vehicle_checkouts
- keys
- key_assignments
- equipment
- equipment_assignments

## Inventory & Safety (Modules G/H)
- supplies
- supply_assignments
- supply_kits
- supply_kit_items
- purchase_orders (later)
- purchase_order_items (later)
