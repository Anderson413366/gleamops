# Jobs Module Reference

## Field Dictionary

### Job

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique job identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-150 chars | Job display name |
| client_id | UUID | Yes | Valid client | Associated client |
| site_id | UUID | Yes | Valid site, belongs to client | Service site for this job |
| status | Enum | Yes | Valid JOB_STATUS | Current job status |
| service_plan_id | UUID | No | Valid service plan | Linked catalog service plan |
| frequency | Enum | No | `daily`, `weekly`, `biweekly`, `monthly`, `one-time` | Recurrence frequency |
| start_date | date | Yes | Valid date | Job effective start date |
| end_date | date | No | >= start_date | Job end date (null = ongoing) |
| estimated_hours | decimal | No | > 0 | Estimated hours per service |
| rate | decimal | No | >= 0 | Billing rate |
| rate_type | Enum | No | `per_visit`, `per_hour`, `monthly` | How the rate is applied |
| notes | text | No | Max 2000 chars | Internal job notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Ticket (Service Ticket)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique ticket identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| job_id | UUID | Yes | Valid job | Parent job |
| ticket_number | string | Auto | System-generated | Human-readable ticket number |
| status | Enum | Yes | Valid TICKET_STATUS | Current ticket status |
| scheduled_date | date | Yes | Valid date | Date the service is scheduled |
| completed_date | date | No | Auto on completion | Date service was completed |
| assigned_staff | UUID[] | No | Valid staff IDs | Staff members assigned to ticket |
| actual_hours | decimal | No | >= 0 | Actual hours worked |
| quality_score | integer | No | 1-5 | Quality rating after verification |
| client_signature | boolean | No | -- | Whether client signed off |
| notes | text | No | Max 2000 chars | Ticket notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### JOB_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Job is being set up, not yet active | ACTIVE, CANCELED |
| ACTIVE | green | Job is live and generating tickets | ON_HOLD, CANCELED, COMPLETED |
| ON_HOLD | yellow | Job is temporarily paused | ACTIVE, CANCELED |
| CANCELED | red | Job has been permanently canceled | -- |
| COMPLETED | blue | Job has been finished successfully | -- |

### TICKET_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| SCHEDULED | blue | Ticket is scheduled for a future date | IN_PROGRESS, CANCELED |
| IN_PROGRESS | yellow | Service is currently being performed | COMPLETED, CANCELED |
| COMPLETED | green | Service has been performed | VERIFIED |
| VERIFIED | blue | Completed ticket has been reviewed and verified | -- |
| CANCELED | red | Ticket has been canceled | -- |

### Frequency Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| daily | -- | Service performed every day | Any |
| weekly | -- | Service performed once per week | Any |
| biweekly | -- | Service performed every two weeks | Any |
| monthly | -- | Service performed once per month | Any |
| one-time | -- | Single occurrence service | Any |

### Rate Type Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| per_visit | -- | Flat rate per service visit | Any |
| per_hour | -- | Billed by the hour | Any |
| monthly | -- | Fixed monthly billing | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Job | Job list toolbar | Open job creation form | Manager, Admin, Owner |
| Edit Job | Job detail toolbar | Open job edit form | Manager, Admin, Owner |
| Activate | Job detail toolbar | Transition job DRAFT -> ACTIVE | Manager, Admin, Owner |
| Put on Hold | Job detail toolbar | Transition job ACTIVE -> ON_HOLD | Manager, Admin, Owner |
| Resume | Job detail toolbar | Transition job ON_HOLD -> ACTIVE | Manager, Admin, Owner |
| Cancel Job | Job detail action menu | Transition job -> CANCELED with confirmation | Admin, Owner |
| Complete Job | Job detail toolbar | Transition job ACTIVE -> COMPLETED | Manager, Admin, Owner |
| + New Ticket | Job detail / Tickets tab | Create a new service ticket for this job | Manager, Admin, Owner |
| Edit Ticket | Ticket detail toolbar | Open ticket edit form | Manager, Admin, Owner |
| Start Service | Ticket detail toolbar | Transition ticket SCHEDULED -> IN_PROGRESS | Crew Lead, Manager, Admin |
| Complete Ticket | Ticket detail toolbar | Transition ticket IN_PROGRESS -> COMPLETED | Crew Lead, Manager, Admin |
| Verify Ticket | Ticket detail toolbar | Transition ticket COMPLETED -> VERIFIED | Manager, Admin, Owner |
| Cancel Ticket | Ticket action menu | Transition ticket -> CANCELED with confirmation | Manager, Admin, Owner |
| Back to Jobs | Job detail breadcrumb | Navigate to `/jobs` | Any |
| Back to Job | Ticket detail breadcrumb | Navigate to parent job detail | Any |
| View Client | Job detail client link | Navigate to client detail page | Any |
| View Site | Job detail site link | Navigate to site detail page | Any |
| Filter by Status | Job list filter bar | Filter jobs by status | Any |
| Filter by Client | Job list filter bar | Filter jobs by client | Any |
| Export Jobs | Job list toolbar | Download job list as CSV | Manager, Admin, Owner |
