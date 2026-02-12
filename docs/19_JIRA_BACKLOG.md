# Jira backlog structure (epics + story patterns)

The spreadsheet contains the full backlog in a format you can import to Jira. This doc defines the structure.

## Epics (high-level)

A. Foundation (repo, CI/CD, envs)
B. Auth, RBAC, tenant, audit
C. Design system + app shell
D. CRM core (clients/sites/contacts/files/search)
E. Service DNA (tasks/services/templates)
F. Pipeline (prospects/opportunities/bids v1)
G. CleanFlow calculations (workload + price + explanation)
H. Proposals (PDF generation + archive)
I. Send + tracking + follow-ups
J. Won → service plan conversion
K. Scheduling + dispatch (calendar + list + drag/drop)
L. Checklists + photos
M. Timekeeping + exceptions + approvals
N. Inspections (offline-first) + follow-up tickets
O. Messaging + escalation
P. Dashboards + reporting
Q. Integrations (optional) QuickBooks timesheet sync
R. Hardening + onboarding + imports

## Story template (use this format)
- **User story**
- Acceptance criteria (Given/When/Then)
- RLS/permissions rules
- Data touched (tables)
- API endpoints
- Telemetry/audit events emitted

## Definition of Done
- tests added/updated
- migrations applied cleanly
- OpenAPI updated
- audit events emitted
- UX rules followed (one primary action, progressive disclosure)
