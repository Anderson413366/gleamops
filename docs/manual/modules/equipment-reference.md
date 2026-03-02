# Equipment Module Reference

## Field Dictionary

### Equipment Item

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique equipment identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-200 chars | Equipment name or label |
| type | string | Yes | 1-100 chars | Equipment type (e.g. "Floor Buffer", "Vacuum") |
| serial_number | string | No | Unique per tenant | Manufacturer serial number |
| asset_tag | string | No | Unique per tenant | Internal asset tracking tag |
| condition | Enum | Yes | Valid CONDITION | Current physical condition |
| purchase_date | date | No | Valid date | Date of purchase |
| purchase_cost | decimal | No | >= 0 | Original purchase cost |
| warranty_expiry | date | No | Valid date | Warranty expiration date |
| assigned_to | UUID | No | Valid staff ID | Currently assigned staff member |
| location | string | No | 1-200 chars | Current storage location |
| last_maintenance | date | No | Valid date | Date of last maintenance/service |
| next_maintenance | date | No | >= last_maintenance | Next scheduled maintenance date |
| notes | text | No | Max 2000 chars | Equipment notes |
| is_active | boolean | Yes | true/false | Whether equipment is tracked |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Key

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique key identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| label | string | Yes | 1-100 chars | Key label or identifier |
| key_type | string | No | 1-50 chars | Type (e.g. "Building Key", "Gate Fob", "Alarm Code") |
| site_id | UUID | No | Valid site | Associated client site |
| status | Enum | Yes | Valid KEY_STATUS | Current key status |
| assigned_to | UUID | No | Valid staff ID | Staff member holding the key |
| assigned_date | date | No | Valid date | Date key was assigned |
| returned_date | date | No | >= assigned_date | Date key was returned |
| notes | text | No | Max 500 chars | Key notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Vehicle

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique vehicle identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-100 chars | Vehicle name or nickname |
| make | string | No | 1-100 chars | Vehicle manufacturer |
| model | string | No | 1-100 chars | Vehicle model |
| year | integer | No | 1900-2100 | Model year |
| vin | string | No | 17 chars, unique | Vehicle identification number |
| license_plate | string | No | 1-20 chars | License plate number |
| status | Enum | Yes | Valid VEHICLE_STATUS | Current vehicle status |
| mileage | integer | No | >= 0 | Current odometer reading |
| assigned_to | UUID | No | Valid staff ID | Assigned driver |
| insurance_expiry | date | No | Valid date | Insurance expiration date |
| registration_expiry | date | No | Valid date | Registration expiration date |
| notes | text | No | Max 2000 chars | Vehicle notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### CONDITION

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| GOOD | green | Equipment is in excellent working condition | FAIR, POOR, OUT_OF_SERVICE |
| FAIR | yellow | Equipment works but shows signs of wear | GOOD, POOR, OUT_OF_SERVICE |
| POOR | orange | Equipment is degraded and needs attention | GOOD, FAIR, OUT_OF_SERVICE |
| OUT_OF_SERVICE | red | Equipment is broken or unsafe for use | GOOD, FAIR, POOR |

### KEY_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| AVAILABLE | green | Key is in the office and available for assignment | ASSIGNED, LOST |
| ASSIGNED | blue | Key has been issued to a staff member | AVAILABLE, RETURNED, LOST |
| LOST | red | Key has been reported lost | AVAILABLE |
| RETURNED | gray | Key has been returned (historical record) | AVAILABLE |

### VEHICLE_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| ACTIVE | green | Vehicle is operational and in service | IN_SHOP, RETIRED |
| IN_SHOP | yellow | Vehicle is in the shop for maintenance or repairs | ACTIVE, RETIRED |
| RETIRED | gray | Vehicle has been decommissioned | -- |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Equipment | Equipment list toolbar | Open equipment creation form | Manager, Admin, Owner |
| Edit Equipment | Equipment detail toolbar | Open equipment edit form | Manager, Admin, Owner |
| Update Condition | Equipment detail toolbar | Open condition update dialog | Manager, Admin, Owner |
| Assign Staff | Equipment detail toolbar | Assign equipment to a staff member | Manager, Admin, Owner |
| Unassign | Equipment detail toolbar | Remove staff assignment | Manager, Admin, Owner |
| Log Maintenance | Equipment detail / Maintenance tab | Record a maintenance event | Manager, Admin, Owner |
| Deactivate | Equipment detail action menu | Set is_active to false | Admin, Owner |
| + New Key | Keys tab toolbar | Open key creation form | Manager, Admin, Owner |
| Edit Key | Key detail toolbar | Open key edit form | Manager, Admin, Owner |
| Assign Key | Key detail toolbar | Assign key to staff, transition AVAILABLE -> ASSIGNED | Manager, Admin, Owner |
| Return Key | Key detail toolbar | Mark key as returned, transition ASSIGNED -> RETURNED | Manager, Admin, Owner |
| Report Lost | Key detail action menu | Transition -> LOST | Manager, Admin, Owner |
| + New Vehicle | Vehicles tab toolbar | Open vehicle creation form | Admin, Owner |
| Edit Vehicle | Vehicle detail toolbar | Open vehicle edit form | Manager, Admin, Owner |
| Send to Shop | Vehicle detail toolbar | Transition ACTIVE -> IN_SHOP | Manager, Admin, Owner |
| Return to Service | Vehicle detail toolbar | Transition IN_SHOP -> ACTIVE | Manager, Admin, Owner |
| Retire Vehicle | Vehicle detail action menu | Transition -> RETIRED with confirmation | Admin, Owner |
| Update Mileage | Vehicle detail toolbar | Open mileage update dialog | Crew Lead, Manager, Admin |
| Back to Equipment | Detail page breadcrumb | Navigate to `/equipment` | Any |
| View Assigned Staff | Equipment detail link | Navigate to staff detail page | Any |
| View Site | Key detail site link | Navigate to site detail page | Any |
| Filter by Condition | Equipment list filter bar | Filter by condition status | Any |
| Filter by Type | Equipment list filter bar | Filter by equipment type | Any |
| Search | Equipment list search bar | Search equipment by name, serial, asset tag | Any |
