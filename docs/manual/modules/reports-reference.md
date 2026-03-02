# Reports Module Reference

## Field Dictionary

### Report Configuration

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| report_type | Enum | Yes | Valid report type | Type of report to generate |
| date_range_start | date | Yes | Valid date | Report period start date |
| date_range_end | date | Yes | >= start date | Report period end date |
| group_by | Enum | No | Valid grouping option | How to group results (client, site, staff, job) |
| filters | JSON | No | Valid filter object | Additional report filters |
| format | Enum | No | `screen`, `pdf`, `csv` | Output format |

### Report Types

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| revenue_summary | Report | -- | -- | Revenue breakdown by client, job, period |
| labor_cost | Report | -- | -- | Labor costs by staff, job, period |
| job_profitability | Report | -- | -- | Revenue vs. cost per job |
| ticket_completion | Report | -- | -- | Ticket completion rates and quality scores |
| staff_hours | Report | -- | -- | Hours worked by staff member |
| client_activity | Report | -- | -- | Service activity per client |
| inventory_usage | Report | -- | -- | Supply consumption and costs |
| safety_summary | Report | -- | -- | Safety issues, incidents, certifications |
| pipeline_funnel | Report | -- | -- | Prospect conversion rates and pipeline value |
| schedule_coverage | Report | -- | -- | Schedule fill rates and open shifts |

## Statuses / Enums

### Report Type Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| revenue_summary | -- | Financial revenue breakdown | N/A |
| labor_cost | -- | Labor cost analysis | N/A |
| job_profitability | -- | Profit margin per job | N/A |
| ticket_completion | -- | Service ticket metrics | N/A |
| staff_hours | -- | Time tracking summary | N/A |
| client_activity | -- | Client service history | N/A |
| inventory_usage | -- | Supply usage tracking | N/A |
| safety_summary | -- | Safety compliance overview | N/A |
| pipeline_funnel | -- | Sales funnel analysis | N/A |
| schedule_coverage | -- | Shift fill rate metrics | N/A |

### Format Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| screen | -- | Display report in browser | Any |
| pdf | -- | Download as PDF document | Any |
| csv | -- | Download as CSV spreadsheet | Any |

### Group By Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| client | -- | Group results by client | Any |
| site | -- | Group results by site | Any |
| staff | -- | Group results by staff member | Any |
| job | -- | Group results by job | Any |
| period | -- | Group results by time period | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| Generate Report | Report config form | Generate the selected report with parameters | Manager, Admin, Owner |
| Export PDF | Report results toolbar | Download current report as PDF | Manager, Admin, Owner |
| Export CSV | Report results toolbar | Download current report as CSV | Manager, Admin, Owner |
| Print | Report results toolbar | Open browser print dialog | Manager, Admin, Owner |
| Save as Favorite | Report results toolbar | Save report configuration for quick access | Manager, Admin, Owner |
| Load Favorite | Report config form | Load a previously saved report configuration | Manager, Admin, Owner |
| Delete Favorite | Favorites list | Remove a saved report configuration | Manager, Admin, Owner |
| Drill Down | Report table row | Navigate to detail view for selected row | Manager, Admin, Owner |
| Change Period | Report filter bar | Adjust date range | Manager, Admin, Owner |
| Change Grouping | Report filter bar | Change group-by dimension | Manager, Admin, Owner |
| Back to Reports | Report detail breadcrumb | Navigate to `/reports` | Any |
| View Client | Revenue report row link | Navigate to client detail | Any |
| View Staff | Labor report row link | Navigate to staff detail | Any |
| View Job | Profitability report row link | Navigate to job detail | Any |
