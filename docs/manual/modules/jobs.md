# Jobs

> Manage service plans, work tickets, inspections, time tracking, and routes.

**Route:** `/jobs`
**Sidebar icon:** Briefcase
**Accent color:** Amber (#f59e0b)
**Default tab:** Service Plans

---

## What This Module Is

The Jobs module is where work gets defined and tracked.
A **service plan** (job) is a recurring contract for a client site.
A **work ticket** is a single instance of work for a specific date.

Think of it this way:
- A job says "clean this office every Monday and Wednesday."
- A ticket says "clean this office on Monday, March 2."

Jobs generate tickets. Tickets track actual work done.
Everything connects here: time entries, inspections, checklists, and routes.

## When to Use It

- Create or edit a service plan (recurring job)
- View and manage work tickets
- Log time against a ticket
- Run inspections and quality checks
- Plan daily routes
- Manage checklists for jobs

---

## Quick Win

1. Click **Jobs** in the sidebar.
2. You are on the **Service Plans** tab.
3. See a list of all jobs with status, client, site, and frequency.
4. Click any row to open the job detail page.
5. Click **+ New Job** to create a service plan.

---

## Common Tasks

### Create a Service Plan (Job)

1. Go to **Jobs** > **Service Plans** tab.
2. Click **+ New Job** (top right).
3. Select a **Client** and **Site**.
4. Set the **Frequency** (Daily, Weekly, Bi-Weekly, Monthly, etc.).
5. Set the **Start Date**.
6. Add a description of the work.
7. Click **Save**.

**Expected result:** The job appears in the table with a new code (JOB-YYYY-X).

> **Stop Point:** The job is created. Tickets will be generated based on the schedule.

### View Work Tickets

1. Go to **Jobs** > **Tickets** tab.
2. See all tickets across all jobs.
3. Use status filter chips to narrow by: SCHEDULED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELED.
4. Click any row to open the ticket detail page.

### Log Time on a Ticket

1. Open a ticket detail page.
2. Click **Log Time** or go to the **Time** tab.
3. Fill in the **job-log-form**: staff member, hours, date, notes.
4. Click **Save**.

**Expected result:** The time entry appears on the ticket and in timesheets.

### Change Job Status

1. Open a job detail page.
2. Click the status button or **Edit**.
3. Change status: ACTIVE, ON_HOLD, COMPLETED, or CANCELED.
4. Confirm.

**Expected result:** Status badge updates. Status transitions are enforced by the database.

### Change Ticket Status

1. Open a ticket detail page.
2. Change status: SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED.
3. Or cancel with CANCELED.

**Expected result:** Ticket status updates. The transition is validated.

---

## Screens & Views (7 Tabs)

### Service Plans (`?tab=service-plans`)

The main jobs list. Shows:
- Job code, client, site, frequency, status, start date, assigned staff
- **Status filter chips:** ACTIVE, ON_HOLD, COMPLETED, CANCELED, All
- **Card view** available via View toggle

Click any row to open the job detail page.

### Tickets (`?tab=tickets`)

All work tickets across all jobs. Shows:
- Ticket code, job, site, scheduled date, status, assigned staff
- **Status filter chips:** SCHEDULED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELED, All

Click any row to open the ticket detail page.

### Inspections (`?tab=inspections`)

Quality inspections linked to completed tickets.
Inspection scores, photos, and notes.

### Time (`?tab=time`)

Time entries logged against tickets.
Shows staff member, hours, date, and linked ticket.

### Routes (`?tab=routes`)

Daily route planning.
Group tickets by geographic area or staff assignment.
Route templates for recurring patterns.

### Checklists (`?tab=checklists`)

Checklist templates and completed checklists.
Admin view for creating templates. Shift view for completing them.

### Forms (`?tab=forms`)

Job-related form submissions.
Custom forms attached to jobs or tickets.

---

## Detail Pages

### Job Detail (`/operations/jobs/[id]`)

- **Back link:** "Back to Jobs"
- **Header:** Avatar circle + job description + JOB code badge + status badge
- **ProfileCompletenessCard:** Tracks filled fields
- **Stat cards:** Total tickets, completed tickets, total hours, next scheduled date
- **Sections:** Job Info, Schedule Details, Assigned Staff, Financial Summary
- **Actions:** Edit (opens job-form), Change Status
- **ActivityHistorySection:** Audit trail
- **Metadata footer:** Created / Updated dates

### Ticket Detail (`/operations/tickets/[id]`)

- **Back link:** "Back to Jobs"
- **Header:** Ticket code + status badge + scheduled date
- **Sections:** Ticket Info, Assigned Staff, Time Entries, Checklist, Inspection Results
- **Actions:** Log Time, Complete, Verify

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Job** | Service Plans tab, top right | Opens job-form | Owner, Manager |
| **Log Time** | Ticket detail page | Opens job-log-form | Owner, Manager, Supervisor |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | All |
| **Edit** | Detail page | Opens the job form for editing | Owner, Manager |
| **Complete** | Ticket detail | Moves ticket to COMPLETED | Supervisor+ |
| **Verify** | Ticket detail | Moves ticket to VERIFIED | Manager+ |

---

## Forms

### Job Form (`job-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Client | Select | Yes | Which client company |
| Site | Select | Yes | Which site (filtered by client) |
| Description | Textarea | No | What work is performed |
| Frequency | Select | Yes | Daily, Weekly, Bi-Weekly, Monthly, etc. |
| Start Date | Date | Yes | When the job begins |
| Status | Select | No | ACTIVE, ON_HOLD, COMPLETED, CANCELED |
| Assigned Staff | Multi-select | No | Staff members assigned to this job |

### Job Log Form (`job-log-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Staff Member | Select | Yes | Who did the work |
| Hours | Number | Yes | Time worked |
| Date | Date | Yes | When the work was done |
| Notes | Textarea | No | Additional details |

---

## Status Flows

### Job Status
```
ACTIVE → ON_HOLD → ACTIVE (can resume)
ACTIVE → COMPLETED
ACTIVE → CANCELED
ON_HOLD → CANCELED
```

### Ticket Status
```
SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED
SCHEDULED → CANCELED
IN_PROGRESS → CANCELED
```

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No jobs | Empty state: "No service plans yet" | Click **+ New Job** to create one |
| No tickets | Empty state: "No tickets found" | Jobs generate tickets based on the schedule |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load jobs" | Refresh the page and try again |

---

## Troubleshooting

> **If** no tickets appear for a job → Check the job status is ACTIVE and the start date has passed.

> **If** you cannot log time → Check your role. Supervisor and above can log time.

> **If** a ticket is stuck in SCHEDULED → It needs to be moved to IN_PROGRESS first before completing.

> **If** the job code format looks different → Job codes follow JOB-YYYY-X format (year + letter).

> **If** inspections are empty → Inspections are created after a ticket is completed.

---

## Related Modules

- [Clients](./clients.md) — Client sites where jobs happen
- [Schedule](./schedule.md) — Shifts and scheduling for job work
- [Team](./team.md) — Staff assigned to jobs
- [Catalog](./catalog.md) — Task and service definitions used in jobs
- [Shifts & Time](./shifts-time.md) — Clock in/out for job tickets

---

## QA Fixes (March 2026)

### Tab-Specific KPIs
KPIs are now tab-aware:
- **Time tab:** Open Exceptions (warn), Critical (warn), Warnings, This Week
- **All other tabs:** Tickets Today, Open Tickets, Active Service Plans, Open Alerts
