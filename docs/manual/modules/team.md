# Team

> Manage your workforce: staff, positions, attendance, payroll, and HR.

**Route:** `/team`
**Sidebar icon:** Users
**Accent color:** Indigo (#6366f1)
**Default tab:** Staff

---

## What This Module Is

The Team module is the workforce hub.
It manages everyone who works for your company.

**Staff** are your employees and contractors.
**Positions** define job roles and pay rates.
**Attendance** tracks who showed up.
**Timesheets** summarize hours worked.
**Payroll** prepares data for export.
**HR** handles employee documents and compliance.

Staff members have codes (STF-NNNN) and flow through statuses:
DRAFT → ACTIVE → ON_LEAVE → INACTIVE → TERMINATED.

## When to Use It

- Add a new staff member
- Create or edit position types
- Track attendance and time off
- Review and approve timesheets
- Prepare payroll exports
- Manage HR documents
- Track microfiber inventory per staff
- Manage subcontractor relationships
- Send messages to staff

---

## Quick Win

1. Click **Team** in the sidebar.
2. You are on the **Staff** tab.
3. See all staff with name, code, position, status, and contact info.
4. Click any row to open the staff detail page.
5. Click **+ New Staff** to add a team member.

---

## Common Tasks

### Add a New Staff Member

1. Go to **Team** > **Staff** tab.
2. Click **+ New Staff** (top right).
3. Enter **First Name** and **Last Name** (required).
4. The **Staff Code** is auto-generated (STF-NNNN).
5. Set the **Position** from the dropdown.
6. Set the **Employment Type** (Full-Time, Part-Time, Contractor).
7. Add phone, email, and address.
8. Status starts as DRAFT.
9. Click **Save**.

**Expected result:** Staff member appears in the list with code STF-NNNN and status DRAFT.

> **Stop Point:** Staff is created as DRAFT. Set to ACTIVE when they start work.

### Activate a Staff Member

1. Open the staff detail page.
2. Click **Activate** or change status to ACTIVE.
3. Confirm.

**Expected result:** Status badge changes to ACTIVE. They can now be assigned to shifts and jobs.

### Create a Position Type

1. Go to **Team** > **Positions** tab.
2. Click **+ New Position**.
3. Enter the **Position Name** (required).
4. Set the **Pay Rate** and pay type (Hourly, Salary).
5. Set the **Color** for schedule display.
6. Click **Save**.

**Expected result:** Position type is available for staff assignment and schedule display.

### Submit a Time-Off Request

1. Go to **Team** > **HR** tab (or use Schedule > Leave).
2. Click **+ Request Time Off**.
3. Select the **Staff Member** (or auto-filled if self-service).
4. Set **Start Date** and **End Date**.
5. Select the **Leave Type** (Vacation, Sick, Personal, etc.).
6. Add a reason.
7. Click **Submit**.

**Expected result:** Time-off request appears with PENDING status. Manager reviews and approves.

### Add a Subcontractor

1. Go to **Team** > **Subcontractors** tab.
2. Click **+ New Subcontractor**.
3. Enter company name, contact info, and services offered.
4. Click **Save**.

**Expected result:** Subcontractor appears in the list and can be assigned to jobs.

---

## Screens & Views (11+ Tabs)

### Staff (`?tab=staff`)

The main staff directory. Shows:
- Staff code (STF-NNNN), name, position, status, phone, email
- **Status filter chips:** DRAFT, ACTIVE, ON_LEAVE, INACTIVE, TERMINATED, All
- **Card view:** Avatar circle with photo or initials

Click any row to open `/team/staff/[code]`.

### Positions (`?tab=positions`)

Position types and pay rates. Shows:
- Position name, code, pay rate, pay type, color
- **Card view** available

Click any row to open `/team/positions/[code]`.

### Attendance (`?tab=attendance`)

Daily attendance tracking with 6 sub-tabs:
- **Overview** — Time entries table (default sub-tab)
- **Add Clock Time** — Manual time entry form for missed punches
- **Manage Time Sheets** — Timesheet approval/rejection
- **Clocked In List** — Real-time list of staff currently clocked in
- **Time Clock Locations** — Geofence CRUD for clock-in boundaries
- **Auto-approval Rules** — Time policies for auto-approval and clock-in restrictions

### Timesheets (`?tab=timesheets`)

Weekly/bi-weekly timesheet summaries. Shows:
- Staff name, period, regular hours, overtime, total hours, approval status

### Payroll (`?tab=payroll`)

Payroll export preparation with 4 sub-tabs:
- **Scheduled Hours** — Projected hours from schedule
- **Confirmed Hours** — Actual hours from time entries
- **Confirmed Time Sheets** — Approved timesheets ready for export
- **Payroll Settings** — Pay period config and export format

### HR (`?tab=hr`)

Human resources management. Shows:
- Employee documents, certifications, time-off requests
- Compliance tracking

### Microfiber (`?tab=microfiber`)

Microfiber towel tracking per staff member.
Inventory of cloths assigned to each worker.

### Partners (`?tab=subcontractors`)

Subcontractor/partner directory. Shows:
- Company name, contact, services, status
- Detail pages at `/vendors/subcontractors/[code]`

### Break Rules (`?tab=break-rules`)

Break policy configuration per position or site.

### Shift Tags (`?tab=shift-tags`)

Tag definitions for categorizing shift types (e.g., day, night, emergency).

### Messages (`?tab=messages`)

Staff messaging hub.
Send and receive messages within the team.
Feature-flagged (may not be visible in all environments).

---

## Detail Pages

### Staff Detail (`/team/staff/[code]`)

- **Back link:** "Back to Team"
- **Header:** Avatar circle (photo or initials) + name + STF code badge + status badge
- **ProfileCompletenessCard:** Tracks filled fields
- **Stat cards:** Total hours this period, assigned shifts, attendance rate, positions held
- **Sections:** Personal Info, Employment Info, Contact Info, Emergency Contact, Documents
- **Actions:** Edit (opens staff-form), Activate/Deactivate, Terminate
- **ActivityHistorySection:** Audit trail
- **Metadata footer:** Created / Updated dates

### Employee Detail (`/team/employees/[code]`)

Extended employee view with additional HR-specific fields.
Same layout as staff detail with extra sections.

### Position Detail (`/team/positions/[code]`)

- **Back link:** "Back to Team"
- **Header:** Position name + code badge + color indicator
- **Sections:** Position Info, Pay Rate, Assigned Staff list

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Staff** | Staff tab, top right | Opens staff-form | Owner, Manager |
| **+ New Position** | Positions tab, top right | Opens position-form | Owner, Manager |
| **+ New Subcontractor** | Subcontractors tab | Opens subcontractor-form | Owner, Manager |
| **+ Request Time Off** | HR tab | Opens time-off-request-form | All (self-service) |
| **Activate** | Staff detail | Changes status to ACTIVE | Owner, Manager |
| **Deactivate** | Staff detail | Changes status to INACTIVE | Owner, Manager |
| **Terminate** | Staff detail | Changes status to TERMINATED | Owner |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | Manager+ |

---

## Forms

### Staff Form (`staff-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| First Name | Text | Yes | Employee first name |
| Last Name | Text | Yes | Employee last name |
| Staff Code | Text | Auto | Auto-generated STF-NNNN |
| Position | Select | No | Job position |
| Employment Type | Select | No | Full-Time, Part-Time, Contractor |
| Status | Select | No | DRAFT, ACTIVE, ON_LEAVE, INACTIVE, TERMINATED |
| Phone | Text | No | Contact phone |
| Email | Text | No | Contact email |
| Address | Text | No | Home address |
| Start Date | Date | No | Employment start date |
| Emergency Contact | Text | No | Emergency contact info |

### Position Form (`position-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Position Name | Text | Yes | Name of the position |
| Pay Rate | Number | No | Hourly or salary rate |
| Pay Type | Select | No | Hourly, Salary |
| Color | Color picker | No | Display color on schedule |
| Description | Textarea | No | Position responsibilities |

### Subcontractor Form (`subcontractor-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes | Subcontractor company |
| Contact Name | Text | No | Primary contact |
| Phone | Text | No | Contact phone |
| Email | Text | No | Contact email |
| Services | Textarea | No | Services they provide |

### Time-Off Request Form (`time-off-request-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Staff Member | Select | Yes | Who is requesting (auto-filled for self-service) |
| Start Date | Date | Yes | First day off |
| End Date | Date | Yes | Last day off |
| Leave Type | Select | Yes | Vacation, Sick, Personal, etc. |
| Reason | Textarea | No | Why they need time off |

---

## Staff Status Flow

```
DRAFT → ACTIVE
ACTIVE → ON_LEAVE → ACTIVE (return from leave)
ACTIVE → INACTIVE
ACTIVE → TERMINATED
ON_LEAVE → TERMINATED
INACTIVE → ACTIVE (re-hire)
INACTIVE → TERMINATED
```

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No staff | Empty state: "No staff members yet" | Click **+ New Staff** |
| No positions | Empty state: "No positions defined" | Click **+ New Position** |
| No timesheets | Empty state: "No timesheets for this period" | Staff need clock-in data first |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load team data" | Refresh the page and try again |

---

## Troubleshooting

> **If** a staff member cannot be assigned to shifts → Check their status is ACTIVE.

> **If** you cannot find a staff member → Check the status filter. Default is ACTIVE.

> **If** the staff code is missing → Codes auto-generate (STF-NNNN) on save.

> **If** timesheets show zero hours → Check that time entries exist in Shifts & Time.

> **If** payroll export is empty → Verify the pay period has approved timesheets.

> **If** you cannot access HR or Payroll tabs → These may be restricted to Manager+ roles.

---

## Related Modules

- [Schedule](./schedule.md) — Staff assigned to shifts
- [Jobs](./jobs.md) — Staff assigned to service plans
- [Shifts & Time](./shifts-time.md) — Clock in/out and time tracking
- [Safety](./safety.md) — Staff certifications and training
- [Vendors](./vendors.md) — Subcontractor details
