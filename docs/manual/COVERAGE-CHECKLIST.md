# GleamOps Instruction Manual -- Coverage Checklist

> Comprehensive audit of all documentation artifacts. Every checkbox represents a deliverable that has been created and verified.

---

## Foundation Documents

- [x] Quickstart Guide (`00-quickstart.md`)
- [x] Navigation Cheatsheet (`01-navigation-cheatsheet.md`)
- [x] Roles & Permissions (`02-roles-permissions.md`)
- [x] Architecture Overview (`03-architecture-overview.md`)
- [x] Data Model Overview (`04-data-model-overview.md`)
- [x] Troubleshooting (`05-troubleshooting.md`)
- [x] Glossary (`06-glossary.md`)

**Foundation total: 7/7**

---

## Module Guides (15)

- [x] Home (`modules/home.md`)
- [x] Schedule (`modules/schedule.md`)
- [x] Jobs (`modules/jobs.md`)
- [x] Clients (`modules/clients.md`)
- [x] Pipeline (`modules/pipeline.md`)
- [x] Catalog (`modules/catalog.md`)
- [x] Team (`modules/team.md`)
- [x] Inventory (`modules/inventory.md`)
- [x] Equipment (`modules/equipment.md`)
- [x] Safety (`modules/safety.md`)
- [x] Reports (`modules/reports.md`)
- [x] Settings (`modules/settings.md`)
- [x] Shifts & Time (`modules/shifts-time.md`)
- [x] Vendors (`modules/vendors.md`)
- [x] Operations (`modules/operations.md`)

**Module guides total: 15/15**

---

## Module References (15)

- [x] Home Reference (`modules/home-reference.md`)
- [x] Schedule Reference (`modules/schedule-reference.md`)
- [x] Jobs Reference (`modules/jobs-reference.md`)
- [x] Clients Reference (`modules/clients-reference.md`)
- [x] Pipeline Reference (`modules/pipeline-reference.md`)
- [x] Catalog Reference (`modules/catalog-reference.md`)
- [x] Team Reference (`modules/team-reference.md`)
- [x] Inventory Reference (`modules/inventory-reference.md`)
- [x] Equipment Reference (`modules/equipment-reference.md`)
- [x] Safety Reference (`modules/safety-reference.md`)
- [x] Reports Reference (`modules/reports-reference.md`)
- [x] Settings Reference (`modules/settings-reference.md`)
- [x] Shifts & Time Reference (`modules/shifts-time-reference.md`)
- [x] Vendors Reference (`modules/vendors-reference.md`)
- [x] Operations Reference (`modules/operations-reference.md`)

**Module references total: 15/15**

---

## Architecture Diagrams (5)

- [x] C4 Context Diagram (`assets/c4-context.md` or embedded in architecture overview)
- [x] C4 Container Diagram (`assets/c4-container.md` or embedded in architecture overview)
- [x] Package Graph (`assets/package-graph.md` or embedded in architecture overview)
- [x] Sequence Diagrams (`assets/sequence-diagrams.md` or embedded in architecture overview)
- [x] ER Diagram (`assets/er-diagram.md` or embedded in data model overview)

**Architecture diagrams total: 5/5**

---

## Clickability Contract (1)

- [x] Clickability Contract (`CLICKABILITY-CONTRACT.md`)

**Clickability contract total: 1/1**

---

## Tab Coverage by Module

Every tab within each module is documented in the corresponding module guide and reference.

| Module | Tabs | Documented |
|--------|------|-----------|
| Home | Dashboard (1) | [x] |
| Schedule | Periods, Shifts (2) | [x] |
| Jobs | Jobs List, Tickets (2) | [x] |
| Clients | Clients List, Sites, Jobs, Contacts (4) | [x] |
| Pipeline | Prospects, Bids, Proposals (3) | [x] |
| Catalog | Service Plans, Tasks (2) | [x] |
| Team | Staff List, Schedule, Certifications, Time (4) | [x] |
| Inventory | Supplies, Orders, Counts (3) | [x] |
| Equipment | Equipment, Keys, Vehicles (3) | [x] |
| Safety | Certifications, Issues, Incidents (3) | [x] |
| Reports | Report Config, Results (2) | [x] |
| Settings | Company, Account, Notifications, Team, Billing (5) | [x] |
| Shifts & Time | Time Entries, Timesheets (2) | [x] |
| Vendors | Vendor List, Orders, Supplies (3) | [x] |
| Operations | Overview, Map, Timeline, Inspections, Daily Log (5) | [x] |

**Tab coverage total: 44/44 tabs across 15 modules**

---

## Form Field Coverage

Every form field is documented in the corresponding module reference Field Dictionary table.

| Form | Fields Documented |
|------|-------------------|
| Client Form | [x] 13 fields |
| Site Form | [x] 17 fields |
| Job Form | [x] 15 fields |
| Ticket Form | [x] 14 fields |
| Staff Form | [x] 19 fields |
| Schedule Period Form | [x] 10 fields |
| Shift Form | [x] 13 fields |
| Prospect Form | [x] 13 fields |
| Bid Form | [x] 11 fields |
| Proposal Form | [x] 13 fields |
| Service Plan Form | [x] 14 fields |
| Task Template Form | [x] 5 fields |
| Supply Item Form | [x] 15 fields |
| Supply Order Form | [x] 11 fields |
| Inventory Count Form | [x] 9 fields |
| Equipment Form | [x] 17 fields |
| Key Form | [x] 11 fields |
| Vehicle Form | [x] 15 fields |
| Certification Form | [x] 11 fields |
| Safety Issue Form | [x] 14 fields |
| Incident Report Form | [x] 13 fields |
| Quality Inspection Form | [x] 11 fields |
| Time Entry Form | [x] 16 fields |
| Timesheet Form | [x] 12 fields |
| Company Profile Form | [x] 14 fields |
| User Account Form | [x] 6 fields |
| Notification Prefs Form | [x] 6 fields |
| Vendor Form | [x] 19 fields |
| Report Config Form | [x] 6 fields |
| Operations Daily Log Form | [x] 9 fields |

**Form field coverage total: 30/30 forms documented**

---

## Detail Page Patterns (30)

- [x] Client Detail Page
- [x] Site Detail Page
- [x] Job Detail Page
- [x] Ticket Detail Page
- [x] Staff Detail Page
- [x] Schedule Period Detail Page
- [x] Shift Detail Page
- [x] Prospect Detail Page
- [x] Bid Detail Page
- [x] Proposal Detail Page
- [x] Service Plan Detail Page
- [x] Task Template Detail (inline)
- [x] Supply Item Detail Page
- [x] Supply Order Detail Page
- [x] Inventory Count Detail Page
- [x] Equipment Detail Page
- [x] Key Detail Page
- [x] Vehicle Detail Page
- [x] Certification Detail Page
- [x] Safety Issue Detail Page
- [x] Incident Report Detail Page
- [x] Quality Inspection Detail Page
- [x] Time Entry Detail Page
- [x] Timesheet Detail Page
- [x] Vendor Detail Page
- [x] Report Results Page
- [x] Company Profile Page
- [x] User Account Page
- [x] Operations Dashboard Page
- [x] Home Dashboard Page

**Detail page patterns total: 30/30**

---

## Keyboard Shortcuts (7)

- [x] `Ctrl+K` / `Cmd+K` -- Global search (command palette)
- [x] `Ctrl+N` / `Cmd+N` -- New entity (context-aware)
- [x] `Escape` -- Close modal/dialog/sheet
- [x] `Ctrl+S` / `Cmd+S` -- Save form
- [x] `Ctrl+Enter` -- Submit form
- [x] `Tab` / `Shift+Tab` -- Navigate form fields
- [x] `Arrow Keys` -- Navigate table rows / calendar cells

**Keyboard shortcuts total: 7/7**

---

## Status Lifecycles Documented (17)

- [x] CLIENT_STATUS (5 states: PROSPECT, ACTIVE, ON_HOLD, INACTIVE, CANCELED)
- [x] SITE_STATUS (4 states: ACTIVE, INACTIVE, ON_HOLD, CANCELED)
- [x] STAFF_STATUS (5 states: DRAFT, ACTIVE, ON_LEAVE, INACTIVE, TERMINATED)
- [x] JOB_STATUS (5 states: DRAFT, ACTIVE, ON_HOLD, CANCELED, COMPLETED)
- [x] TICKET_STATUS (5 states: SCHEDULED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELED)
- [x] PROSPECT_STATUS (6 states: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, WON, LOST)
- [x] BID_STATUS (5 states: DRAFT, ACTIVE, SUBMITTED, WON, LOST)
- [x] PROPOSAL_STATUS (6 states: DRAFT, SENT, VIEWED, SIGNED, EXPIRED, REJECTED)
- [x] PERIOD_STATUS (3 states: DRAFT, PUBLISHED, LOCKED)
- [x] SHIFT_STATUS (3 states: open, draft, confirmed)
- [x] SUPPLY_ORDER_STATUS (7 states: DRAFT, SUBMITTED, ORDERED, SHIPPED, DELIVERED, RECEIVED, CANCELED)
- [x] COUNT_STATUS (5 states: DRAFT, IN_PROGRESS, SUBMITTED, COMPLETED, CANCELLED)
- [x] CONDITION (4 states: GOOD, FAIR, POOR, OUT_OF_SERVICE)
- [x] KEY_STATUS (4 states: AVAILABLE, ASSIGNED, LOST, RETURNED)
- [x] VEHICLE_STATUS (3 states: ACTIVE, IN_SHOP, RETIRED)
- [x] CERT_STATUS (4 states: ACTIVE, EXPIRED, REVOKED, PENDING)
- [x] ISSUE_STATUS (5 states: OPEN, IN_PROGRESS, AWAITING_CLIENT, RESOLVED, CLOSED)

**Status lifecycles total: 17/17 entity types**

---

## Summary

| Category | Items | Complete |
|----------|-------|----------|
| Foundation docs | 7 | 7/7 |
| Module guides | 15 | 15/15 |
| Module references | 15 | 15/15 |
| Architecture diagrams | 5 | 5/5 |
| Clickability contract | 1 | 1/1 |
| Tabs documented | 44 | 44/44 |
| Forms documented | 30 | 30/30 |
| Detail pages documented | 30 | 30/30 |
| Keyboard shortcuts | 7 | 7/7 |
| Status lifecycles | 17 | 17/17 |
| **Grand Total** | **171** | **171/171** |

---

> Last audited: March 2026. Coverage: 100% of documented routes.
