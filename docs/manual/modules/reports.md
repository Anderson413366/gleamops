# Reports

> View dashboards and analytics across all modules.

**Route:** `/reports`
**Sidebar icon:** BarChart3
**Accent color:** Blue (#3b82f6)
**Default tab:** Ops

---

## What This Module Is

The Reports module is a read-only analytics hub.
It shows dashboard cards with key performance indicators (KPIs) across your business.

No data is created or edited here.
Reports pull data from all other modules and present it in a visual format.

Six report categories cover the main business areas:
operations, sales, financial, quality, workforce, and inventory.

## When to Use It

- Review operational performance
- Check sales pipeline health
- Monitor financial metrics
- Assess quality scores
- Analyze workforce productivity
- Track inventory levels and costs

---

## Quick Win

1. Click **Reports** in the sidebar.
2. You are on the **Ops** tab.
3. See dashboard cards with operational KPIs.
4. Each card shows a metric, a value, and a trend indicator.
5. Switch tabs to see other report categories.

---

## Common Tasks

### Review Operational Reports

1. Go to **Reports** > **Ops** tab.
2. See KPIs for:
   - Active jobs count
   - Tickets completed this period
   - On-time completion rate
   - Average ticket duration

### Review Sales Reports

1. Go to **Reports** > **Sales** tab.
2. See KPIs for:
   - Pipeline value
   - Prospects this month
   - Bid win rate
   - Proposals sent vs accepted

### Review Financial Reports

1. Go to **Reports** > **Financial** tab.
2. See KPIs for:
   - Revenue by client
   - Cost per site
   - Margin analysis
   - Contract value summary

### Review Quality Reports

1. Go to **Reports** > **Quality** tab.
2. See KPIs for:
   - Inspection scores (average)
   - Complaint count
   - Quality trends
   - Client satisfaction indicators

### Review Workforce Reports

1. Go to **Reports** > **Workforce** tab.
2. See KPIs for:
   - Active staff count
   - Average hours per employee
   - Attendance rate
   - Overtime tracking

### Review Inventory Reports

1. Go to **Reports** > **Inventory** tab.
2. See KPIs for:
   - Total supply cost this period
   - Items below reorder point
   - Usage by site
   - Order frequency

---

## Screens & Views (6 Tabs)

### Ops (`?tab=ops`)

Operational performance dashboards.
- Stat cards for job and ticket metrics
- Completion trends
- Site-level performance

### Sales (`?tab=sales`)

Sales pipeline analytics.
- Pipeline funnel visualization
- Win/loss ratios
- Prospect conversion rates

### Financial (`?tab=financial`)

Financial performance dashboards.
- Revenue and cost breakdowns
- Margin analysis by client/site
- Contract value tracking

### Quality (`?tab=quality`)

Quality assurance dashboards.
- Inspection score averages
- Complaint trends
- Client satisfaction metrics

### Workforce (`?tab=workforce`)

Workforce analytics.
- Staff utilization rates
- Hours worked summaries
- Attendance patterns
- Training compliance rates

### Inventory (`?tab=inventory`)

Inventory analytics.
- Stock level overviews
- Usage trends
- Cost analysis
- Reorder alerts

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| Tab navigation | Top area | Switches between report categories | Owner, Manager |
| Date range picker | Top area | Filters data by time period (UNVERIFIED) | Owner, Manager |
| **Export** | Top right area | Downloads report data as CSV | Owner, Manager |
| **Print** | Top right area | Print-friendly view | Owner, Manager |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No data for period | "No data available for this period" | Adjust the date range or check that data exists in source modules |
| Loading | Skeleton animation on dashboard cards | Wait for data to load |
| Error toast | "Could not load reports" | Refresh the page and try again |
| Partial data | Some cards show data, others show "—" | Missing data in underlying modules |

---

## Troubleshooting

> **If** all reports show zero → Check that your other modules have data. Reports aggregate from Jobs, Pipeline, Team, etc.

> **If** financial numbers seem off → Verify job financial data in the Jobs module. Reports reflect what is in the database.

> **If** you cannot access Reports → Reports are typically restricted to Owner and Manager roles.

> **If** quality scores are missing → Inspection data must exist in the Jobs module first.

> **If** the date range has no data → Try expanding the date range. Some metrics aggregate monthly.

---

## Related Modules

- [Jobs](./jobs.md) — Source of operational and quality data
- [Pipeline](./pipeline.md) — Source of sales data
- [Team](./team.md) — Source of workforce data
- [Inventory](./inventory.md) — Source of inventory data
- [Clients](./clients.md) — Source of client and site data
