# Home (Dashboard)

> Your command center. See what's happening now, what needs attention, and jump to action.

**Route:** `/home`
**Sidebar icon:** Home
**Accent color:** Harbor Blue (#0ea5e9)

---

## What This Module Is

The Home dashboard shows key metrics, alerts, and quick links for your cleaning business.
It's the first page you see after logging in.

**Role-based views:** The dashboard renders different views based on your role:
- **Owner/Admin** → Owner Overview (aggregate business metrics)
- **Manager** → Command Center (daily ops: tasks, projects, celebrations, alerts)
- **Supervisor** → Supervisor Route View (your routes and team activity)
- **Cleaner/Inspector** → Staff Home (your shifts, tickets, and messages)
- **Default** → Dashboard with Message Wall and widgets

## When to Use It

- Start of your day: check what needs attention
- Quick status check: how many tickets, coverage gaps, open work orders
- Jump to specific records via widgets

---

## Quick Win

1. Log in. You're already on the dashboard.
2. Read the KPI cards at the top for a quick status snapshot.
3. Click any KPI card to jump to the relevant filtered list.
4. Scroll down for detailed widgets.

---

## Screens & Views

### KPI Cards (Top Row)

| Card | What It Shows | Click Destination |
|------|--------------|------------------|
| **Tickets Today** | Count of work tickets scheduled for today | Schedule > Employee Schedule |
| **Coverage Gaps** | Number of under-staffed shifts | Schedule > Employee Schedule (filtered) |
| **Open Work Orders** | Count of active work orders | Schedule > Work Orders |
| **Active Service Plans** | Count of active jobs | Jobs > Service Plans |

### Command Center Widgets

| Widget | What It Shows |
|--------|--------------|
| **Today's Tasks** | Work tickets for today with site and time |
| **Weekly Projects** | Upcoming project-type work orders |
| **Birthday & Anniversary** | Staff celebrations this week |
| **Driver License Expirations** | Staff with expiring driver's licenses |
| **Message Wall** | Team announcements and messages |

### Owner Overview (Owner/Admin only)

Shows aggregate business metrics:
- Active clients count
- Active staff count
- Revenue indicators
- Operational health score

---

## Buttons & Controls

| Button | Where | What It Does |
|--------|-------|-------------|
| KPI card (click) | Top row | Navigates to the relevant module with a filter applied |
| Widget "View All" link | Each widget | Opens the full list in the relevant module |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| Loading | Skeleton placeholders with gray animation | Wait a moment. Data is loading. |
| Empty KPIs | "—" displayed | No data exists yet. Start by creating clients and schedules. |
| Error | Red toast at top | Refresh the page. If it persists, check your internet connection. |

---

## Related Modules

- [Schedule](./schedule.md) — where KPI cards link to
- [Jobs](./jobs.md) — service plans and ticket management
- [Team](./team.md) — staff profiles linked from birthday widget
