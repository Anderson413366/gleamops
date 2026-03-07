# Department-by-Department SOP

> Use this guide to understand how each business function should use GleamOps.
> This is the functional-ownership companion to the Executive SOP.

---

## How To Use This Guide

For each department, this file covers:

- purpose in the business
- primary modules
- data they own
- routine workflows
- handoffs to other departments
- leading indicators and risks

---

## Department Map

| Department | Primary modules |
| --- | --- |
| Executive Leadership | Home, Reports, Settings |
| Sales | Sales Pipeline, Estimating, Sales Admin, Client Hub |
| Operations Management | Staff Schedule, Dispatch, Work Orders, Field Tools, Client Hub |
| Field Leadership | Dispatch, Work Orders, Field Tools, Shifts & Time, Compliance |
| People Operations | Workforce, Time & Pay, Compliance |
| Warehouse / Procurement | Inventory, Procurement, Assets |
| Quality / Compliance | Compliance, Work Orders, Workforce, Reports |
| Finance / Payroll Support | Time & Pay, Reports, Settings |

---

## 1. Executive Leadership

### Purpose

Executive leadership uses GleamOps to monitor the business, govern system behavior, and make decisions from connected operating data.

### Primary modules

- Home
- Reports
- Settings

### Data they primarily govern

- KPI and reporting standards
- company-level settings
- rules, lookups, sequences, import controls

### Routine workflows

Daily:

- review Home and Reports for operating health

Weekly:

- review trend movement, service quality, staffing health, and execution risk

Monthly:

- review cross-functional performance
- approve system-level changes and governance decisions

### Main handoffs

- receives reporting from all departments
- approves configuration changes that affect all modules

### Risks to monitor

- metrics that leadership no longer trusts
- uncontrolled settings changes
- poor conversion from sales to operations

---

## 2. Sales

### Purpose

Sales uses GleamOps to move prospects from lead to proposal to operational handoff.

### Primary modules

- Sales Pipeline
- Estimating
- Sales Admin
- Client Hub

### Data they own

- prospects
- opportunities
- bids
- proposals
- proposal templates and follow-up assets

### Routine workflows

Daily:

- update opportunities
- progress bids and proposals
- review pipeline movement

Weekly:

- refine pricing and proposal quality
- review stalled deals

At conversion:

- create or confirm client and site records
- ensure operational handoff quality

### Main handoffs

- to Client Hub when work is won
- to Operations Management when a live service relationship begins

### Risks to monitor

- poor bid assumptions
- weak proposal standardization
- incomplete handoff into client and site setup

---

## 3. Operations Management

### Purpose

Operations Management uses GleamOps to convert sold work into planned and executed service delivery.

### Primary modules

- Staff Schedule
- Dispatch
- Work Orders
- Field Tools
- Client Hub

### Data they own

- recurring schedule plans
- planning notes
- day-of dispatch context
- work tickets and routes
- operating exceptions and requests

### Routine workflows

Daily:

- review coverage and dispatch boards
- manage open work and issues
- respond to field exceptions

Weekly:

- build and review schedule quality
- prepare future coverage
- inspect route and ticket health

Monthly:

- review recurring planning quality and service reliability

### Main handoffs

- receives demand from Sales and Client Hub
- hands active work to Field Leadership and field staff
- feeds time, quality, and reporting data downstream

### Risks to monitor

- coverage gaps
- unmanaged day-of changes
- open work orders without clear ownership
- schedule plans that do not match real operating conditions

---

## 4. Field Leadership

### Purpose

Field Leadership uses GleamOps to control execution quality during the workday.

### Primary modules

- Dispatch
- Work Orders
- Field Tools
- Shifts & Time
- Compliance

### Data they own

- route and assignment execution context
- checklist completion
- field requests
- inspection and issue activity
- active time and route state

### Routine workflows

Start of shift:

- review route / work assignment
- confirm staff readiness

During shift:

- monitor work progress
- resolve issues
- ensure time and checklist completion

End of shift:

- confirm work completion
- review unresolved issues
- ensure route and time state are clean

### Main handoffs

- receives plan from Operations Management
- sends execution outcomes into Time & Pay, Compliance, and Reports

### Risks to monitor

- incomplete field context
- missed checklist execution
- poor inspection follow-through
- time not captured at the moment work happens

---

## 5. People Operations

### Purpose

People Operations uses GleamOps to manage workforce records, labor review, and employment-related data.

### Primary modules

- Workforce
- Time & Pay
- Compliance

### Data they own

- staff records
- positions
- HR-related records
- attendance and timesheet review state
- training and certification readiness

### Routine workflows

Daily:

- review exceptions that affect labor or staffing readiness

Weekly:

- review timesheets, attendance, and staff status updates

Monthly:

- support payroll preparation
- review training and certification posture

### Main handoffs

- receives field and schedule data
- supports payroll-facing review
- supports compliance readiness

### Risks to monitor

- stale staff records
- timesheet exceptions
- missing training data
- role mismatches that create access or workflow confusion

---

## 6. Warehouse / Procurement

### Purpose

Warehouse and Procurement use GleamOps to ensure teams have the materials and equipment required to deliver service.

### Primary modules

- Inventory
- Procurement
- Assets

### Data they own

- supplies
- stock counts
- warehouse balances
- purchase orders
- forecasting records
- equipment, keys, vehicles, and maintenance state

### Routine workflows

Daily:

- review stock health and urgent replenishment needs
- track equipment and vehicle readiness

Weekly:

- count, reconcile, and restock
- review purchasing needs and maintenance schedules

Monthly:

- review inventory drift
- review vendor performance and asset health

### Main handoffs

- receives demand signals from Operations
- supports Field Leadership with supplies and assets
- feeds cost and readiness signals into Reports

### Risks to monitor

- stockouts
- weak count discipline
- poor replenishment planning
- assets unavailable at the point of service

---

## 7. Quality / Compliance

### Purpose

Quality and Compliance use GleamOps to reduce risk and maintain service standards.

### Primary modules

- Compliance
- Work Orders
- Workforce
- Reports

### Data they own

- certifications
- training completion
- incidents
- expiration monitoring
- quality inspection outcomes

### Routine workflows

Daily:

- review incidents and unresolved quality issues

Weekly:

- inspect readiness by staff, site, and route

Monthly:

- review training posture
- review incident trends
- review recurring quality signals

### Main handoffs

- receives execution data from field and operations
- sends readiness and risk information to leadership

### Risks to monitor

- expired credentials
- recurring inspection failures
- incidents without resolution trails

---

## 8. Finance / Payroll Support

### Purpose

Finance and payroll-facing leaders use GleamOps to review labor data and consume business performance outputs.

### Primary modules

- Time & Pay
- Reports
- Settings

### Data they own or review

- payroll-facing labor review state
- timesheet outputs
- company-level reporting outputs
- selected configuration inputs

### Routine workflows

Weekly:

- review payroll readiness
- review labor accuracy and anomalies

Monthly:

- review trends in labor, operations, and service cost indicators

### Main handoffs

- receives labor records from field and people operations
- receives performance data from Reports

### Risks to monitor

- late or noisy time capture
- weak timesheet review discipline
- leadership decisions made from incomplete reporting context

---

## Department Handoff Matrix

| From | To | Main handoff |
| --- | --- | --- |
| Sales | Operations Management | won work, scope assumptions, client/site setup quality |
| Operations Management | Field Leadership | day-of plan, route context, open work |
| Field Leadership | People Operations | attendance reality, performance and exception context |
| Field Leadership | Quality / Compliance | inspection results, incidents, service quality signals |
| Operations Management | Warehouse / Procurement | material and asset demand |
| Warehouse / Procurement | Operations and Field Leadership | supply readiness, asset readiness |
| All departments | Executive Leadership | reporting and operating signals |

---

## Department KPI Lens

| Department | Best leading indicators |
| --- | --- |
| Sales | opportunity progression, bid cycle speed, proposal conversion quality |
| Operations Management | schedule stability, open work volume, dispatch exception rate |
| Field Leadership | checklist completion, inspection outcomes, route completion health |
| People Operations | timesheet exception rate, staff readiness, training completion |
| Warehouse / Procurement | stock accuracy, replenishment timeliness, asset readiness |
| Quality / Compliance | incident rate, expiration exposure, recurring quality failures |
| Executive Leadership | cross-module consistency, trend reliability, decision speed |

---

## Best Next Reading

- [Executive SOP](./12-executive-sop.md)
- [Module-by-Module Guide](./11-module-map.md)
- [Roles & Permissions](./02-roles-permissions.md)
