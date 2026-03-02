# Schedule

> Manage who works where and when. The operational heart of GleamOps.

**Route:** `/schedule`
**Sidebar icon:** Calendar
**Accent color:** Emerald (#10b981)
**Default tab:** Employee Schedule

---

## What This Module Is

The Schedule module manages all recurring shifts, work orders, and planning.
It's where managers build the weekly schedule, assign staff, and publish periods.

## When to Use It

- Build and publish the weekly schedule
- Create recurring shifts for employees
- View the weekly calendar
- Plan daily routes
- Manage work orders
- Review staff availability and leave

---

## Quick Win

1. Click **Schedule** in the sidebar.
2. You're on the **Employee Schedule** (grid view).
3. See colored shift blocks for each employee across the week.
4. Click any shift block to edit it.
5. Click **+ New Shift** to create a shift.

---

## Common Tasks

### Create a Recurring Shift

1. Go to **Schedule** > **Employee Schedule**.
2. Click **+ New Shift** (top right).
3. Select a **Site** from the dropdown.
4. Select a **Service Plan** (auto-loads for the site).
5. Set **Start Time** and **End Time**.
6. Select which **days** (Mon-Sun toggle buttons).
7. Click **Create Recurring Shift**.

**Expected result:** Colored shift blocks appear in the grid for each selected day.

> **Stop Point:** Shifts are created. You can assign staff later.

### Edit a Shift

1. Click on any shift block in the grid.
2. The **Edit Shift** form opens (same form as create, pre-filled).
3. Change any field.
4. Click **Update Shift**.

**Expected result:** The grid refreshes with updated shift data.

### Delete a Shift

1. Click on any shift block.
2. In the Edit form, click **Delete Shift** (red button, bottom left).
3. A confirmation dialog appears: "Are you sure?"
4. Click **Delete Shift** to confirm.

**Expected result:** The shift block disappears from the grid.

### Assign Staff to a Shift

1. Click **+ New Shift** or click an existing shift block.
2. In the right panel, use **Search by Employee Name**.
3. Click the **+** icon next to an available staff member.
4. They move to the "Who Is Working" section.
5. Save the shift.

### Publish a Schedule Period

1. Verify all shifts are assigned and correct.
2. Click **Publish Period** (top area, Owner/Manager only).
3. Confirm the action.

**Expected result:** The period status changes from DRAFT to PUBLISHED.

> **Stop Point:** Published schedules are visible to all staff. You can still edit individual shifts.

---

## Screens & Views (12 Tabs)

### Employee Schedule (`?tab=recurring`)

The main grid view. Shows:
- **Rows:** One per staff member (plus "Empty Shifts" row for open shifts)
- **Columns:** One per day of the week
- **Cells:** Colored shift blocks showing site, position, and time
- **Staff column:** Name + assignment count + total hours this period

**View options:**
| View | Toggle | What It Shows |
|------|--------|--------------|
| Grid | Default | Weekly grid with shift blocks |
| List | Toggle button | Table list of all shifts |
| Card | Toggle button | Card grid of shifts |
| Coverage | Toggle button | Required vs assigned staff counts |
| Day | Toggle button | Single-day detailed view |
| Tag | Toggle button | Shifts grouped by tag/category |

**Grid interaction:**
- **Click a shift block** → Opens Edit Shift form
- **Drag a shift block** → Move to a different day or staff member
- **Click empty cell** → Quick-create a shift for that day/staff
- **Hover a shift block** → Shows edit/copy toolbar

### Work Schedule (`?tab=work-orders`)

Work order management. Shows a table of work orders with:
- Status, site, date, type, assigned staff
- Create new work orders
- Click to see work order detail

### Calendar (`?tab=calendar`)

Calendar visualization of all scheduled work. Standard month/week/day views.

### Planning Board (`?tab=planning`)

Drag-and-drop daily/weekly planning interface for managers.

### Master Board (`?tab=master`)

Monday.com-style board view. Visible to Owner/Admin and Manager only.

### My Route (`?tab=floater`)

Your personal route for today. Shows your assigned sites in order.

### Supervisor (`?tab=supervisor`)

Supervisor-level dashboard for team management. Visible to Supervisor+ roles.

### Forms (`?tab=forms`)

Schedule-related form submissions hub.

### Checklists (`?tab=checklists`)

- **Admin view** (Manager+): Manage checklist templates
- **Shift view** (Supervisor/Cleaner): Complete shift checklists

### Leave (`?tab=leave`)

Time-off request management:
- Submit leave requests
- Review and approve/deny (Manager+)

### Availability (`?tab=availability`)

Staff availability rule management:
- Set recurring availability (weekly patterns)
- Set one-off availability exceptions

### My Schedule (`?tab=my-schedule`)

Personal schedule view showing your own assignments.

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Shift** | Top of Employee Schedule | Opens create shift form | Owner, Manager, Supervisor |
| **Publish Period** | Top of Employee Schedule | Publishes the schedule period | Owner, Manager |
| **Copy Previous Week** | Top toolbar | Copies last week's shifts forward | Owner, Manager |
| View toggles (Grid/List/Card/etc) | Top right | Switches between view modes | All |
| Week navigation arrows | Top center | Navigate to previous/next week | All |
| **Export** | Top right area | Download schedule as CSV | All |
| **Print** | Top right area | Print-friendly schedule view | All |
| **Budget Overlay** | Toggle | Shows budget/hours overlay on grid | Owner, Manager |
| Shift block (click) | Grid cells | Opens Edit Shift form | Owner, Manager, Supervisor |
| Empty cell (click) | Grid cells | Quick-creates a shift | Owner, Manager, Supervisor |
| Shift block (drag) | Grid cells | Moves shift to new day/staff | Owner, Manager, Supervisor |

---

## Shift Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Shift Title | Text | No | Optional name for the shift |
| Site | Dropdown | Yes | Which client site |
| Service Plan | Dropdown | Yes | Which job (auto-filtered by site) |
| Position Code | Text | No | Position type (e.g., FLOOR_SPECIALIST) |
| Required Staff | Number | Yes | How many people needed (default: 1) |
| Start Date | Date | Yes | When the shift begins |
| Start Time | Time | Yes | Shift start time |
| End Time | Time | Yes | Shift end time |
| Weeks Ahead | Number | Yes | How many weeks to create (1-8) |
| Break Duration | Dropdown | No | No break, 15/30/45/60 min |
| Paid Break | Toggle | No | Whether break is paid |
| Open Slots | Number | No | Max open/unfilled slots |
| Remote Site | Dropdown | No | Secondary site reference |
| Note | Textarea | No | Special instructions |
| Recurring Days | Toggle buttons | Yes | Mon-Sun selection |
| Employee Assignment | Search + Add | No | Staff members to assign |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No shifts in grid | "No recurring schedule rows" empty state | Create shifts with **+ New Shift** |
| No staff in a row | "Empty Shifts" section with shift blocks | Assign staff by clicking the block |
| Loading | Skeleton animation | Wait for data to load |
| "Could not find work ticket" toast | The shift data didn't match the database | Refresh the page and try again |

---

## Troubleshooting

> **If** shifts aren't showing → Check you're on the correct week. Use navigation arrows.

> **If** you can't create a shift → Check your role. Only Owner, Manager, Supervisor can create.

> **If** drag-and-drop doesn't work → Make sure you're clicking and holding the shift block, then dragging to a new cell.

> **If** a staff member shows "Unavailable" → They have availability rules set. Check **Availability** tab.

> **If** coverage shows gaps → Open the shift and assign more staff, or create additional shifts.

---

## Related Modules

- [Team](./team.md) — Staff members assigned to shifts
- [Jobs](./jobs.md) — Service plans that generate tickets
- [Clients](./clients.md) — Sites where shifts happen
- [Shifts & Time](./shifts-time.md) — Clock in/out for scheduled shifts
