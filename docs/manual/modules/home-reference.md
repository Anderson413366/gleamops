# Home Module Reference

## Field Dictionary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| date_range | DateRange | Yes | Start <= End | Filter period for dashboard metrics |
| kpi_period | Enum | Yes | `today`, `week`, `month` | Time window for KPI calculations |
| greeting_name | string | No | Auto from auth | Display name shown in welcome banner |
| last_login | timestamp | No | Auto-generated | Timestamp of previous session |
| announcement_id | UUID | No | Valid UUID | ID of pinned announcement card |
| quick_action | Enum | No | Valid action key | Shortcut action from dashboard |

## Statuses / Enums

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| N/A | -- | Home module does not own entity statuses | -- |

### KPI Period Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| today | blue | Current day metrics | week, month |
| week | blue | Current week metrics | today, month |
| month | blue | Current month metrics | today, week |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| View Schedule | KPI card | Navigate to `/schedule` filtered to current period | Any |
| View Jobs | KPI card | Navigate to `/jobs` filtered to active | Any |
| View Pipeline | KPI card | Navigate to `/pipeline` | Manager, Admin, Owner |
| + New Job | Quick actions bar | Open Job creation form | Manager, Admin, Owner |
| + New Client | Quick actions bar | Open Client creation form | Manager, Admin, Owner |
| + New Ticket | Quick actions bar | Open Ticket creation form | Manager, Admin, Owner |
| View All Alerts | Alerts section | Navigate to alerts/notifications list | Any |
| Dismiss Alert | Alert card | Mark alert as read | Any |
| View Report | Revenue card | Navigate to `/reports` with period filter | Manager, Admin, Owner |
| View Team | Attendance card | Navigate to `/team` | Manager, Admin, Owner |
