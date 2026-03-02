# Settings

> Configure system-wide settings, lookups, and data management.

**Route:** `/settings`
**Sidebar icon:** Settings (Cog)
**Accent color:** Slate (#64748b)
**Default tab:** General

---

## What This Module Is

The Settings module controls system-wide configuration.
This is the admin control panel for your GleamOps account.

**Lookups** are dropdown values used across the system (client types, site types, status codes, etc.).
**Geofences** define geographic boundaries around sites for clock-in verification.
**Rules** set business rules and automation triggers.
**Data Hub** manages data import/export operations.
**Sequences** control entity code generation (CLI-NNNN, STF-NNNN, etc.).
**Import** handles bulk data loading from CSV files.
**Schedule Settings** configure scheduling behavior.

This module is restricted to **Owner/Admin** roles only.

## When to Use It

- Configure company information
- Add or edit lookup dropdown values
- Set up geofences around client sites
- Define business rules
- Import data from spreadsheets
- Manage code sequences
- Configure schedule settings

---

## Quick Win

1. Click **Settings** in the sidebar (Owner/Admin only).
2. You are on the **General** tab.
3. See company-level settings: company name, address, timezone, etc.
4. Click **Edit** to update any setting.

---

## Common Tasks

### Edit Company Information

1. Go to **Settings** > **General** tab.
2. See company name, address, phone, email, timezone.
3. Click **Edit** to update.
4. Save changes.

**Expected result:** Company info updates across the system (headers, PDFs, etc.).

### Add a Lookup Value

1. Go to **Settings** > **Lookups** tab.
2. Select the **Lookup Category** (Client Type, Site Type, Leave Type, etc.).
3. Click **+ New Lookup**.
4. Enter the **Label** and **Value**.
5. Set the **Sort Order**.
6. Click **Save**.

**Expected result:** The new value appears in dropdown menus across the relevant modules.

### Create a Geofence

1. Go to **Settings** > **Geofences** tab.
2. Click **+ New Geofence**.
3. Select the **Site**.
4. Set the **Latitude** and **Longitude** (or use map picker).
5. Set the **Radius** in meters.
6. Click **Save**.

**Expected result:** Staff must be within the geofence radius to clock in at this site.

### Import Data

1. Go to **Settings** > **Import** tab.
2. Select the **Entity Type** (Clients, Sites, Staff, etc.).
3. Download the **CSV Template**.
4. Fill in your data following the template format.
5. Upload the CSV file.
6. Review the import preview.
7. Click **Import**.

**Expected result:** Records are created from the CSV data. Errors are reported for invalid rows.

### Manage Sequences

1. Go to **Settings** > **Sequences** tab.
2. See all entity code sequences: CLI, SIT, CON, STF, etc.
3. View the current counter for each prefix.
4. Sequences auto-increment. Manual adjustment is rare.

---

## Screens & Views (8 Tabs)

### General (`?tab=general`)

Company-wide settings.
- Company name, address, phone, email
- Timezone, locale, currency
- Logo upload

### Lookups (`?tab=lookups`)

System dropdown values. Shows:
- Categories: Client Type, Site Type, Leave Type, Equipment Type, etc.
- Values within each category with sort order
- Toggle active/inactive

### Geofences (`?tab=geofences`)

Geographic boundaries for sites. Shows:
- Site name, latitude, longitude, radius
- Map visualization (UNVERIFIED)

### Rules (`?tab=rules`)

Business rules and automation. Shows:
- Rule name, entity type, trigger condition, action
- Enable/disable toggles

### Data Hub (`?tab=data-hub`)

Central data management. Shows:
- Data quality dashboard
- Hygiene scan results
- Data validation reports

### Sequences (`?tab=sequences`)

Entity code sequences. Shows:
- Prefix, current counter, padding, example output
- CLI-1001, SIT-2050, STF-0001, etc.

### Import (`?tab=import`)

Bulk data import. Shows:
- Entity type selector
- CSV template download
- Upload and preview interface
- Import history

### Schedule Settings (`?tab=schedule-settings`)

Schedule configuration. Shows:
- Work week definition (which days)
- Default shift durations
- Schedule period types
- Overtime rules

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **Edit** | General tab | Opens settings editor | Owner |
| **+ New Lookup** | Lookups tab | Opens lookup-form | Owner, Admin |
| **+ New Geofence** | Geofences tab | Opens geofence-form | Owner, Admin |
| **Import** | Import tab | Starts CSV import | Owner, Admin |
| **Download Template** | Import tab | Downloads CSV template | Owner, Admin |
| **Run Hygiene Scan** | Data Hub tab | Triggers data quality scan | Owner, Admin |

---

## Forms

### Lookup Form (`lookup-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Category | Select | Yes | Which lookup category |
| Label | Text | Yes | Display label |
| Value | Text | Yes | Stored value |
| Sort Order | Number | No | Display order (lower = first) |
| Active | Toggle | No | Whether this value is selectable |

### Geofence Form (`geofence-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Site | Select | Yes | Which site |
| Latitude | Number | Yes | GPS latitude |
| Longitude | Number | Yes | GPS longitude |
| Radius | Number | Yes | Boundary radius in meters |
| Notes | Textarea | No | Special instructions |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No lookups for category | Empty list | Click **+ New Lookup** |
| No geofences | Empty state: "No geofences set up" | Click **+ New Geofence** |
| Import errors | Red rows in preview | Fix the CSV data and re-upload |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not save settings" | Refresh and try again |

---

## Troubleshooting

> **If** you cannot access Settings → Only Owner/Admin roles have access.

> **If** a lookup value is not appearing in dropdowns → Check that the lookup is set to Active.

> **If** geofence clock-in fails → Verify the radius is large enough. GPS can drift 10-50 meters.

> **If** CSV import fails → Download the template and check your data matches the expected columns and formats.

> **If** sequences are out of order → Sequences auto-increment. Contact support if a sequence needs manual correction.

> **If** schedule settings are not taking effect → Settings apply to new schedules. Existing schedules keep their original settings.

---

## Related Modules

- All modules use lookups defined here
- [Schedule](./schedule.md) — Uses schedule settings
- [Shifts & Time](./shifts-time.md) — Uses geofences for clock-in verification
- [Clients](./clients.md) — Uses client type and site type lookups
- [Team](./team.md) — Uses position types and leave types
