# Module-by-Module Guide

> Use this file when you want one plain-language map of the entire app.
> It explains what each production module does, where it lives, and which detailed manual pages go deeper.

---

## How to Read This Guide

- **Certification / QA name** = the module name used in release audits.
- **Canonical app area** = the actual route or manual module where the work happens.
- **Use this when** = the fastest way to decide whether you are in the right module.
- **Detailed manual** = the best next file if you need step-by-step instructions.

---

## Whole-App Flow

GleamOps follows a business flow from sales through operations:

`Sales Pipeline -> Estimating -> Client/ Site setup -> Service Catalog -> Staff Schedule -> Dispatch / Work Orders -> Shifts & Time -> Payroll / Reports`

Most modules either:
- define the work
- assign the work
- execute the work
- measure the work
- configure the system

---

## Module Crosswalk

| Certification / QA name | Canonical app area | Main routes | Use this when | Detailed manual |
| --- | --- | --- | --- | --- |
| Home + Search / Command Palette | Home | `/home`, global `Cmd/Ctrl+K` | You need a role-based dashboard, alerts, KPIs, or quick navigation | [home.md](./modules/home.md), [01-navigation-cheatsheet.md](./01-navigation-cheatsheet.md) |
| Staff Schedule | Schedule | `/schedule`, `/schedule?tab=recurring`, `/schedule?tab=leave`, `/schedule?tab=my-schedule` | You need to build recurring schedules, manage availability/leave, or review an employee schedule | [schedule.md](./modules/schedule.md), [schedule-reference.md](./modules/schedule-reference.md) |
| Dispatch | Schedule + Shifts & Time | `/schedule?tab=planning`, `/schedule?tab=master`, `/schedule?tab=floater`, `/schedule?tab=supervisor`, `/shifts-time` | You need day-of planning, route balancing, assignment notes, or live route execution | [schedule.md](./modules/schedule.md), [shifts-time.md](./modules/shifts-time.md) |
| Work Orders | Schedule + Jobs | `/schedule?tab=work-orders`, `/schedule?tab=calendar`, `/jobs?tab=tickets`, `/jobs?tab=service-plans`, `/jobs?tab=inspections`, `/jobs?tab=routes` | You need ticket execution, service plans, inspections, or route records | [jobs.md](./modules/jobs.md), [schedule.md](./modules/schedule.md) |
| Field Tools | Schedule + Jobs | `/schedule?tab=checklists`, `/schedule?tab=forms`, `/jobs?tab=time` | You need shift checklists, field requests, or time-alert follow-up | [schedule.md](./modules/schedule.md), [jobs.md](./modules/jobs.md) |
| Client Hub | Clients | `/clients?tab=clients`, `/clients?tab=sites`, `/clients?tab=contacts`, `/clients?tab=requests` | You need client companies, locations, contacts, or inbound service requests | [clients.md](./modules/clients.md), [clients-reference.md](./modules/clients-reference.md) |
| Sales Pipeline | Pipeline | `/pipeline?tab=prospects`, `/pipeline?tab=opportunities`, `/pipeline?tab=bids`, `/pipeline?tab=proposals`, `/pipeline?tab=analytics` | You need lead tracking, pipeline management, bids, proposals, or funnel reporting | [pipeline.md](./modules/pipeline.md), [pipeline-reference.md](./modules/pipeline-reference.md) |
| Estimating | Pipeline | `/pipeline/calculator`, `/pipeline/supply-calculator` | You need CleanFlow pricing, labor modeling, or supply cost estimation | [pipeline.md](./modules/pipeline.md), [../cleanflow-engine.md](../cleanflow-engine.md) |
| Sales Admin | Pipeline | `/pipeline/admin` | You need proposal templates, follow-up templates, inserts, or sales-system administration | [pipeline.md](./modules/pipeline.md), [proposals-email.md](../proposals-email.md) |
| Workforce | Team | `/team?tab=staff`, `/team?tab=positions`, `/team?tab=hr`, `/team?tab=messages`, `/team?tab=field-reports` | You need staff records, positions, HR data, staff messaging, or field reports | [team.md](./modules/team.md), [team-reference.md](./modules/team-reference.md) |
| Time & Pay | Team + Shifts & Time | `/team?tab=attendance`, `/team?tab=timesheets`, `/team?tab=payroll`, `/team?tab=microfiber`, `/shifts-time` | You need attendance, timesheet review, payroll prep, microfiber payouts, or live time capture | [team.md](./modules/team.md), [shifts-time.md](./modules/shifts-time.md), [../timekeeping.md](../timekeeping.md) |
| Shift Config | Team | `/team?tab=break-rules`, `/team?tab=shift-tags` | You need shift rules, break rules, or shared shift-tag configuration | [team.md](./modules/team.md), [team-reference.md](./modules/team-reference.md) |
| Inventory | Inventory | `/inventory?tab=supplies`, `/inventory?tab=kits`, `/inventory?tab=site-assignments`, `/inventory?tab=counts`, `/inventory?tab=warehouse` | You need stock control, kits, site-level supply tracking, counts, or warehouse review | [inventory.md](./modules/inventory.md), [inventory-reference.md](./modules/inventory-reference.md) |
| Procurement | Inventory + Vendors | `/inventory?tab=orders`, `/inventory?tab=forecasting`, `/inventory?tab=vendors`, `/vendors` | You need purchase orders, demand planning, or vendor management | [inventory.md](./modules/inventory.md), [vendors.md](./modules/vendors.md) |
| Assets | Equipment | `/equipment?tab=equipment`, `/equipment?tab=assignments`, `/equipment?tab=keys`, `/equipment?tab=vehicles`, `/equipment?tab=maintenance`, legacy `/assets` | You need tools, keys, vehicles, assignments, or maintenance history | [equipment.md](./modules/equipment.md), [equipment-reference.md](./modules/equipment-reference.md) |
| Compliance | Safety | `/safety?tab=certifications`, `/safety?tab=training`, `/safety?tab=incidents`, `/safety?tab=calendar` | You need certifications, training, incidents, or expiration tracking | [safety.md](./modules/safety.md), [safety-reference.md](./modules/safety-reference.md) |
| Reports | Reports | `/reports` | You need KPIs, cross-module analytics, exports, or read-only dashboards | [reports.md](./modules/reports.md), [reports-reference.md](./modules/reports-reference.md) |
| Service Catalog | Catalog | `/catalog?tab=tasks`, `/catalog?tab=services`, `/catalog?tab=mapping`, `/catalog?tab=scope-library` | You need task definitions, service definitions, task-to-service mapping, or reusable scopes | [catalog.md](./modules/catalog.md), [catalog-reference.md](./modules/catalog-reference.md) |
| Settings | Settings | `/settings` | You need system setup, lookups, imports, rules, sequences, geofences, or tenant-level configuration | [settings.md](./modules/settings.md), [settings-reference.md](./modules/settings-reference.md) |
| Shifts & Time / Tonight Board | Shifts & Time | `/shifts-time` | You need real-time clock in/out, active route execution, or staff shift state | [shifts-time.md](./modules/shifts-time.md), [shifts-time-reference.md](./modules/shifts-time-reference.md) |

---

## What Each Module Actually Does

### 1. Home + Search / Command Palette

This is the front door to the app. It changes by role.

- Owners and managers see KPIs, alerts, trend widgets, and shortcuts.
- Supervisors see route and team activity.
- Cleaners and inspectors see their own workday view.
- Search / Command Palette is the global jump tool for records, routes, and actions.

Use this area to orient yourself, spot problems quickly, and jump into the correct downstream module.

### 2. Staff Schedule

This is the planning backbone for recurring work.

- **Employee Grid** is where managers view and edit repeating assignments.
- **Leave & Availability** stores who is available, unavailable, or on leave.
- **My Schedule** is the staff-facing view of assigned work.

Use this module when you are shaping future coverage rather than executing work in real time.

### 3. Dispatch

Dispatch is the day-of operations layer on top of Staff Schedule.

- **Planning Board** handles day planning and assignment notes.
- **Master Board** gives the global operations view.
- **My Route** shows field staff or assigned-route perspective.
- **Supervisor View** supports oversight and exception handling.
- **Tonight Board** connects to live shift execution.

Use Dispatch when today's plan needs to be balanced, adjusted, or communicated.

### 4. Work Orders

This is where scheduled work turns into concrete operational records.

- **Open Orders** and **Calendar** show pending and dated work.
- **Service Plans** define recurring scope tied to clients and sites.
- **Job Log / Tickets** records issues, tasks, and work completed.
- **Inspections** captures quality checks.
- **Routes** stores route-level execution groupings.

Use this module when you need to see or manage actual work to be completed.

### 5. Field Tools

Field Tools supports the people doing the work in the field.

- **Shift Checklists** guide standard operating steps.
- **Field Requests** captures on-the-ground requests or exceptions.
- **Time Alerts** surfaces attendance or timing issues that need review.

Use this area when the priority is execution support, not administrative setup.

### 6. Client Hub

Client Hub is the customer system of record.

- **Clients** are the companies you serve.
- **Sites** are the physical locations.
- **Contacts** are the people at those companies and locations.
- **Requests** captures inbound client asks and issues.

Most operational modules eventually point back to a client and a site stored here.

### 7. Sales Pipeline

This is the CRM and revenue pipeline.

- **Prospects** are early leads.
- **Opportunities** are active sales pursuits.
- **Bids** calculate pricing and scope.
- **Proposals** package the offer for the client.
- **Analytics** shows funnel performance.

Use this area when work has not yet been won and turned into operational delivery.

### 8. Estimating

Estimating is the pricing engine side of the sales flow.

- The **Bid Calculator** uses CleanFlow labor and production logic.
- The **Supply Calculator** estimates consumables and cost inputs.

Use it when you need defendable labor hours, costs, and pricing before a proposal is sent.

### 9. Sales Admin

Sales Admin is the configuration layer for the sales team.

- Proposal templates
- Follow-up templates
- Marketing inserts
- Sales-system defaults

Use it when you are maintaining reusable sales assets instead of working an individual deal.

### 10. Workforce

Workforce is the people-management hub.

- Staff records
- Positions and roles
- HR and review workflows
- Messages
- Field reports
- Partner / subcontractor relationships

Use this module when the main question is about a person, their employment record, or workforce communication.

### 11. Time & Pay

This area manages labor records after work is performed.

- Attendance
- Timesheets
- Payroll review
- Microfiber payout tracking

Use it when you need to reconcile hours, review pay-period data, or prepare payroll outputs.

### 12. Shift Config

This is the shared settings layer for how shifts behave.

- Break rules
- Shift tags

Use it when you need to change reusable shift behavior instead of editing one employee's schedule.

### 13. Inventory

Inventory manages the consumables side of service delivery.

- Supply catalog
- Kits
- Site assignments
- Stock counts
- Warehouse balances

Use it when you need to know what supplies exist, where they are, and whether enough stock is available.

### 14. Procurement

Procurement handles how inventory gets replenished.

- Purchase orders
- Forecasting
- Vendor management

Use it when the question is "what do we need to buy?" or "who do we buy it from?"

### 15. Assets

Assets manages durable physical property instead of consumables.

- Equipment
- Assignments
- Keys
- Vehicles
- Maintenance

Use this area when the business needs to track ownership, assignment, access, or service history for tools and fleet.

### 16. Compliance

Compliance is the safety and documentation layer.

- Certifications
- Training
- Incidents
- Expiration tracking

Use it when you need to prove readiness, track risk, or manage required compliance records.

### 17. Reports

Reports is the read-only analytics hub.

It pulls from all other modules and turns operational data into dashboards, trends, and exports.

Use it when you are measuring the business rather than editing it.

### 18. Service Catalog

Service Catalog defines what your company sells and delivers.

- Task library
- Service definitions
- Task mapping
- Scope library

Use it when you need reusable definitions that power bids, schedules, checklists, and operations.

### 19. Settings

Settings is the tenant-wide control panel.

- Company profile
- Lookups
- Geofences
- Rules
- Data hub
- Sequences
- Import tools
- Schedule and time-clock settings

Use it when you need to change how the system behaves globally.

### 20. Shifts & Time / Tonight Board

This is the live shift-execution module.

- Clock in / out
- Break events
- Active shift state
- Route execution
- Tonight Board operational flow

Use it when work is happening right now and the system needs to capture time or route progress in real time.

---

## Fastest Reading Path

If you want to understand the app quickly, read in this order:

1. [00-quickstart.md](./00-quickstart.md)
2. [01-navigation-cheatsheet.md](./01-navigation-cheatsheet.md)
3. [02-roles-permissions.md](./02-roles-permissions.md)
4. [03-architecture-overview.md](./03-architecture-overview.md)
5. This file
6. Then the module guides most relevant to your role or project

---

## Best Next File By Goal

| If you want to understand... | Read this next |
| --- | --- |
| How records connect across the app | [04-data-model-overview.md](./04-data-model-overview.md) |
| Who can do what | [02-roles-permissions.md](./02-roles-permissions.md) |
| How the app is built technically | [07-code-architecture.md](./07-code-architecture.md) |
| How scheduling rules and coverage work | [../schedule-coverage.md](../schedule-coverage.md) |
| How timekeeping and geofence flows work | [../timekeeping.md](../timekeeping.md) |
| How bids and pricing work | [../cleanflow-engine.md](../cleanflow-engine.md) |

