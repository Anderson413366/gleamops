# Catalog

> Define the tasks and services your company offers.

**Route:** `/catalog`
**Sidebar icon:** BookOpen
**Accent color:** Cyan (#06b6d4)
**Default tab:** Tasks

---

## What This Module Is

The Catalog module is the reference library for what your company does.
It defines two things: **tasks** and **services**.

A **task** is a specific cleaning activity. Example: "Vacuum carpet" or "Sanitize restroom."
A **service** is a bundle of tasks sold as a package. Example: "Nightly Office Cleaning."

Tasks have production rates. These rates feed into CleanFlow for bid calculations.
Services group tasks together for pricing and scheduling.

This module also has **mapping** (linking tasks to services) and a **scope library** (reusable scope definitions).

## When to Use It

- Add a new cleaning task to the catalog
- Add a new service package
- Map tasks to services
- Set production rates for tasks
- Build reusable scope definitions
- Look up task or service codes

---

## Quick Win

1. Click **Catalog** in the sidebar.
2. You are on the **Tasks** tab.
3. See all tasks with codes, names, and production rates.
4. Click any row to see task details.
5. Click **+ New Task** to add a task.

---

## Common Tasks

### Add a New Task

1. Go to **Catalog** > **Tasks** tab.
2. Click **+ New Task** (top right).
3. Enter the **Task Name** (required).
4. The **Task Code** is auto-generated (TSK-NNN).
5. Set the **Production Rate** (square feet per hour, or units per hour).
6. Set the **Difficulty Multiplier** if applicable.
7. Add a description.
8. Click **Save**.

**Expected result:** Task appears in the list with code TSK-NNN.

> **Stop Point:** Task is created. You can map it to services next.

### Add a New Service

1. Go to **Catalog** > **Services** tab.
2. Click **+ New Service** (top right).
3. Enter the **Service Name** (required).
4. The **Service Code** is auto-generated (SER-NNNN).
5. Select which tasks are included.
6. Set pricing details.
7. Click **Save**.

**Expected result:** Service appears in the list with code SER-NNNN.

### Map Tasks to Services

1. Go to **Catalog** > **Mapping** tab.
2. See the matrix of tasks and services.
3. Toggle which tasks belong to which services.

**Expected result:** The mapping updates. Bids and jobs reference these mappings.

### Update Production Rates

1. Open a task detail page (click a task row).
2. Edit the **Production Rate** field.
3. Save.

**Expected result:** CleanFlow will use the new rate for future bid calculations.

---

## Screens & Views (4 Tabs)

### Tasks (`?tab=tasks`)

All cleaning tasks in the catalog. Shows:
- Task code (TSK-NNN), name, production rate, difficulty, description
- Search by name or code
- **Card view** available

Click any row to open the task detail page.

### Services (`?tab=services`)

All service packages. Shows:
- Service code (SER-NNNN), name, included tasks count, pricing
- Search by name or code

Click any row to see service details.

### Mapping (`?tab=mapping`)

Task-to-service mapping matrix.
Visual grid showing which tasks belong to which services.

### Scope Library (`?tab=scope-library`)

Reusable scope definitions.
Pre-built scope templates for common building types and cleaning requirements.

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Task** | Tasks tab, top right | Opens task-form | Owner, Manager |
| **+ New Service** | Services tab, top right | Opens service-form | Owner, Manager |
| View toggle (List/Card) | Top right | Switches view mode | All |
| **Export** | Top right area | Downloads CSV | All |
| **Edit** | Detail page | Opens the entity form for editing | Owner, Manager |

---

## Forms

### Task Form (`task-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Task Name | Text | Yes | Name of the cleaning task |
| Task Code | Text | Auto | Auto-generated TSK-NNN |
| Production Rate | Number | No | Square feet per hour (or units per hour) |
| Difficulty Multiplier | Number | No | Adjustment factor for harder tasks |
| Description | Textarea | No | What this task involves |
| Category | Select | No | Task category grouping |

### Service Form (`service-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Service Name | Text | Yes | Name of the service package |
| Service Code | Text | Auto | Auto-generated SER-NNNN |
| Description | Textarea | No | What this service includes |
| Included Tasks | Multi-select | No | Which tasks are part of this service |
| Pricing | Number | No | Base pricing information |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No tasks | Empty state: "No tasks in the catalog" | Click **+ New Task** |
| No services | Empty state: "No services defined" | Click **+ New Service** |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load catalog" | Refresh the page and try again |

---

## Troubleshooting

> **If** bid calculations show zero hours → Check the task has a production rate set in the catalog.

> **If** a task code is missing → Codes are auto-generated (TSK-NNN). They appear after saving.

> **If** you cannot find a task → Use the search bar. Check if it exists under a different name.

> **If** mapping changes don't affect existing bids → Mapping changes apply to new bids only. Existing bids keep their original task selections.

> **If** production rates seem wrong → Verify the rate unit. Rates are typically in square feet per hour.

---

## Related Modules

- [Pipeline](./pipeline.md) — Bids use tasks and production rates from the catalog
- [Jobs](./jobs.md) — Service plans reference services from the catalog
- [Settings](./settings.md) — Lookup values that feed into task categories
