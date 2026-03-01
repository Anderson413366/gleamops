# Terminology Glossary

> Canonical terms for user-facing labels in GleamOps UI.

## Entity Terms

| Canonical Term | Definition | NOT |
|---------------|------------|-----|
| **Staff** | Any person who works for the cleaning company | "Employee" as entity label (acceptable in view names like "Employee Schedule") |
| **Position** | A job title/type (e.g., "Lead Cleaner", "Restroom Specialist") | "Position Type" in UI labels |
| **Client** | A business or person who pays for cleaning services | "Customer" |
| **Site** | A physical location where work is performed | "Location", "Property" |
| **Job** / **Service Plan** | A recurring service agreement for a site | "Contract" (we don't do contracts) |
| **Ticket** / **Work Ticket** | A single scheduled instance of work | "Task" (reserved for catalog) |
| **Prospect** | A potential client not yet in the pipeline | "Lead" |
| **Opportunity** | A qualified prospect with a potential deal | |
| **Bid** | A formal price quote for services | "Estimate", "Quote" |
| **Proposal** | A presentable document sent to the client | |

## Role Labels

From `ROLE_OPTIONS` in `staff-form.tsx`:

| Value | Display Label |
|-------|--------------|
| `OWNER_ADMIN` | Owner / Admin |
| `MANAGER` | Manager |
| `SUPERVISOR` | Supervisor |
| `CLEANER` | Cleaner |
| `INSPECTOR` | Inspector |
| `SALES` | Sales |

## Position Names (Current)

| Position Code | Display Title | Color Token |
|--------------|---------------|-------------|
| (varies) | Light Duty Specialist | green |
| (varies) | Restroom Specialist | red |
| (varies) | Vacuum Specialist | blue |
| (varies) | Utility Specialist | yellow |
| (varies) | Floater | (not set) |
| (varies) | Field Supervisor | (not set) |
| (varies) | Operation Coordinator | (not set) |
| (varies) | Administrative Coordinator | (not set) |

## Acceptable View Names

These use "Employee" but are acceptable as view/section names:

- "Employee Schedule" (schedule tab name)
- "Employee Grid" (schedule grid view)
- "Employee" report category (workforce reports)

## Status Terms

| Entity | Statuses |
|--------|----------|
| Staff | ACTIVE, ON_LEAVE, INACTIVE, TERMINATED |
| Position | Active, Inactive |
| Ticket | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| Job | ACTIVE, ON_HOLD, COMPLETED, CANCELLED |
| Bid | DRAFT, SUBMITTED, WON, LOST |
| Proposal | DRAFT, SENT, VIEWED, ACCEPTED, REJECTED |

## Rules

1. Never use "Specialist" as a generic column header — use "Staff"
2. Position type names containing "Specialist" (e.g., "Floor Specialist") are data values, not UI labels — leave as-is
3. "Employee" is acceptable in view/tab names but not as an entity label
4. Always capitalize status values in badges
5. Use "Not Set" (italic, muted) for missing optional values — never "N/A" or "None"
