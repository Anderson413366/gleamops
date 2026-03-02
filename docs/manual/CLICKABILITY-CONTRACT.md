# GleamOps Clickability Contract

> Every interactive surface in GleamOps must behave predictably. This contract defines the rules that govern what is clickable, where it links, and how navigation flows between entities.

---

## 1. Dashboard KPI Cards

Every KPI card on a dashboard page **must be clickable** and deep-link to the relevant filtered list.

| Dashboard | KPI Card | Deep-Link Target |
|-----------|----------|-----------------|
| Home | Active Jobs | `/jobs?status=ACTIVE` |
| Home | Today's Tickets | `/jobs/tickets?date=today&status=SCHEDULED,IN_PROGRESS` |
| Home | Open Shifts | `/schedule?status=open` |
| Home | Revenue (MTD) | `/reports?type=revenue_summary&period=month` |
| Home | Active Clients | `/clients?status=ACTIVE` |
| Home | Pipeline Value | `/pipeline` |
| Home | Staff on Duty | `/team?status=ACTIVE` |
| Home | Safety Issues | `/safety?tab=issues&status=OPEN` |
| Operations | Tickets Completed | `/jobs/tickets?date=today&status=COMPLETED` |
| Operations | Shift Coverage % | `/schedule?date=today` |
| Operations | Open Issues | `/safety?tab=issues&status=OPEN` |
| Operations | Quality Score | `/operations?tab=inspections` |

**Rule**: If a KPI card displays a count or value, clicking it must navigate to the list view that produced that number with the equivalent filters pre-applied.

---

## 2. Entity Mentions in Tables

Every entity mention (client name, site name, staff name, ticket number, shift reference, service plan name) appearing in **any table row or detail page** must be rendered as a clickable link to that entity's detail page.

| Entity Type | Link Pattern | Example |
|-------------|-------------|---------|
| Client | `/clients/:clientId` | "Acme Corp" in a job row links to client detail |
| Site | `/clients/:clientId/sites/:siteId` | "Main Office" in a ticket row links to site detail |
| Staff | `/team/:staffId` | "Jane Smith" in a shift row links to staff detail |
| Job | `/jobs/:jobId` | "Weekly Cleaning #42" in a schedule row links to job detail |
| Ticket | `/jobs/:jobId/tickets/:ticketId` | "TKT-001234" in a time entry links to ticket detail |
| Shift | `/schedule/:periodId/shifts/:shiftId` | Shift reference in time entry links to shift detail |
| Service Plan | `/catalog/:planId` | "Standard Janitorial" in a job detail links to catalog |
| Prospect | `/pipeline/:prospectId` | Prospect name in pipeline board links to detail |
| Vendor | `/vendors/:vendorId` | Vendor name in supply item links to vendor detail |
| Equipment | `/equipment/:equipmentId` | Equipment name in assignment links to detail |

**Rule**: The `EntityLink` component must be used for all cross-entity references. Plain text rendering of entity names in tables is a clickability violation.

---

## 3. Detail Page Related Entities

Every detail page must expose its related entities as clickable links.

| Detail Page | Related Entities (must be clickable) |
|-------------|--------------------------------------|
| Client Detail | Sites list, Jobs list, Contacts |
| Site Detail | Parent Client, Jobs at site, Keys for site |
| Job Detail | Client, Site, Service Plan, Tickets list, Assigned Staff |
| Ticket Detail | Parent Job, Client, Site, Assigned Staff, Time Entries |
| Staff Detail | Assigned Shifts, Time Entries, Certifications, Equipment |
| Schedule Period | Shifts with linked Jobs, Sites, Staff |
| Shift Detail | Period, Job, Site, Assigned Staff, Time Entry |
| Prospect Detail | Bids list, Proposals list, Assigned Rep |
| Bid Detail | Parent Prospect |
| Proposal Detail | Parent Prospect, Parent Bid (if any) |
| Supply Item Detail | Preferred Vendor, Related Orders |
| Supply Order Detail | Vendor, Line Items (linked to supply items) |
| Equipment Detail | Assigned Staff, Maintenance Log |
| Key Detail | Associated Site, Assigned Staff |
| Vehicle Detail | Assigned Staff |
| Safety Issue Detail | Reported By (staff), Assigned To (staff), Site |
| Certification Detail | Staff Member |
| Incident Detail | Site, Involved Staff |
| Quality Inspection | Site, Inspector (staff) |

**Rule**: If an entity has a parent or child relationship, the link must be present on the detail page. Orphaned detail pages with no navigation to related entities are a clickability violation.

---

## 4. Back Navigation Links

Every detail page must include a "Back to [Module]" link that navigates to the correct canonical route.

| Detail Page | Back Link Label | Target Route |
|-------------|----------------|-------------|
| Client Detail | Back to Clients | `/clients` |
| Site Detail | Back to Client | `/clients/:clientId` |
| Job Detail | Back to Jobs | `/jobs` |
| Ticket Detail | Back to Job | `/jobs/:jobId` |
| Staff Detail | Back to Team | `/team` |
| Schedule Period Detail | Back to Schedule | `/schedule` |
| Shift Detail | Back to Period | `/schedule/:periodId` |
| Prospect Detail | Back to Pipeline | `/pipeline` |
| Bid Detail | Back to Prospect | `/pipeline/:prospectId` |
| Proposal Detail | Back to Prospect | `/pipeline/:prospectId` |
| Service Plan Detail | Back to Catalog | `/catalog` |
| Supply Item Detail | Back to Inventory | `/inventory` |
| Supply Order Detail | Back to Inventory | `/inventory` |
| Inventory Count Detail | Back to Inventory | `/inventory` |
| Equipment Detail | Back to Equipment | `/equipment` |
| Key Detail | Back to Equipment | `/equipment` |
| Vehicle Detail | Back to Equipment | `/equipment` |
| Safety Issue Detail | Back to Safety | `/safety` |
| Certification Detail | Back to Safety | `/safety` |
| Incident Detail | Back to Safety | `/safety` |
| Inspection Detail | Back to Operations | `/operations` |
| Vendor Detail | Back to Vendors | `/vendors` |
| Report Detail | Back to Reports | `/reports` |

**Rule**: Back links must use the breadcrumb component. The target route must be the canonical list or parent detail page, never the browser `history.back()` method.

---

## 5. Form Accessibility

All entity forms must be openable from both the list page and the detail page.

| Form | List Page Entry Point | Detail Page Entry Point |
|------|----------------------|------------------------|
| Client Form | "+ New Client" button on `/clients` | "Edit Client" button on client detail |
| Site Form | "+ Add Site" on client detail Sites tab | "Edit Site" button on site detail |
| Job Form | "+ New Job" button on `/jobs` | "Edit Job" button on job detail |
| Ticket Form | "+ New Ticket" on job detail Tickets tab | "Edit Ticket" button on ticket detail |
| Staff Form | "+ New Staff" button on `/team` | "Edit Staff" button on staff detail |
| Schedule Period Form | "+ New Period" button on `/schedule` | Edit via period detail |
| Shift Form | "+ Add Shift" on period detail | "Edit Shift" on shift card |
| Prospect Form | "+ New Prospect" button on `/pipeline` | "Edit Prospect" on prospect detail |
| Bid Form | "+ New Bid" on prospect detail Bids tab | "Edit Bid" on bid detail |
| Proposal Form | "+ New Proposal" on prospect detail | "Edit Proposal" on proposal detail |
| Service Plan Form | "+ New Service Plan" on `/catalog` | "Edit Plan" on plan detail |
| Supply Item Form | "+ New Item" on `/inventory` | "Edit Item" on item detail |
| Supply Order Form | "+ New Order" on Orders tab | "Edit Order" on order detail |
| Vendor Form | "+ New Vendor" on `/vendors` | "Edit Vendor" on vendor detail |
| Equipment Form | "+ New Equipment" on `/equipment` | "Edit Equipment" on equipment detail |
| Key Form | "+ New Key" on Keys tab | "Edit Key" on key detail |
| Vehicle Form | "+ New Vehicle" on Vehicles tab | "Edit Vehicle" on vehicle detail |
| Safety Issue Form | "+ Report Issue" on `/safety` | "Edit Issue" on issue detail |
| Certification Form | "+ New Certification" on Certs tab | "Edit Certification" on cert detail |
| Incident Form | "+ New Incident" on Incidents tab | "Edit Incident" on incident detail |
| Inspection Form | "+ New Inspection" on Inspections tab | "Edit Inspection" on inspection detail |

**Rule**: Create forms use dialog/sheet modals opened from "+ New" buttons. Edit forms use the same dialog pre-populated with existing data, opened from "Edit" buttons on the detail page.

---

## 6. Status Badge Updates

Status badges on detail pages must be updatable via the `StatusToggleDialog` component.

| Entity | Status Field | Update Mechanism |
|--------|-------------|-----------------|
| Client | CLIENT_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Site | SITE_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Job | JOB_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Ticket | TICKET_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Staff | STAFF_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Schedule Period | PERIOD_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Shift | SHIFT_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Prospect | PROSPECT_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Bid | BID_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Proposal | PROPOSAL_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Supply Order | SUPPLY_ORDER_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Inventory Count | COUNT_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Equipment | CONDITION | Click badge -> StatusToggleDialog with valid transitions |
| Key | KEY_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Vehicle | VEHICLE_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Certification | CERT_STATUS | Click badge -> StatusToggleDialog with valid transitions |
| Safety Issue | ISSUE_STATUS | Click badge -> StatusToggleDialog with valid transitions |

**Rule**: Status badges must not be static text. Clicking a status badge on a detail page must open the `StatusToggleDialog`, which displays the current status and all valid transitions. The dialog enforces the state machine defined in each module's reference.

---

## 7. Cross-Entity Link Component

All cross-entity clickable links must use the `EntityLink` component.

```
<EntityLink entity="client" id={clientId} label={clientName} />
<EntityLink entity="staff" id={staffId} label={staffFullName} />
<EntityLink entity="job" id={jobId} label={jobName} />
```

**EntityLink contract**:
- Renders as a styled anchor tag with hover underline
- Navigates to the canonical detail route for the entity type
- Supports `prefetch` for hover-based route prefetching
- Falls back to plain text if `id` is null/undefined (e.g., unassigned)

---

## 8. Known Clickability Gaps

| # | Gap Description | Module | Severity | Status |
|---|----------------|--------|----------|--------|
| -- | No known clickability gaps at this time | -- | -- | -- |

> This section is maintained as an audit log. Any discovered clickability violations should be logged here with module, description, and resolution status.

---

## Enforcement

- All new UI components must comply with this contract before merge
- PR reviews must include a clickability check for any page that renders entity names, status badges, or KPI values
- Automated tests should verify that `EntityLink` is used for all cross-entity references
- The `StatusToggleDialog` must be wired to every status badge on every detail page

---

*Last updated: March 2026*
