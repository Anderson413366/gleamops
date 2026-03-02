# Schedule Module Reference

## Field Dictionary

### Schedule Period

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique period identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-100 chars | Period display name (e.g. "Week of Mar 2") |
| start_date | date | Yes | Valid date | First day of the period |
| end_date | date | Yes | >= start_date | Last day of the period |
| status | Enum | Yes | Valid PERIOD_STATUS | Current period status |
| published_at | timestamp | No | Auto on publish | When period was published |
| published_by | UUID | No | Valid staff ID | Who published the period |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Shift

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique shift identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| period_id | UUID | Yes | Valid period | Parent schedule period |
| staff_id | UUID | No | Valid staff | Assigned staff member |
| job_id | UUID | Yes | Valid job | Associated job |
| site_id | UUID | Yes | Valid site | Work site location |
| shift_date | date | Yes | Within period range | Date of the shift |
| start_time | time | Yes | Valid time | Shift start time |
| end_time | time | Yes | > start_time | Shift end time |
| status | Enum | Yes | Valid SHIFT_STATUS | Current shift status |
| notes | text | No | Max 500 chars | Shift notes or instructions |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### PERIOD_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Period is being built, not visible to staff | PUBLISHED |
| PUBLISHED | green | Period is live and visible to assigned staff | LOCKED |
| LOCKED | blue | Period is finalized, no further edits allowed | -- |

### SHIFT_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| open | red | Shift has no assigned staff member | draft, confirmed |
| draft | gray | Shift is tentatively assigned, not confirmed | open, confirmed |
| confirmed | green | Shift is confirmed by staff or manager | open |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Period | Period list toolbar | Open new schedule period form | Manager, Admin, Owner |
| Publish | Period detail toolbar | Transition period from DRAFT to PUBLISHED | Manager, Admin, Owner |
| Lock | Period detail toolbar | Transition period from PUBLISHED to LOCKED | Admin, Owner |
| + Add Shift | Period detail / shift grid | Open shift creation form | Manager, Admin, Owner |
| Edit Shift | Shift row / shift card | Open shift edit dialog | Manager, Admin, Owner |
| Delete Shift | Shift row action menu | Delete shift with confirmation | Manager, Admin, Owner |
| Assign Staff | Open shift card | Open staff assignment picker | Manager, Admin, Owner |
| Confirm Shift | Shift card | Mark shift as confirmed | Manager, Admin, Owner |
| Copy Previous Period | Period creation form | Clone shifts from prior period | Manager, Admin, Owner |
| Back to Schedule | Period detail breadcrumb | Navigate to `/schedule` | Any |
| Filter by Job | Filter bar | Filter shifts to a specific job | Any |
| Filter by Staff | Filter bar | Filter shifts to a specific staff member | Any |
| Export Schedule | Period detail toolbar | Download schedule as PDF/CSV | Manager, Admin, Owner |
