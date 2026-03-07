# GleamOps App Module Operations Guide (Anderson Cleaning)

## Scope And Source Of Truth
This guide is based on repository truth from:
- `README.md`
- `docs/README.md`
- Route and page code under `apps/web/src/app/(dashboard)`
- Navigation map in `packages/shared/src/constants/index.ts` (`NAV_TREE`)
- Breadcrumb/tab mapping in `apps/web/src/components/layout/breadcrumbs.tsx`

When behavior is not explicit in those sources, it is marked **needs verification**.

## End-To-End Operating Model (Anderson Cleaning)
`README.md` defines the business flow as:

Sales Pipeline -> Won Bid -> Client + Site + Contract -> Work Tickets -> Clock In/Out

In route/module terms, the implemented operating path is:

| Stage | Primary Modules/Routes | Primary Objects |
|---|---|---|
| Lead to qualified opportunity | Sales Pipeline (`/pipeline`) | `sales_prospects`, `sales_opportunities` |
| Estimate and price | Estimating (`/pipeline/calculator`, `/pipeline/supply-calculator`) + Sales Admin (`/pipeline/admin`) | CleanFlow snapshots, supply pricing inputs, `sales_production_rates` |
| Proposal and close | Sales Pipeline (`/pipeline?tab=proposals`) | `sales_bids`, `sales_proposals` |
| Account and site setup | Client Hub (`/clients`) | `clients`, `sites`, `contacts`, change-request alerts |
| Service design and execution setup | Service Catalog (`/catalog`) + Workforce (`/team`) + Shift Config (`/team?tab=break-rules|shift-tags`) | `tasks`, `services`, `service_tasks`, `staff`, `staff_positions`, break/tag configs |
| Schedule and dispatch | Staff Schedule + Dispatch + Work Orders (`/schedule?...`) | `site_jobs`, `work_tickets`, `ticket_assignments`, `routes`, schedule conflicts |
| Field completion and time capture | Field Tools (`/schedule?tab=checklists|forms`, `/jobs?tab=time`) + Time & Pay (`/team?tab=attendance|timesheets|payroll`) | checklist instances, alerts, `time_entries`, `timesheets` |
| Materials/equipment readiness | Inventory + Procurement (`/inventory?...`) + Assets (`/equipment?...`) | supplies, counts, orders, vendors, equipment/keys/vehicles |
| Risk and performance loop | Compliance (`/safety`) + Reports (`/reports`) + Home (`/home`) | certifications/training/incidents, multi-domain KPIs/alerts |

## Primary Objects And Ownership
| Object Family | Created/Managed In | Consumed By |
|---|---|---|
| Prospects, opportunities, bids, proposals | Sales Pipeline, Estimating, Sales Admin | Client Hub onboarding, Reports, Home KPIs |
| Clients, sites, contacts | Client Hub | Work Orders, Schedule/Dispatch, Inventory site assignments, Reports |
| Tasks, services, mappings, scope templates | Service Catalog | Jobs/Work Orders setup, Estimating assumptions, Checklist/form workflows |
| Staff, positions, partners, HR records | Workforce | Schedule/Dispatch assignment, Time & Pay, Compliance |
| Break rules and shift tags | Shift Config | Schedule presentation and Time & Pay policy behavior |
| Work tickets, assignments, routes | Work Orders + Dispatch + Staff Schedule | Field Tools, Time & Pay, Reports |
| Time entries, exceptions, timesheets, payroll | Time & Pay (+ Field Tools time alerts) | Reports (workforce/financial), manager approvals |
| Supplies, kits, site assignments, stock counts | Inventory | Procurement forecasts/orders, Home risk cards, Reports inventory |
| Orders, vendors, purchasing signals | Procurement | Inventory replenishment, operations readiness, cost analysis |
| Equipment, key inventory, vehicles, maintenance | Assets | Dispatch readiness, Compliance incidents, Home operational risk |
| Certifications, training, incidents, expiry calendar | Compliance | Home compliance alerts, staffing risk decisions, Reports quality/compliance |
| System lookups/rules/geofences/sequences/import | Settings | All modules (status transitions, data integrity, route/time constraints) |

## Module Reference

### 1) Home
| Field | Details |
|---|---|
| What it is for | Role-specific landing and operational command center. |
| Who uses it | All roles; UI branches by role in `/home`: OWNER_ADMIN -> Owner Dashboard, MANAGER -> Daily Planning Board, SUPERVISOR -> Supervisor Route View, CLEANER/INSPECTOR -> Staff Home. |
| Key screens/tabs | `/home` with `owner-overview.tsx`, `command-center.tsx`, `supervisor-route-view.tsx`, `staff-home.tsx`, and `dashboard-home.tsx`. |
| Core actions | Refresh KPI snapshots, run quick actions, review alerts/widgets, clock in/out from Staff Home. |
| Upstream dependencies | Pulls clients/sites/jobs/tickets/staff/pipeline/compliance/inventory/time metrics. |
| Downstream effects | Starts daily routing to other modules; supervisor/staff paths write route/time activity. |

### 2) Staff Schedule
| Field | Details |
|---|---|
| What it is for | Build and publish recurring staffing plans. |
| Who uses it | Primarily OWNER_ADMIN, MANAGER, SUPERVISOR; My Schedule supports individual staff workflows. |
| Key screens/tabs | `/schedule?tab=recurring`, `leave`, `availability`, `my-schedule`. |
| Core actions | Create/edit shifts, copy prior week, save/load templates, auto-fill, publish schedule, apply schedule filters. |
| Upstream dependencies | Staff directory/positions, sites/clients, leave requests, availability rules. |
| Downstream effects | Produces/updates ticket coverage and conflicts feeding Dispatch, Work Orders, Time & Pay. |

### 3) Dispatch
| Field | Details |
|---|---|
| What it is for | Day-of and route-level assignment execution. |
| Who uses it | OWNER_ADMIN, MANAGER, SUPERVISOR; floater/route views include CLEANER role paths; Tonight Board is role and feature-flag gated. |
| Key screens/tabs | `/schedule?tab=planning`, `master`, `floater`, `supervisor`; plus `/shifts-time`. |
| Core actions | Assign/reassign tickets, monitor board states, navigate route ownership views, trigger planning quick-create. |
| Upstream dependencies | Work tickets, schedule publish outputs, staff availability, route/site/job data. |
| Downstream effects | Updates assignment and route execution context used by field teams and time capture. |

### 4) Work Orders
| Field | Details |
|---|---|
| What it is for | Track project and recurring work tickets with schedule/calendar views. |
| Who uses it | Operations managers, dispatchers, supervisors (**needs verification** for full role matrix). |
| Key screens/tabs | `/schedule?tab=work-orders`, `/schedule?tab=calendar`, `/schedule/work-orders/work-order-detail?ticket=...`. |
| Core actions | Create work order, inspect ticket detail, complete work order, inspect calendar load. |
| Upstream dependencies | Client/site records, service plans (`site_jobs`), staffing availability. |
| Downstream effects | Feeds Dispatch boards, Field Tools checklists/forms, and Time & Pay workloads. |

### 5) Field Tools
| Field | Details |
|---|---|
| What it is for | Field execution support: shift checklists, request forms, and time-alert triage. |
| Who uses it | Checklist admin: OWNER_ADMIN/MANAGER/SUPERVISOR; shift checklist runners: SUPERVISOR/CLEANER/INSPECTOR; time-alert reviewers (**needs verification** exact role mix). |
| Key screens/tabs | `/schedule?tab=checklists`, `/schedule?tab=forms`, `/jobs?tab=time`. |
| Core actions | Run checklist workflows, submit field requests, process time exception alerts. |
| Upstream dependencies | Work tickets/assignments, checklist templates/items, alert streams. |
| Downstream effects | Creates manager actions (requests/exceptions), affects payroll review and operations response. |

### 6) Client Hub
| Field | Details |
|---|---|
| What it is for | Customer account console for clients, sites, contacts, and change requests. |
| Who uses it | Sales and operations managers; quick-create flows support fast data entry. |
| Key screens/tabs | `/clients?tab=clients|sites|contacts|requests`, plus detail routes under `/clients/...`. |
| Core actions | Add client/site/contact, search directory objects, review request alerts. |
| Upstream dependencies | Sales handoff from pipeline/proposals (**needs verification** automation level). |
| Downstream effects | Supplies core account/site graph for Work Orders, Schedule, Inventory assignments, and reporting. |

### 7) Sales Pipeline
| Field | Details |
|---|---|
| What it is for | Lead-to-proposal pipeline management. |
| Who uses it | Sales and leadership roles; quick-create is wired globally from command palette/sidebar. |
| Key screens/tabs | `/pipeline?tab=prospects|opportunities|bids|proposals|analytics`. |
| Core actions | Create prospects/opportunities, run bid wizard/express bid, manage proposals and follow-ups, review funnel analytics. |
| Upstream dependencies | Sales Admin defaults, estimating inputs, client/site context where linked. |
| Downstream effects | Drives proposal/win funnel and downstream client/service onboarding (**needs verification** conversion automation path). |

### 8) Estimating
| Field | Details |
|---|---|
| What it is for | Price labor/scope and supply models for Anderson cleaning bids. |
| Who uses it | Sales and pricing managers. |
| Key screens/tabs | `/pipeline/calculator` (Standalone Sales Calculator), `/pipeline/supply-calculator` (4-step wizard). |
| Core actions | Select service type and pricing method, tune inputs, save local drafts, run Quick Quote (loads `ANDERSON_ANCHOR_SKUS`), export estimate/quote payloads. |
| Upstream dependencies | CleanFlow engine, service configs, supply catalog data. |
| Downstream effects | Provides pricing assumptions for bids/proposals and supply quoting decisions. |

### 9) Sales Admin
| Field | Details |
|---|---|
| What it is for | Configure sales-side pricing and proposal communication assets. |
| Who uses it | Sales operations/admin roles. |
| Key screens/tabs | `/pipeline/admin?tab=rates|followups|inserts`. |
| Core actions | Maintain production rates, follow-up templates, and marketing inserts. |
| Upstream dependencies | None (configuration origin module). |
| Downstream effects | Affects pipeline pricing behaviors and proposal follow-up operations. |

### 10) Workforce
| Field | Details |
|---|---|
| What it is for | People operations hub (staff, positions, HR, partners, messages). |
| Who uses it | Managers and supervisors; some features role-gated in component logic. |
| Key screens/tabs | `/team?tab=staff|positions|subcontractors|hr|messages`. |
| Core actions | Add/manage staff, maintain roles/positions, track HR items, manage partner records, send team messages. |
| Upstream dependencies | Hiring/role governance and organization policies (**needs verification** if external HR sync exists). |
| Downstream effects | Determines assignment pools for Schedule/Dispatch and eligibility for Compliance and Time & Pay workflows. |

### 11) Time & Pay
| Field | Details |
|---|---|
| What it is for | Attendance capture, timesheet processing, and payroll prep. |
| Who uses it | Managers/supervisors/payroll operators; microfiber payout visibility is role-gated. |
| Key screens/tabs | `/team?tab=attendance|timesheets|payroll|microfiber`, with attendance/payroll sub-tabs in page UI. |
| Core actions | Add clock events, manage time sheets, review payroll hour summaries, export microfiber payouts. |
| Upstream dependencies | Dispatch assignments, route execution, clock-in activity, time exceptions. |
| Downstream effects | Feeds payroll and workforce/financial reporting; informs Field Tools alerts. |

### 12) Shift Config
| Field | Details |
|---|---|
| What it is for | Shift policy and visual tagging controls. |
| Who uses it | Managers/supervisors/admins. |
| Key screens/tabs | `/team?tab=break-rules|shift-tags`. |
| Core actions | Define paid/unpaid break rules and maintain shift tags/colors. |
| Upstream dependencies | Workforce staff/position definitions. |
| Downstream effects | Influences schedule readability and time-policy behavior. |

### 13) Inventory
| Field | Details |
|---|---|
| What it is for | Operational stock control by catalog, kits, site assignment, counts, and warehouse view. |
| Who uses it | Inventory leads and operations managers. |
| Key screens/tabs | `/inventory?tab=supplies|kits|site-assignments|counts|warehouse`. |
| Core actions | Create supplies/kits/counts, assign site par levels, monitor warehouse movements and requests. |
| Upstream dependencies | Client sites, field usage patterns, service delivery scope. |
| Downstream effects | Drives below-par alerts, procurement demand, and inventory reporting. |

### 14) Procurement
| Field | Details |
|---|---|
| What it is for | Ordering and vendor planning layer over inventory demand. |
| Who uses it | Inventory/procurement managers. |
| Key screens/tabs | `/inventory?tab=orders|forecasting|vendors` (legacy `/vendors` redirects here). |
| Core actions | Create/manage purchase orders, review forecasting, maintain vendor directory. |
| Upstream dependencies | Counts, site assignments, supply catalog status, warehouse signals. |
| Downstream effects | Replenishes inventory and impacts operations readiness/cost reporting. |

### 15) Assets
| Field | Details |
|---|---|
| What it is for | Equipment, assignment, key, vehicle, and maintenance lifecycle tracking. |
| Who uses it | Operations, fleet, and supervisors. |
| Key screens/tabs | `/equipment?tab=equipment|assignments|keys|vehicles|maintenance` (legacy `/assets` redirects). |
| Core actions | Add/manage assets, assign gear, track keys, track vehicle maintenance windows. |
| Upstream dependencies | Workforce roster, site coverage, route requirements. |
| Downstream effects | Affects dispatch readiness, compliance incident context, and operational risk KPIs. |

### 16) Compliance
| Field | Details |
|---|---|
| What it is for | Certification/training/incidents governance and expiry tracking. |
| Who uses it | Compliance leads, managers, supervisors. |
| Key screens/tabs | `/safety?tab=certifications|training|incidents|calendar`. |
| Core actions | Create certifications/courses, track completions/docs, log incidents, review expiration calendar. |
| Upstream dependencies | Workforce staff records and field incident signals. |
| Downstream effects | Drives compliance alerts in Home and quality/compliance views in Reports. |

### 17) Reports
| Field | Details |
|---|---|
| What it is for | Cross-domain analytics for operational, financial, and quality decisions. |
| Who uses it | Owner/admin/manager leadership. |
| Key screens/tabs | `/reports?tab=overview|ops|sales|financial|quality|workforce|inventory|schedule` with `range` filters (7/30/90/365 days). |
| Core actions | Switch dashboard domain, change date range, refresh snapshots. |
| Upstream dependencies | Aggregates tickets, pipeline, revenue, inspections, staffing, supplies, and more. |
| Downstream effects | Decision support for scheduling, sales, staffing, procurement, and risk response. |

### 18) Service Catalog
| Field | Details |
|---|---|
| What it is for | Define reusable service model: tasks, services, mappings, and scope templates. |
| Who uses it | Operations designers, implementation leads, estimating support. |
| Key screens/tabs | `/catalog?tab=tasks|services|mapping|scope-library` (legacy `/services` redirects). |
| Core actions | Create tasks/services, maintain service-task mappings, browse scope library. |
| Upstream dependencies | Standards/policy definitions from operations (**needs verification** external source). |
| Downstream effects | Feeds service plan setup, scope consistency, and estimating assumptions. |

### 19) Settings
| Field | Details |
|---|---|
| What it is for | System configuration and data governance controls. |
| Who uses it | Admin/owner/manager roles. |
| Key screens/tabs | `/settings?tab=general|lookups|geofences|rules|data-hub|sequences|import|schedule-settings|time-clock-settings` (legacy `/admin` redirects). |
| Core actions | Manage lookups, geofences, transition rules, sequences, imports, schedule/time-clock settings. |
| Upstream dependencies | None (platform control plane). |
| Downstream effects | Shapes behavior in every module via validation, status transitions, geofence controls, and identifiers. |

### 20) Quick Action / Search
| Field | Details |
|---|---|
| What it is for | Global acceleration layer for navigation and record creation. |
| Who uses it | All dashboard users. |
| Key screens/tabs | Header command palette (`Cmd/Ctrl+K`), sidebar Search trigger + Quick Action FAB, Home quick-actions card. |
| Core actions | Trigger quick-create routes (`create-client`, `create-site`, `create-job`, `create-prospect`, inspection/work-order shortcuts), run "Go To" shortcuts, and dynamic search across clients/sites/prospects/bids/staff. |
| Upstream dependencies | Depends on module route conventions and searchable entities. |
| Downstream effects | Dispatches `gleamops:quick-create` events and opens module-specific forms/workflows with `action=` query params. |

## Explicit Cross-Module Chains
1. **Sales to Service Delivery**
   - `Sales Pipeline` (`/pipeline`) -> `Estimating` (`/pipeline/calculator`, `/pipeline/supply-calculator`) -> `Sales Admin` (`/pipeline/admin`) -> `Client Hub` (`/clients`) -> `Work Orders` (`/schedule?tab=work-orders`) -> `Dispatch` (`/schedule?tab=planning`) -> `Time & Pay` (`/team?tab=timesheets`)
   - Data chain: `sales_prospects/opportunities/bids/proposals` -> `clients/sites` -> `work_tickets/ticket_assignments` -> `time_entries/timesheets`.

2. **Client Setup to Field Execution**
   - `Client Hub` (`/clients`) -> `Service Catalog` (`/catalog`) -> `Workforce` (`/team`) -> `Staff Schedule` (`/schedule?tab=recurring`) -> `Field Tools` (`/schedule?tab=checklists|forms`).
   - Data chain: `clients/sites/contacts` + `tasks/services/service_tasks` + `staff/positions` -> scheduled tickets -> checklist/forms execution.

3. **Inventory to Procurement to Operations**
   - `Inventory` (`/inventory?tab=supplies|site-assignments|counts`) -> `Procurement` (`/inventory?tab=orders|forecasting|vendors`) -> `Assets` (`/equipment`) -> `Dispatch/Work Orders` (`/schedule?...`).
   - Data chain: par-level and count deltas -> orders/vendors -> available gear/materials -> field readiness.

4. **Compliance Feedback Loop**
   - `Workforce` (`/team?tab=staff|hr`) -> `Compliance` (`/safety`) -> `Home` (`/home` compliance alerts) -> `Reports` (`/reports?tab=quality|workforce`).
   - Data chain: staff credentials/training/incidents -> alerting and KPI visibility -> management intervention and reporting.

## How To Onboard A New Manager
1. Confirm role access and landing behavior on `/home` (manager should see Daily Planning Board).
2. Configure baseline controls in `Settings` (`/settings`): lookups, geofences, rules, sequences, schedule/time-clock settings.
3. Validate people model in `Workforce` + `Shift Config` (`/team?tab=staff|positions|break-rules|shift-tags`).
4. Load/verify customer graph in `Client Hub` (`/clients?tab=clients|sites|contacts`).
5. Confirm service definitions in `Service Catalog` (`/catalog`).
6. Validate stock and vendor baseline in `Inventory` + `Procurement` (`/inventory?...`).
7. Validate operational assets in `Assets` (`/equipment?...`).
8. Run one full scheduling cycle in `Staff Schedule` -> `Dispatch` -> `Work Orders`.
9. Confirm time capture and payroll visibility in `Time & Pay` (`/team?tab=attendance|timesheets|payroll`).
10. Close onboarding by checking `Compliance` and `Reports` dashboards for initial data health.

## Daily Operating Checklist (Manager)
1. Start on `Home` (`/home`): review Executive Overview, Sales Pipeline, Operational Risk, and Compliance blocks.
2. Open `Staff Schedule` (`/schedule?tab=recurring`): review coverage gaps, open shifts, and leave/availability conflicts.
3. Move to `Dispatch` (`/schedule?tab=planning` and `master`): confirm assignment completeness and route readiness.
4. Review `Work Orders` (`/schedule?tab=work-orders`): ensure high-priority tickets are staffed and start windows are valid.
5. Check `Field Tools` (`/schedule?tab=forms|checklists`, `/jobs?tab=time`): clear urgent requests and time exceptions.
6. Check `Time & Pay` (`/team?tab=attendance|timesheets`): validate clock-ins, pending approvals, and exceptions.
7. Check `Inventory` + `Procurement` (`/inventory?tab=supplies|orders|forecasting`): resolve below-par and pending order risks.
8. Check `Compliance` (`/safety?tab=calendar|incidents`): handle upcoming expirations or incidents.
9. End-of-day review in `Reports` (`/reports`): snapshot ops/sales/workforce status for next-day planning.
10. Use `Quick Action/Search` (`Cmd/Ctrl+K`) throughout to reduce context switching and trigger standard create flows.

## Legacy Route Aliases (Implemented)
- `/crm` -> `/clients`
- `/workforce` -> `/team`
- `/assets` -> `/equipment`
- `/admin` -> `/settings`
- `/services` -> `/catalog?tab=services`
- `/vendors` -> `/inventory?tab=vendors`
- `/schedule/work-orders` -> `/schedule?tab=work-orders`

## Needs Verification
- The exact automation path from "Won Proposal" to "Client/Site/Service Plan" creation is not explicit in the reviewed dashboard route files.
- Full role authorization matrix for every tab is partly enforced by backend/RLS and not fully visible at route level.
- Persistence behavior of some estimator outputs (beyond local draft + export actions) is not fully explicit in the reviewed UI files.
