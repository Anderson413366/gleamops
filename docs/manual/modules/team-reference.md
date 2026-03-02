# Team Module Reference

## Field Dictionary

### Staff Member

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique staff identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| first_name | string | Yes | 1-100 chars | Staff first name |
| last_name | string | Yes | 1-100 chars | Staff last name |
| email | string | Yes | Valid email, unique per tenant | Staff email address |
| phone | string | No | Valid phone format | Staff phone number |
| status | Enum | Yes | Valid STAFF_STATUS | Current staff status |
| role | Enum | Yes | Valid app role | Application role (owner, admin, manager, crew_lead, crew_member) |
| pay_type | Enum | Yes | Valid PAY_TYPE | Compensation type |
| pay_rate | decimal | Yes | >= 0 | Pay rate (hourly or salary amount) |
| schedule_type | Enum | Yes | Valid SCHEDULE_TYPE | Whether schedule is fixed or variable |
| hire_date | date | Yes | Valid date | Employment start date |
| termination_date | date | No | >= hire_date | Employment end date |
| emergency_contact_name | string | No | 1-150 chars | Emergency contact person |
| emergency_contact_phone | string | No | Valid phone format | Emergency contact phone |
| address | text | No | Max 500 chars | Home address |
| notes | text | No | Max 2000 chars | Internal notes |
| avatar_url | string | No | Valid URL | Profile photo URL |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### STAFF_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Staff record created but not yet onboarded | ACTIVE |
| ACTIVE | green | Staff member is currently employed and available | ON_LEAVE, INACTIVE, TERMINATED |
| ON_LEAVE | yellow | Staff is on temporary leave (medical, personal, etc.) | ACTIVE, TERMINATED |
| INACTIVE | gray | Staff is no longer active but not formally terminated | ACTIVE, TERMINATED |
| TERMINATED | red | Staff employment has been formally ended | -- |

### PAY_TYPE

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| HOURLY | -- | Paid by the hour based on time worked | Any |
| SALARY | -- | Fixed periodic salary | Any |
| CONTRACT | -- | Independent contractor arrangement | Any |

### SCHEDULE_TYPE

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| VARIABLE | -- | Schedule changes week to week | FIXED |
| FIXED | -- | Consistent recurring schedule | VARIABLE |

### Role Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| owner | purple | Full system access, tenant owner | -- |
| admin | red | Full access except tenant-level settings | Any except owner |
| manager | blue | Manage staff, jobs, clients, schedule | crew_lead, crew_member |
| crew_lead | green | Lead crews, manage tickets on-site | crew_member |
| crew_member | gray | View assigned shifts and complete tickets | crew_lead |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Staff | Team list toolbar | Open staff creation form | Admin, Owner |
| Edit Staff | Staff detail toolbar | Open staff edit form | Manager, Admin, Owner |
| Activate | Staff detail toolbar | Transition DRAFT -> ACTIVE | Manager, Admin, Owner |
| Set On Leave | Staff detail toolbar | Transition ACTIVE -> ON_LEAVE | Manager, Admin, Owner |
| Return from Leave | Staff detail toolbar | Transition ON_LEAVE -> ACTIVE | Manager, Admin, Owner |
| Deactivate | Staff detail action menu | Transition -> INACTIVE | Admin, Owner |
| Terminate | Staff detail action menu | Transition -> TERMINATED with confirmation | Admin, Owner |
| View Schedule | Staff detail / Schedule tab | Show shifts assigned to this staff member | Any |
| View Certifications | Staff detail / Certs tab | Show safety certifications | Any |
| View Time Entries | Staff detail / Time tab | Show time tracking entries | Manager, Admin, Owner |
| Back to Team | Staff detail breadcrumb | Navigate to `/team` | Any |
| Filter by Status | Team list filter bar | Filter staff by status | Any |
| Filter by Role | Team list filter bar | Filter staff by role | Any |
| Search | Team list search bar | Search staff by name, email, phone | Any |
| Export Team | Team list toolbar | Download staff list as CSV | Admin, Owner |
