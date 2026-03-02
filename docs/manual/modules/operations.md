# Operations (Legacy)

> Complaints, periodic tasks, task catalog, and alerts.

**Route:** `/operations`
**Sidebar icon:** Not in sidebar NAV_TREE (legacy route)
**Accent color:** Fuchsia (#d946ef)
**Default tab:** Complaints

---

## What This Module Is

The Operations module is a **legacy** route that acts as a redirect layer.

**When the `schedule_liberation` feature flag is enabled** (default), most Operations tabs redirect to their canonical modules:
- `/operations?tab=calendar` → `/schedule?tab=calendar`
- `/operations?tab=tickets` → `/jobs?tab=tickets`
- `/operations?tab=inspections` → `/jobs?tab=inspections`
- `/operations?tab=routes` → `/jobs?tab=routes`
- `/operations?tab=task-catalog` → `/settings?tab=tasks`
- `/operations?tab=geofences` → `/settings?tab=geofences`
- Default → `/jobs`

**Tabs that remain in Operations** (no canonical equivalent):
- **Complaints** — Customer complaint tracking (`/operations?tab=complaints`)
- **Periodic** — Recurring periodic tasks (`/operations?tab=periodic`)
- **Night Bridge** — Overnight shift handoffs (`/operations?tab=night-bridge`)

Detail pages still render at their original paths:
- `/operations/complaints/[code]`, `/operations/periodic/[code]`, `/operations/task-catalog/[id]`

## When to Use It

- File or review a customer complaint
- Manage periodic (recurring) maintenance tasks
- Browse the full task catalog
- Review system alerts

---

## Quick Win

1. Navigate to `/operations` in the URL bar.
2. You are on the **Complaints** tab.
3. See all customer complaints with status, client, site, and date.
4. Click any row to open the complaint detail page.

---

## Common Tasks

### File a Customer Complaint

1. Go to `/operations` > **Complaints** tab.
2. Click **+ New Complaint**.
3. Select the **Client** and **Site**.
4. Set the **Complaint Type** (Quality, Missed Service, Damage, etc.).
5. Describe the issue.
6. Set the **Priority** (Low, Medium, High, Critical).
7. Assign to a staff member for resolution.
8. Click **Save**.

**Expected result:** Complaint appears in the list with an auto-generated code and OPEN status.

> **Stop Point:** Complaint is filed. Assigned staff investigates and resolves.

### Resolve a Complaint

1. Open the complaint detail page.
2. Add resolution notes.
3. Change status to RESOLVED.
4. Confirm.

**Expected result:** Status badge updates to RESOLVED. Client can be notified.

### Create a Periodic Task

1. Go to `/operations` > **Periodic** tab.
2. Click **+ New Periodic Task**.
3. Enter the **Task Name**.
4. Select the **Site**.
5. Set the **Frequency** (Weekly, Monthly, Quarterly, Annually).
6. Set the **Next Due Date**.
7. Add instructions.
8. Click **Save**.

**Expected result:** Periodic task appears in the list. Due date tracking begins.

### Browse the Task Catalog

1. Go to `/operations` > **Task Catalog** tab.
2. See all task definitions in the system.
3. Search by name or code.
4. Click any row to see task details.

Note: The Catalog module (`/catalog`) also provides task management. This tab is the legacy version.

---

## Screens & Views (4 Tabs)

### Complaints (`?tab=complaints`)

Customer complaint tracking. Shows:
- Complaint code, client, site, type, priority, status, date, assigned to
- **Status filter chips:** OPEN, IN_PROGRESS, RESOLVED, CLOSED, All
- **Card view** available

Click any row to open `/operations/complaints/[code]`.

### Periodic (`?tab=periodic`)

Recurring periodic tasks. Shows:
- Task name, code, site, frequency, next due date, last completed, status

Click any row to open `/operations/periodic/[code]`.

### Task Catalog (`?tab=task-catalog`)

Master task catalog. Shows:
- Task code, name, description, category, production rate
- **Card view** available

Click any row to open `/operations/task-catalog/[id]`.

### Alerts (`?tab=alerts`)

System alerts and notifications. Shows:
- Alert type, message, severity, date, status
- Read/unread indicators

---

## Detail Pages

### Complaint Detail (`/operations/complaints/[code]`)

- **Back link:** "Back to Operations"
- **Header:** Complaint code + status badge + priority badge
- **Sections:** Complaint Info, Client/Site, Description, Resolution Notes, Timeline
- **Actions:** Edit (opens complaint-form), Resolve, Close
- **ActivityHistorySection:** Audit trail

### Periodic Task Detail (`/operations/periodic/[code]`)

- **Back link:** "Back to Operations"
- **Header:** Task name + code badge + frequency badge
- **Sections:** Task Info, Site, Schedule, Instructions, Completion History
- **Actions:** Edit (opens periodic-task-form), Mark Complete, Skip

### Task Catalog Detail (`/operations/task-catalog/[id]`)

- **Back link:** "Back to Operations"
- **Header:** Task code + name + category badge
- **Sections:** Task Info, Production Rate, Description, Usage in Services
- **Actions:** Edit

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Complaint** | Complaints tab | Opens complaint-form | Owner, Manager, Supervisor |
| **+ New Periodic Task** | Periodic tab | Opens periodic-task-form | Owner, Manager |
| **Resolve** | Complaint detail | Marks complaint as resolved | Owner, Manager, Supervisor |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | Manager+ |

---

## Forms

### Complaint Form (`complaint-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Client | Select | Yes | Which client |
| Site | Select | Yes | Which site (filtered by client) |
| Complaint Type | Select | Yes | Quality, Missed Service, Damage, etc. |
| Priority | Select | Yes | Low, Medium, High, Critical |
| Description | Textarea | Yes | What happened |
| Assigned To | Select | No | Staff member to investigate |
| Resolution Notes | Textarea | No | How it was resolved (filled on resolution) |

### Periodic Task Form (`periodic-task-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Task Name | Text | Yes | Name of the periodic task |
| Site | Select | Yes | Where the task happens |
| Frequency | Select | Yes | Weekly, Monthly, Quarterly, Annually |
| Next Due Date | Date | Yes | When it is next due |
| Instructions | Textarea | No | How to perform the task |
| Assigned To | Select | No | Who is responsible |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No complaints | Empty state: "No complaints filed" (this is good) | Only create when a complaint arises |
| No periodic tasks | Empty state: "No periodic tasks" | Click **+ New Periodic Task** |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load operations data" | Refresh the page and try again |

---

## Troubleshooting

> **If** you cannot find Operations in the sidebar → It is a legacy route. Navigate to `/operations` directly.

> **If** you are looking for Jobs or Tickets → Those moved to the `/jobs` module.

> **If** you are looking for Staff → That moved to the `/team` module.

> **If** complaint status cannot be changed → Check the status transition rules. Some transitions may be restricted.

> **If** periodic tasks are not generating reminders → Check that the next due date is set correctly.

---

## Related Modules

- [Jobs](./jobs.md) — Canonical module for service plans and tickets (migrated from here)
- [Team](./team.md) — Canonical module for staff (migrated from here)
- [Clients](./clients.md) — Clients and sites referenced in complaints
- [Catalog](./catalog.md) — Canonical task catalog (overlaps with Task Catalog tab here)
