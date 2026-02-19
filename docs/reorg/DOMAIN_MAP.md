# Domain Map

**Date:** 2026-02-18

---

## Business Domains

GleamOps is a B2B SaaS ERP for commercial cleaning. The data spine is:
**Service DNA -> Bids -> Proposals -> Won -> Contracts -> Tickets -> Time/QA/Inventory/Assets/Safety**

---

## Domain Table

| Domain | Current Locations | Proposed Module Home | Notes |
|--------|-------------------|---------------------|-------|
| **Pipeline** | `(dashboard)/pipeline/`, `api/proposals/` | `modules/proposals/` | Proposals have the most complex API logic (send + rate limit + follow-ups) |
| **CRM** | `(dashboard)/crm/`, `api/sites/` | No module needed | Routes are thin CRUD; site PIN is only complex route |
| **Operations** | `(dashboard)/operations/`, `api/operations/fleet/`, `api/operations/schedule/` | `modules/fleet/`, `modules/schedule/` | Fleet DVIR workflow + schedule period/trade management |
| **Workforce** | `(dashboard)/workforce/`, `api/workforce/`, `api/timekeeping/`, `api/payroll/` | `modules/timekeeping/` | Timekeeping PIN check-in has moderate logic |
| **Inventory** | `(dashboard)/inventory/`, `api/inventory/` | `modules/inventory/` | Approval workflow (394 LOC) is the largest route in the app |
| **Assets** | `(dashboard)/assets/` | No module needed | Pure CRUD, no API routes with business logic |
| **Vendors** | `(dashboard)/vendors/` | No module needed | Pure CRUD |
| **Safety** | `(dashboard)/safety/` | No module needed | Pure CRUD |
| **Messages** | `api/messages/` | `modules/messages/` | Thread creation with multi-entity inserts |
| **Webhooks** | `api/webhooks/sendgrid/` | `modules/webhooks/` | SendGrid event processing (247 LOC) |
| **Public (token-based)** | `api/public/counts/`, `api/public/proposals/` | `modules/counts/` | Inventory count submission with due-date calc + alerts |
| **Finance** | `api/finance/invoices/`, `(dashboard)/money/` | No module needed | Routes are thin CRUD with audit wrapper |
| **Admin** | `(dashboard)/admin/` | No module needed | Config/lookup management, thin routes |
| **Reports** | `(dashboard)/reports/` | No module needed | Read-only dashboards, no API routes |
| **Services** | `(dashboard)/services/` | No module needed | Pure CRUD |

---

## Domains Requiring Modules (by complexity)

Only domains with **business logic in API routes** need module extraction:

| Priority | Domain | Route LOC | Reason |
|----------|--------|-----------|--------|
| 1 | **Inventory** | 394 | Approval workflow state machine, role-based step validation |
| 2 | **Webhooks** | 247 | SendGrid event normalization, status priority, bounce/spam handling |
| 3 | **Counts** | 222 | Next due date calculation, alert status logic, site updates |
| 4 | **Fleet** | 190 | DVIR checklist calculation, vehicle state transitions |
| 5 | **Proposals** | 188 | Rate limiting (10/hr, 3/day), follow-up sequence wiring |
| 6 | **Schedule** | ~300 (across 10 routes) | Period publish, trade approve/deny, availability management |
| 7 | **Messages** | 136 | Thread + member + message multi-insert |
| 8 | **Timekeeping** | 147 | PIN verification + time event creation |

---

## Domains NOT Requiring Modules

These domains have clean, thin routes (<100 LOC, CRUD + audit only):

- Finance/Invoices (82 LOC)
- Payroll/Runs (78 LOC)
- Contracts (thin CRUD)
- Integrations (thin CRUD)
- Workforce/HR (157 LOC — moderate but entity-generic pattern)
- Sites/PIN (105 LOC — moderate)

These can be revisited later if they grow.
