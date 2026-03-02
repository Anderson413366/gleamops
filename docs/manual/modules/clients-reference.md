# Clients Module Reference

## Field Dictionary

### Client

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique client identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| company_name | string | Yes | 1-200 chars | Client company or individual name |
| status | Enum | Yes | Valid CLIENT_STATUS | Current client status |
| contact_name | string | No | 1-150 chars | Primary contact person |
| contact_email | string | No | Valid email format | Primary contact email |
| contact_phone | string | No | Valid phone format | Primary contact phone |
| billing_address | text | No | Max 500 chars | Billing address |
| billing_email | string | No | Valid email format | Email for invoices |
| payment_terms | Enum | No | `net_15`, `net_30`, `net_45`, `net_60` | Payment terms |
| notes | text | No | Max 2000 chars | Internal notes about client |
| tags | string[] | No | Max 20 tags | Categorization tags |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Site

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique site identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| client_id | UUID | Yes | Valid client | Parent client |
| name | string | Yes | 1-200 chars | Site name or label |
| status | Enum | Yes | Valid SITE_STATUS | Current site status |
| address_line1 | string | Yes | 1-200 chars | Street address |
| address_line2 | string | No | Max 200 chars | Suite, unit, floor |
| city | string | Yes | 1-100 chars | City |
| state | string | Yes | 2-char state code | State abbreviation |
| zip | string | Yes | 5 or 9 digit ZIP | Postal code |
| latitude | decimal | No | -90 to 90 | GPS latitude |
| longitude | decimal | No | -180 to 180 | GPS longitude |
| site_contact_name | string | No | 1-150 chars | On-site contact person |
| site_contact_phone | string | No | Valid phone format | On-site contact phone |
| access_notes | text | No | Max 1000 chars | Gate codes, keys, access instructions |
| square_footage | integer | No | > 0 | Total cleanable area |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### CLIENT_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| PROSPECT | yellow | Potential client, not yet signed | ACTIVE, CANCELED |
| ACTIVE | green | Client is under contract and receiving services | ON_HOLD, INACTIVE, CANCELED |
| ON_HOLD | yellow | Client temporarily paused services | ACTIVE, INACTIVE, CANCELED |
| INACTIVE | gray | Client is no longer receiving services | ACTIVE, CANCELED |
| CANCELED | red | Client relationship has been terminated | -- |

### SITE_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| ACTIVE | green | Site is actively being serviced | INACTIVE, ON_HOLD, CANCELED |
| INACTIVE | gray | Site is not currently being serviced | ACTIVE, CANCELED |
| ON_HOLD | yellow | Site services are temporarily paused | ACTIVE, INACTIVE, CANCELED |
| CANCELED | red | Site has been permanently removed from service | -- |

### Payment Terms Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| net_15 | -- | Payment due within 15 days | Any |
| net_30 | -- | Payment due within 30 days | Any |
| net_45 | -- | Payment due within 45 days | Any |
| net_60 | -- | Payment due within 60 days | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Client | Client list toolbar | Open client creation form | Manager, Admin, Owner |
| Edit Client | Client detail toolbar | Open client edit form | Manager, Admin, Owner |
| Activate | Client detail toolbar | Transition PROSPECT -> ACTIVE | Manager, Admin, Owner |
| Put on Hold | Client detail toolbar | Transition ACTIVE -> ON_HOLD | Manager, Admin, Owner |
| Reactivate | Client detail toolbar | Transition ON_HOLD/INACTIVE -> ACTIVE | Manager, Admin, Owner |
| Deactivate | Client detail action menu | Transition -> INACTIVE | Admin, Owner |
| Cancel Client | Client detail action menu | Transition -> CANCELED with confirmation | Admin, Owner |
| + Add Site | Client detail / Sites tab | Open site creation form for this client | Manager, Admin, Owner |
| Edit Site | Site detail toolbar | Open site edit form | Manager, Admin, Owner |
| Deactivate Site | Site detail action menu | Transition site -> INACTIVE | Manager, Admin, Owner |
| Cancel Site | Site detail action menu | Transition site -> CANCELED | Admin, Owner |
| View Jobs | Client detail / Jobs tab | Navigate to jobs filtered by this client | Any |
| View Site | Sites tab row click | Navigate to site detail page | Any |
| Back to Clients | Client detail breadcrumb | Navigate to `/clients` | Any |
| Back to Client | Site detail breadcrumb | Navigate to parent client detail | Any |
| Filter by Status | Client list filter bar | Filter clients by status | Any |
| Search | Client list search bar | Search clients by name, contact, email | Any |
| Export Clients | Client list toolbar | Download client list as CSV | Manager, Admin, Owner |
