# Vendors Module Reference

## Field Dictionary

### Vendor

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique vendor identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| company_name | string | Yes | 1-200 chars | Vendor company name |
| contact_name | string | No | 1-150 chars | Primary vendor contact person |
| contact_email | string | No | Valid email format | Vendor contact email |
| contact_phone | string | No | Valid phone format | Vendor contact phone |
| address_line1 | string | No | 1-200 chars | Vendor street address |
| address_line2 | string | No | Max 200 chars | Suite, unit |
| city | string | No | 1-100 chars | City |
| state | string | No | 2-char state code | State abbreviation |
| zip | string | No | 5 or 9 digit ZIP | Postal code |
| website | string | No | Valid URL | Vendor website |
| account_number | string | No | 1-100 chars | Your account number with this vendor |
| payment_terms | Enum | No | `net_15`, `net_30`, `net_45`, `net_60`, `cod` | Payment terms |
| category | string | No | 1-100 chars | Vendor category (e.g. "Chemicals", "Equipment") |
| tax_id | string | No | Valid EIN format | Vendor tax identification number |
| notes | text | No | Max 2000 chars | Internal notes about vendor |
| is_active | boolean | Yes | true/false | Whether vendor is active |
| rating | integer | No | 1-5 | Internal vendor quality rating |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### Active Status

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| Active (is_active=true) | green | Vendor is available for ordering | Inactive |
| Inactive (is_active=false) | gray | Vendor is no longer used | Active |

### Payment Terms Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| net_15 | -- | Payment due within 15 days | Any |
| net_30 | -- | Payment due within 30 days | Any |
| net_45 | -- | Payment due within 45 days | Any |
| net_60 | -- | Payment due within 60 days | Any |
| cod | -- | Cash on delivery | Any |

### Rating Enum

| Value | Color | Description | Transitions To |
|-------|-------|-------------|----------------|
| 1 | red | Poor | Any |
| 2 | orange | Below Average | Any |
| 3 | yellow | Average | Any |
| 4 | green | Good | Any |
| 5 | green | Excellent | Any |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Vendor | Vendor list toolbar | Open vendor creation form | Manager, Admin, Owner |
| Edit Vendor | Vendor detail toolbar | Open vendor edit form | Manager, Admin, Owner |
| Deactivate | Vendor detail action menu | Set is_active to false | Admin, Owner |
| Activate | Vendor detail action menu | Set is_active to true | Admin, Owner |
| + New Order | Vendor detail / Orders tab | Create a supply order for this vendor | Manager, Admin, Owner |
| View Orders | Vendor detail / Orders tab | Show all supply orders from this vendor | Any |
| View Supplies | Vendor detail / Supplies tab | Show supply items sourced from this vendor | Any |
| Rate Vendor | Vendor detail toolbar | Open rating dialog | Manager, Admin, Owner |
| Back to Vendors | Vendor detail breadcrumb | Navigate to `/vendors` | Any |
| Filter by Category | Vendor list filter bar | Filter vendors by category | Any |
| Filter by Rating | Vendor list filter bar | Filter vendors by quality rating | Any |
| Search | Vendor list search bar | Search vendors by name, contact, category | Any |
| Export Vendors | Vendor list toolbar | Download vendor list as CSV | Manager, Admin, Owner |
