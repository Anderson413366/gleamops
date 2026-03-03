# Equipment

> Track equipment, vehicles, keys, assignments, and maintenance.

**Route:** `/equipment`
**Sidebar icon:** Wrench
**Accent color:** Violet (#a855f7)
**Default tab:** Equipment

---

## What This Module Is

The Equipment module manages all physical assets your company uses.
This includes cleaning machines, vehicles, building keys, and their maintenance.

**Equipment** items are tools and machines (vacuums, floor scrubbers, buffers).
**Assignments** track who has what equipment and where it is.
**Keys** are building access keys and key cards assigned to staff.
**Vehicles** are company fleet vehicles.
**Maintenance** records track repairs, inspections, and service history.

The legacy route `/assets` also points to this module.

## When to Use It

- Add a new piece of equipment
- Assign equipment to a staff member or site
- Report an equipment issue
- Track building keys
- Add or edit a company vehicle
- Log maintenance and repairs

---

## Quick Win

1. Click **Equipment** in the sidebar.
2. You are on the **Equipment** tab.
3. See all equipment with name, code, type, status, and assigned-to info.
4. Click any row to open the equipment detail page.
5. Click **+ New Equipment** to add an item.

---

## Common Tasks

### Add New Equipment

1. Go to **Equipment** > **Equipment** tab.
2. Click **+ New Equipment** (top right).
3. Enter the **Equipment Name** (required).
4. Set the **Type** (Vacuum, Floor Scrubber, Buffer, etc.).
5. Enter the **Serial Number** if applicable.
6. Set the **Purchase Date** and **Cost**.
7. Click **Save**.

**Expected result:** Equipment appears in the list with an auto-generated code.

### Assign Equipment to Staff

1. Go to **Equipment** > **Assignments** tab.
2. Click **+ New Assignment**.
3. Select the **Equipment** item.
4. Select the **Staff Member**.
5. Set the **Assignment Date**.
6. Click **Save**.

**Expected result:** The assignment shows who has the equipment and since when.

### Report an Equipment Issue

1. Open an equipment detail page.
2. Click **Report Issue**.
3. Describe the problem.
4. Set the **Severity** (Low, Medium, High, Critical).
5. Click **Submit**.

**Expected result:** Issue is logged. Triggers a maintenance workflow.

### Add a Building Key

1. Go to **Equipment** > **Keys** tab.
2. Click **+ New Key**.
3. Enter the **Key Label** (e.g., "Front Door - Office A").
4. Select the **Site** this key belongs to.
5. Assign to a **Staff Member** if applicable.
6. Click **Save**.

**Expected result:** Key appears in the keys list with assignment info.

### Add a Vehicle

1. Go to **Equipment** > **Vehicles** tab.
2. Click **+ New Vehicle**.
3. Enter **Make**, **Model**, **Year**.
4. Enter the **License Plate** and **VIN**.
5. Set the **Assigned Driver** (staff member).
6. Click **Save**.

**Expected result:** Vehicle appears in the fleet list.

### Log Maintenance

1. Go to **Equipment** > **Maintenance** tab.
2. Click **+ New Maintenance Record**.
3. Select the **Equipment** or **Vehicle**.
4. Set the **Maintenance Type** (Repair, Inspection, Preventive, etc.).
5. Enter the **Date**, **Cost**, and **Description**.
6. Click **Save**.

**Expected result:** Maintenance record is logged against the asset.

---

## Screens & Views (5 Tabs)

### Equipment (`?tab=equipment`)

All equipment items. Shows:
- Equipment code, name, type, status, serial number, assigned to
- **Card view** available
- Status filter chips

Click any row to open `/assets/equipment/[code]`.

### Assignments (`?tab=assignments`)

Equipment-to-staff assignments. Shows:
- Equipment name, assigned staff, assignment date, return date, status

### Keys (`?tab=keys`)

Building access keys and cards. Shows:
- Key label, site, assigned staff, key type, status

Click any row to open `/assets/keys/[id]`.

### Vehicles (`?tab=vehicles`)

Company fleet. Shows:
- Make, model, year, license plate, assigned driver, mileage, status
- **Card view** available

Click any row to open `/assets/vehicles/[id]`.

### Maintenance (`?tab=maintenance`)

Maintenance records for all assets. Shows:
- Asset name, maintenance type, date, cost, status, technician

---

## Detail Pages

### Equipment Detail (`/assets/equipment/[code]`)

- **Back link:** "Back to Equipment"
- **Header:** Equipment name + code badge + status badge
- **Stat cards:** Total maintenance cost, last service date, days since last service, assignment count
- **Sections:** Equipment Info, Serial/Model Details, Current Assignment, Maintenance History, Issues
- **Actions:** Edit (opens equipment-form), Report Issue, Assign

### Vehicle Detail (`/assets/vehicles/[id]`)

- **Back link:** "Back to Equipment"
- **Header:** Vehicle (make model year) + license plate + status badge
- **Sections:** Vehicle Info, Driver Assignment, Mileage Log, Maintenance History, DVIR Inspections

### Key Detail (`/assets/keys/[id]`)

- **Back link:** "Back to Equipment"
- **Header:** Key label + site name + assignment info
- **Sections:** Key Info, Site Details, Assignment History

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Equipment** | Equipment tab | Opens equipment-form | Owner, Manager |
| **+ New Assignment** | Assignments tab | Opens equipment-assignment-form | Owner, Manager, Supervisor |
| **Report Issue** | Equipment detail | Opens equipment-issue-form | All staff |
| **+ New Key** | Keys tab | Opens key-form | Owner, Manager |
| **+ New Vehicle** | Vehicles tab | Opens vehicle-form | Owner, Manager |
| **+ New Maintenance** | Maintenance tab | Opens maintenance-form | Owner, Manager |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | Manager+ |

---

## Forms

### Equipment Form (`equipment-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Equipment Name | Text | Yes | Name/description |
| Type | Select | No | Vacuum, Floor Scrubber, Buffer, etc. |
| Serial Number | Text | No | Manufacturer serial number |
| Purchase Date | Date | No | When it was bought |
| Purchase Cost | Number | No | How much it cost |
| Status | Select | No | Active, In Repair, Retired |
| Notes | Textarea | No | Additional info |

### Equipment Assignment Form (`equipment-assignment-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Equipment | Select | Yes | Which item |
| Staff Member | Select | Yes | Who gets it |
| Assignment Date | Date | Yes | When assigned |
| Expected Return | Date | No | When it should come back |
| Notes | Textarea | No | Assignment notes |

### Equipment Issue Form (`equipment-issue-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Equipment | Select | Yes | Which item has the issue |
| Description | Textarea | Yes | What is wrong |
| Severity | Select | Yes | Low, Medium, High, Critical |
| Photos | File upload | No | Pictures of the issue |

### Key Form (`key-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Key Label | Text | Yes | Description of the key |
| Site | Select | Yes | Which building |
| Key Type | Select | No | Physical Key, Key Card, Code |
| Assigned To | Select | No | Staff member |
| Notes | Textarea | No | Access instructions |

### Vehicle Form (`vehicle-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Make | Text | Yes | Vehicle manufacturer |
| Model | Text | Yes | Vehicle model |
| Year | Number | Yes | Model year |
| License Plate | Text | No | Plate number |
| VIN | Text | No | Vehicle identification number |
| Assigned Driver | Select | No | Primary driver |
| Mileage | Number | No | Current odometer reading |

### Maintenance Form (`maintenance-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Asset | Select | Yes | Equipment or vehicle |
| Maintenance Type | Select | Yes | Repair, Inspection, Preventive |
| Date | Date | Yes | When it was done |
| Cost | Number | No | Maintenance cost |
| Technician | Text | No | Who did the work |
| Description | Textarea | No | What was done |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No equipment | Empty state: "No equipment in the system" | Click **+ New Equipment** |
| No vehicles | Empty state: "No vehicles added" | Click **+ New Vehicle** |
| No keys | Empty state: "No keys tracked" | Click **+ New Key** |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load equipment" | Refresh the page and try again |

---

## Troubleshooting

> **If** equipment does not appear → Check the status filter. Retired items may be hidden.

> **If** you cannot assign equipment → The item must exist first. Create it, then assign.

> **If** maintenance history is empty → No maintenance records have been logged yet.

> **If** vehicle DVIR inspections are missing → DVIR inspections are logged through the fleet module.

> **If** a key assignment fails → Check that the staff member has ACTIVE status.

---

## Related Modules

- [Team](./team.md) — Staff members who use equipment
- [Clients](./clients.md) — Sites where equipment is used and keys are assigned
- [Inventory](./inventory.md) — Supplies used with equipment (e.g., vacuum bags)
- [Safety](./safety.md) — Equipment-related safety certifications

---

## QA Fixes (March 2026)

### Asset List
- Added IN_SERVICE to condition filter tabs (all 9 items now visible under "In service" tab).
- Added IN_SERVICE: green to EQUIPMENT_CONDITION_COLORS constant.
- Widened equipment name column from 220px to 320px.
- All 4 Asset KPIs converted from HEAD (503) to GET.

### Assigned Gear
- Empty state is now search-aware ("No matching assignments" vs "No assignments yet").

### Keys
- Key creation form now includes "Assigned To" staff dropdown (47 active staff).
- Key codes auto-generated via next_code RPC with KEY prefix (editable fallback).

### Fleet
- Vehicle creation form now includes "Assigned To" staff dropdown.
- Vehicle codes auto-generated via next_code RPC with VEH prefix (editable fallback).
- Make/Model column is now sortable.

### Maintenance
- **Critical fix:** Added "Vehicle / Equipment" dropdown to maintenance form (was missing — created orphaned records).
- Service date default uses local timezone instead of UTC.
- Table headers render even with 0 records.
- Added Export CSV button.
- Empty state is search-aware.
