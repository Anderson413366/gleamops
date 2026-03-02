# Shifts & Time

> Clock in, clock out, and track time for field staff.

**Route:** `/shifts-time`
**Sidebar icon:** Clock
**Accent color:** Emerald (#10b981)
**Default tab:** Shifts

---

## What This Module Is

The Shifts & Time module handles real-time time tracking.
This is where field staff clock in and out of their shifts.

**Time events** are individual clock actions:
- CHECK_IN — Start of shift
- CHECK_OUT — End of shift
- BREAK_START — Going on break
- BREAK_END — Coming back from break

This module is **feature-flag and role-gated**:
- Requires `shifts_time_v1` or `shifts_time_route_execution` feature flag to be enabled
- **Owner/Admin and Manager** roles see it when flags are active (pilot managers)
- **Cleaner/Inspector** roles see it when flags are active
- Unlike other modules, this does NOT use the standard ChipTabs pattern — it renders a single `ShiftsTimePanel` component with conditional sections based on role and feature flags

Timesheets aggregate time events into pay-period summaries.

## When to Use It

- Clock in at the start of a shift
- Clock out at the end of a shift
- Start and end breaks
- View your current shift status
- Review timesheets for a pay period
- Manage shift schedules

---

## Quick Win

1. Click **Shifts & Time** in the sidebar.
2. See your current shift status (clocked in or out).
3. Click **Clock In** to start your shift.
4. When done, click **Clock Out**.
5. Break buttons appear while clocked in.

---

## Common Tasks

### Clock In

1. Go to **Shifts & Time**.
2. Your assigned shift for today should be visible.
3. Click **Clock In**.
4. If geofencing is enabled, your location is verified against the site boundary.
5. The system records a CHECK_IN event.

**Expected result:** Your status changes to "Clocked In." The timer starts.

> **Stop Point:** You are now on the clock. Clock out when your shift ends.

### Clock Out

1. While clocked in, click **Clock Out**.
2. The system records a CHECK_OUT event.
3. Your total hours for this shift are calculated.

**Expected result:** Your status changes to "Clocked Out." Hours are logged.

### Take a Break

1. While clocked in, click **Start Break**.
2. The system records a BREAK_START event.
3. When done, click **End Break**.
4. The system records a BREAK_END event.

**Expected result:** Break time is tracked separately from work time.

### Review Timesheets

1. Go to **Shifts & Time** > **Timesheets** tab (or **Team** > **Timesheets**).
2. Select the **Pay Period**.
3. See summarized hours for each staff member.
4. Review for accuracy.
5. Approve timesheets (Manager+).

**Expected result:** Timesheets show regular hours, break time, and overtime.

---

## Screens & Views

### Shifts (default view)

Current shift view. Shows:
- Today's assigned shift (site, time, position)
- Clock in/out buttons
- Break start/end buttons
- Current shift timer
- Shift history for recent days

### Timesheets

Timesheet summaries. Shows:
- Staff name, period, regular hours, break hours, overtime, total
- Approval status
- Filterable by pay period

### Clock In/Out Interface

The main interaction screen:
- Large **Clock In** / **Clock Out** button (one primary action)
- Current site and shift info
- GPS status indicator (if geofencing is active)
- Break controls appear only when clocked in

---

## Time Events

| Event | Code | When It Happens |
|-------|------|----------------|
| Clock In | CHECK_IN | Staff starts their shift |
| Clock Out | CHECK_OUT | Staff ends their shift |
| Break Start | BREAK_START | Staff goes on break |
| Break End | BREAK_END | Staff returns from break |

Time events are immutable records. They cannot be edited after creation.
Corrections are handled by managers through timesheet adjustments.

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **Clock In** | Main view | Records CHECK_IN event | All field staff |
| **Clock Out** | Main view (while clocked in) | Records CHECK_OUT event | All field staff |
| **Start Break** | Main view (while clocked in) | Records BREAK_START event | All field staff |
| **End Break** | Main view (while on break) | Records BREAK_END event | All field staff |
| **Approve** | Timesheets tab | Approves a timesheet | Manager+ |
| **Export** | Timesheets tab | Downloads timesheet CSV | Manager+ |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No shift assigned today | "No shift scheduled for today" | Check with your manager or see Schedule module |
| Already clocked in | Clock Out button is shown instead | Clock out when shift ends |
| Not within geofence | "You are not at the job site" | Move closer to the site. GPS needs to be within the geofence radius |
| Loading | Spinner on clock button | Wait for location verification |
| Error toast | "Could not record time event" | Check internet connection and try again |

---

## Troubleshooting

> **If** the Clock In button is disabled → You may already be clocked in. Check your current status.

> **If** geofence check fails → Make sure GPS is enabled on your device. Move closer to the site entrance.

> **If** break buttons are not visible → They only appear while you are clocked in.

> **If** hours seem wrong on the timesheet → Time events are immutable. Ask your manager to make a timesheet adjustment.

> **If** you cannot see Shifts & Time in the sidebar → Check your role. This module is role-gated for field staff.

> **If** overtime is not calculating → Overtime rules are configured in Settings > Schedule Settings.

---

## Related Modules

- [Schedule](./schedule.md) — Shifts that define when to work
- [Team](./team.md) — Staff records and timesheets
- [Jobs](./jobs.md) — Tickets that time is logged against
- [Settings](./settings.md) — Geofences and schedule settings
