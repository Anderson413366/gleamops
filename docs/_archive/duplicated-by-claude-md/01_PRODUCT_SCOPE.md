# Product scope and boundaries

GleamOps is a **commercial cleaning ERP** that replaces spreadsheets by forcing “data continuity”:

**Service DNA → Bid → Job/Contract → Tickets → Time/Quality/Assets/Safety → Reports**

## In scope

### Module A: CRM
- Clients (billing orgs)
- Sites (locations)
- Contacts (people)

### Module B: Service configuration “DNA”
- Tasks library (atomic actions)
- Services (templates/bundles)
- Service tasks (task + default frequency + default production assumptions)

### Module C: Sales “CleanFlow”
- Prospects / opportunities (pipeline)
- Bid wizard (loads a service template)
- Measurements (express + manual)
- Workloading + pricing + recommended price
- Proposals (PDF)
- Proposal send + tracking + follow-ups
- Won/Lost lifecycle

### Module D: Operations
- Contracts / service plans (`site_jobs`)
- Recurrence rules
- Work tickets (daily dispatch events)

### Module E: Workforce & HR
- Staff (employees + subs)
- Roles / positions
- Attendance + timekeeping (geofenced)
- Payroll exports

### Module F: Assets
- Vehicles + maintenance
- Keys + custody tracking
- Equipment assignment + condition

### Module G: Inventory
- Supplies catalog + costs
- Site supply assignments
- Kits (template supply sets)
- Purchasing (later phase)

### Module H: Safety & compliance
- SDS links surfaced per site and per ticket
- Staff certifications (OSHA, bloodborne, etc.)

### Cross-cutting platform features (required)
- Audit trail
- Notifications
- Search
- File storage
- Rate limiting
- Admin settings & lookups

## Explicitly out of scope
- Invoicing (all of it): invoices, payments, statements, taxes

## Product principles

### One golden object: Work Ticket
A Work Ticket is the center of operations. Everything attaches to it:
- schedule window + assignment
- checklist execution + photos
- timekeeping session(s)
- assets (vehicle/keys) used
- safety docs
- inspection issues and follow-up actions

### “Apple simple” UX rules
- **One primary action** per screen
- **Progressive disclosure**: Simple default, Advanced toggle
- List → detail drawer pattern (keep context)
- Inbox-style review for approvals/exceptions

### Deterministic math, explainable decisions
- Server-side calculation for workload/pricing
- UI must show “Why this price?” breakdown
- All generated PDFs and sent emails are immutable snapshots

## Navigation (the 5 spaces)

Top-level app spaces (what users see):
1. **Pipeline** (Prospects, Bids, Proposals, Follow-ups)
2. **Customers** (Clients, Sites, Service Plans, Quality, Safety, Documents)
3. **Schedule** (Calendar + Dispatch + Ticket lists)
4. **Team** (Timekeeping, Timesheets, Messaging, Assets checkouts)
5. **Reports** (Ops, Sales, Quality)

Settings/Setup lives behind avatar menu:
- Service DNA
- Inventory
- Lookups
- Roles & access
- Integrations

This keeps the interface ADHD-friendly: fewer choices, clearer “next step.”
