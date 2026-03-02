# Roles & Permissions

> Who can do what. Simple rules, no ambiguity.

---

## The 6 Roles

| Role | Display Name | Who This Is |
|------|-------------|-------------|
| `OWNER_ADMIN` | Owner / Admin | Company owner or system administrator |
| `MANAGER` | Manager | Operations manager, office manager |
| `SUPERVISOR` | Supervisor | Field supervisor, team lead |
| `CLEANER` | Cleaner | Field cleaning staff |
| `INSPECTOR` | Inspector | Quality inspection staff |
| `SALES` | Sales | Sales representative, account manager |

---

## What Each Role Can Access

### Full Access Matrix

| Module | Owner/Admin | Manager | Supervisor | Cleaner | Inspector | Sales |
|--------|:-----------:|:-------:|:----------:|:-------:|:---------:|:-----:|
| **Home Dashboard** | Full | Full | Limited | Limited | Limited | Limited |
| **Schedule** | Full | Full | Team only | Own shifts | Own shifts | Read |
| **Jobs** | Full | Full | Assigned | Assigned | Assigned | Read |
| **Clients** | Full | Full | Read | No | No | Full |
| **Pipeline** | Full | Full | No | No | No | Full |
| **Catalog** | Full | Full | Read | Read | Read | Read |
| **Team** | Full | Full | Team only | Own profile | Own profile | No |
| **Inventory** | Full | Full | Site level | Submit counts | No | No |
| **Equipment** | Full | Full | Site level | View assigned | No | No |
| **Safety** | Full | Full | Full | Report only | Full | No |
| **Reports** | Full | Full | Limited | No | Limited | Sales only |
| **Settings** | Full | No | No | No | No | No |
| **Shifts & Time** | Full | Full | Team clock | Own clock | Own clock | No |

---

## Key Permission Rules

### Creating Records
- **Clients, Sites, Contacts:** Owner, Manager, Sales
- **Service Plans (Jobs):** Owner, Manager, Sales
- **Work Tickets:** Owner, Manager, Sales
- **Staff Members:** Owner, Manager
- **Shifts:** Owner, Manager, Supervisor
- **Bids / Proposals:** Owner, Manager, Sales
- **Inventory Orders:** Owner, Manager, Supervisor
- **Equipment:** Owner, Manager

### Editing Records
- Same roles as creation, plus: the assigned staff member can edit their own profile.

### Archiving (Soft Delete)
- **Clients, Staff (TERMINATED):** Owner only
- **Sites, Service Plans (CANCELED):** Owner, Manager
- **Other records:** Owner, Manager

### Status Transitions
Status changes are enforced by the database. Only allowed transitions are:

| Entity | Transition | Allowed Roles |
|--------|-----------|---------------|
| Client | PROSPECT → ACTIVE | Owner, Manager, Sales |
| Client | ACTIVE → CANCELED | Owner only |
| Staff | ACTIVE → TERMINATED | Owner only |
| Staff | ACTIVE → ON_LEAVE | Owner, Manager |
| Ticket | SCHEDULED → IN_PROGRESS | Owner, Manager, Supervisor, Cleaner |
| Ticket | COMPLETED → VERIFIED | Owner, Manager, Inspector |
| Schedule Period | DRAFT → PUBLISHED | Owner, Manager |
| Schedule Period | PUBLISHED → LOCKED | Owner only |

---

## Role-Gated Features

Some features only appear for certain roles:

| Feature | Visible To |
|---------|-----------|
| **Master Board** tab in Schedule | Owner, Manager |
| **Supervisor** tab in Schedule | Supervisor, Manager, Owner |
| **My Route** tab in Schedule | All (shows your own route) |
| **Shifts & Time** module | All (shows own clock; managers see all) |
| **Payroll** tab in Team | Owner, Manager |
| **HR** tab in Team | Owner, Manager |
| **Settings** module | Owner only |
| **Pipeline** module | Owner, Manager, Sales |
| **Checklist Admin** in Schedule | Owner, Manager, Supervisor |
| **Shift Checklist** in Schedule | Supervisor, Cleaner, Inspector |

---

## Troubleshooting Permissions

> **If** you can't see a module **→** Your role doesn't have access. Ask your admin to check your role.

> **If** you can see a module but can't create/edit **→** Your role has read-only access. You need Manager or Owner role to edit.

> **If** a status change fails **→** The transition isn't allowed for your role. Check the status transition table above.

> **If** you can't see another company's data **→** This is by design. Each company's data is completely isolated.
