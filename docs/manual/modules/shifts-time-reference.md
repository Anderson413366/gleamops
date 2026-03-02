# Shifts & Time Module Reference

## Field Dictionary

### Time Entry

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique time entry identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| staff_id | UUID | Yes | Valid staff | Staff member for this entry |
| shift_id | UUID | No | Valid shift | Associated scheduled shift (if any) |
| ticket_id | UUID | No | Valid ticket | Associated service ticket (if any) |
| clock_in | timestamp | Yes | Valid timestamp | Clock-in time |
| clock_out | timestamp | No | > clock_in | Clock-out time |
| break_minutes | integer | No | >= 0 | Total break time in minutes |
| total_hours | decimal | Auto | Calculated from clock in/out - breaks | Net hours worked |
| status | Enum | Yes | Valid TIME_ENTRY_STATUS | Entry status |
| notes | text | No | Max 500 chars | Time entry notes |
| gps_clock_in | JSON | No | Valid lat/lng | GPS location at clock-in |
| gps_clock_out | JSON | No | Valid lat/lng | GPS location at clock-out |
| approved_by | UUID | No | Valid staff ID | Manager who approved the entry |
| approved_at | timestamp | No | Auto on approval | When entry was approved |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Timesheet

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique timesheet identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| staff_id | UUID | Yes | Valid staff | Staff member |
| period_start | date | Yes | Valid date | Pay period start date |
| period_end | date | Yes | >= period_start | Pay period end date |
| total_regular_hours | decimal | Auto | Calculated | Total regular hours in period |
| total_overtime_hours | decimal | Auto | Calculated | Total overtime hours in period |
| status | Enum | Yes | Valid TIMESHEET_STATUS | Timesheet status |
| submitted_at | timestamp | No | Auto on submit | When staff submitted timesheet |
| approved_at | timestamp | No | Auto on approval | When manager approved |
| approved_by | UUID | No | Valid staff ID | Approving manager |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### TIME_ENTRY_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| ACTIVE | green | Staff is currently clocked in | COMPLETED |
| COMPLETED | blue | Clock-out recorded, awaiting approval | APPROVED, DISPUTED |
| APPROVED | green | Entry has been approved by manager | -- |
| DISPUTED | orange | Entry has been flagged for review | APPROVED, COMPLETED |

### TIMESHEET_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Timesheet is being accumulated for the period | SUBMITTED |
| SUBMITTED | blue | Staff has submitted timesheet for review | APPROVED, REJECTED |
| APPROVED | green | Manager has approved the timesheet | -- |
| REJECTED | red | Manager has rejected, needs corrections | DRAFT |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| Clock In | Time tracking toolbar | Record clock-in with current timestamp and GPS | Any (own entry) |
| Clock Out | Time tracking toolbar (clocked in) | Record clock-out with current timestamp and GPS | Any (own entry) |
| + Manual Entry | Time entries toolbar | Open manual time entry form | Manager, Admin, Owner |
| Edit Entry | Time entry row | Open time entry edit form | Manager, Admin, Owner |
| Delete Entry | Time entry row action menu | Delete time entry with confirmation | Admin, Owner |
| Approve Entry | Time entry row | Approve individual time entry | Manager, Admin, Owner |
| Dispute Entry | Time entry row | Flag entry for review | Manager, Admin, Owner |
| Submit Timesheet | Timesheet detail toolbar | Submit timesheet for manager review | Any (own timesheet) |
| Approve Timesheet | Timesheet detail toolbar | Approve submitted timesheet | Manager, Admin, Owner |
| Reject Timesheet | Timesheet detail toolbar | Reject timesheet with notes | Manager, Admin, Owner |
| Bulk Approve | Timesheets list toolbar | Approve multiple selected timesheets | Manager, Admin, Owner |
| View Staff | Time entry staff link | Navigate to staff detail page | Any |
| View Shift | Time entry shift link | Navigate to shift detail | Any |
| View Ticket | Time entry ticket link | Navigate to ticket detail | Any |
| Back to Shifts & Time | Detail page breadcrumb | Navigate to `/shifts-time` | Any |
| Filter by Staff | Time entries filter bar | Filter entries by staff member | Manager, Admin, Owner |
| Filter by Period | Time entries filter bar | Filter entries by date range | Any |
| Filter by Status | Timesheets filter bar | Filter timesheets by status | Manager, Admin, Owner |
| Export Timesheets | Timesheets list toolbar | Download timesheets as CSV | Manager, Admin, Owner |
| Print Timesheet | Timesheet detail toolbar | Open print dialog for timesheet | Manager, Admin, Owner |
