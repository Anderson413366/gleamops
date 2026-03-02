# Operations Module Reference

## Field Dictionary

### Operations Dashboard

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| date_range_start | date | Yes | Valid date | Dashboard filter start date |
| date_range_end | date | Yes | >= start date | Dashboard filter end date |
| view_mode | Enum | No | `overview`, `map`, `timeline` | Dashboard view mode |
| region_filter | string | No | Valid region | Filter by geographic region |

### Daily Operations Log

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique log entry identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| date | date | Yes | Valid date | Date of operations |
| shift_coverage | decimal | Auto | 0-100 | Percentage of shifts filled |
| tickets_completed | integer | Auto | >= 0 | Number of tickets completed |
| tickets_scheduled | integer | Auto | >= 0 | Number of tickets scheduled |
| completion_rate | decimal | Auto | 0-100 | Completion percentage |
| issues_reported | integer | Auto | >= 0 | Safety/quality issues reported |
| notes | text | No | Max 2000 chars | Operations manager daily notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Quality Inspection

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique inspection identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| site_id | UUID | Yes | Valid site | Inspected site |
| inspector_id | UUID | Yes | Valid staff ID | Staff performing inspection |
| inspection_date | date | Yes | Valid date | Date of inspection |
| score | integer | Yes | 1-100 | Overall quality score |
| areas | JSON | Yes | Valid areas array | Area-by-area scores and notes |
| photos | string[] | No | Valid URLs | Inspection photos |
| client_notified | boolean | No | true/false | Whether client was notified of results |
| follow_up_required | boolean | No | true/false | Whether follow-up action is needed |
| notes | text | No | Max 2000 chars | General inspection notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### View Mode Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| overview | -- | Standard dashboard with KPIs and lists | map, timeline |
| map | -- | Geographic map view of active sites/crews | overview, timeline |
| timeline | -- | Gantt-style timeline of daily operations | overview, map |

### Inspection Score Ranges

| Range | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| 90-100 | green | Excellent quality, meets all standards | N/A |
| 70-89 | yellow | Acceptable quality, minor improvements needed | N/A |
| 50-69 | orange | Below standard, corrective action required | N/A |
| 0-49 | red | Unacceptable, immediate intervention needed | N/A |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| View Overview | Operations toolbar | Switch to overview dashboard mode | Manager, Admin, Owner |
| View Map | Operations toolbar | Switch to geographic map view | Manager, Admin, Owner |
| View Timeline | Operations toolbar | Switch to timeline view | Manager, Admin, Owner |
| + New Inspection | Inspections tab toolbar | Open quality inspection form | Manager, Admin, Owner |
| Edit Inspection | Inspection detail toolbar | Open inspection edit form | Manager, Admin, Owner |
| Notify Client | Inspection detail toolbar | Send inspection results to client | Manager, Admin, Owner |
| + Add Daily Note | Daily log section | Add note to operations log | Manager, Admin, Owner |
| View Tickets | Operations KPI card | Navigate to today's tickets filtered view | Any |
| View Open Shifts | Operations KPI card | Navigate to schedule filtered to open shifts | Manager, Admin, Owner |
| View Issues | Operations KPI card | Navigate to safety issues list | Manager, Admin, Owner |
| View Site | Inspection detail site link | Navigate to site detail page | Any |
| View Inspector | Inspection detail staff link | Navigate to staff detail page | Any |
| Drill Down | KPI card | Navigate to relevant filtered detail list | Manager, Admin, Owner |
| Back to Operations | Inspection detail breadcrumb | Navigate to `/operations` | Any |
| Filter by Date | Operations filter bar | Filter by date range | Any |
| Filter by Region | Operations filter bar | Filter by geographic region | Manager, Admin, Owner |
| Export Report | Operations toolbar | Download operations report as PDF/CSV | Manager, Admin, Owner |
| Print Daily Log | Daily log section | Open print dialog for daily operations log | Manager, Admin, Owner |
