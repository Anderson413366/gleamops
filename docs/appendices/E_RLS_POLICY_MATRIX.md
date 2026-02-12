# Appendix E: RLS policy matrix (starter)

This is the “don’t forget a table” checklist.

Legend:
- TI = Tenant isolation (tenant_id must match)
- OW = Owner/team access
- SS = Site-scoped access
- AD = Admin-only write
- RO = Read-only

## Platform
- tenants: TI + AD
- tenant_memberships: TI + AD
- lookups: TI + AD (read for all members)
- status_transitions: TI + AD
- system_sequences: TI + AD
- audit_events: TI + RO (admins can read all; users can read own events if desired)
- notifications: TI + user-only select/update (read_at)

## CRM
- clients: TI (members read); managers write
- sites: TI + SS
- contacts: TI + SS (or client-scoped)

## Service DNA
- tasks: TI; managers/admin write
- task_production_rates: TI; managers/admin write
- services: TI; managers/admin write
- service_tasks: TI; managers/admin write

## Sales / Pipeline
- sales_prospects: TI + OW
- sales_prospect_contacts: TI + OW (via prospect)
- sales_opportunities: TI + OW
- sales_bids: TI + OW
- sales_bid_versions: TI + OW (lock writes if sent snapshot)
- sales_bid_* details: TI + OW
- sales_proposals: TI + OW (lock writes if sent)
- sales_proposal_sends: TI + OW
- sales_email_events: TI + RO (insert only from webhook/service)
- sales_followup_*: TI + OW (worker inserts sends)

## Ops / Tickets
- site_jobs: TI + SS
- recurrence_rules: TI + SS (managers write)
- work_tickets: TI + SS (assigned staff read/update execution fields)
- ticket_checklists/items/photos: TI + SS
- ticket_status_history: TI + SS + RO (insert only via triggers)

## Timekeeping
- geofences: TI + SS (managers write)
- time_events/time_entries: TI + SS (staff create own events; managers approve edits)
- exceptions/alerts: TI + SS (staff read own; managers read all for sites)

## Quality
- inspection_templates: TI + AD (or manager write)
- inspections/items/photos: TI + SS (inspectors create; managers read)
