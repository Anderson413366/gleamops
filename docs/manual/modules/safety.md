# Safety

> Track certifications, training, and incidents for your workforce.

**Route:** `/safety`
**Sidebar icon:** ShieldCheck
**Accent color:** Red (#ef4444)
**Default tab:** Certifications

---

## What This Module Is

The Safety module manages workplace safety compliance.
It tracks three things: certifications, training, and incidents.

**Certifications** are credentials that staff must hold (OSHA, bloodborne pathogens, etc.).
**Training** courses teach staff what they need to know.
**Incidents** are workplace accidents, injuries, or biohazard events.

Certifications expire. Training needs to be renewed.
This module helps you stay compliant and keep your team safe.

## When to Use It

- Track which staff hold which certifications
- Assign and schedule training courses
- Report a workplace incident or biohazard
- View the safety calendar for upcoming expirations
- Ensure compliance before audit season

---

## Quick Win

1. Click **Safety** in the sidebar.
2. You are on the **Certifications** tab.
3. See all staff certifications with expiration dates.
4. Red badges indicate expired certifications.
5. Yellow badges indicate certifications expiring soon.

---

## Common Tasks

### Track a Staff Certification

1. Go to **Safety** > **Certifications** tab.
2. Find the staff member or click **+ New Certification** (UNVERIFIED — may be added through staff detail).
3. Select the **Certification Type** (OSHA 10, OSHA 30, Bloodborne Pathogens, etc.).
4. Set the **Issue Date** and **Expiration Date**.
5. Upload the certificate document if available.
6. Click **Save**.

**Expected result:** Certification appears in the list. Expiration warnings trigger automatically.

### Assign a Training Course

1. Go to **Safety** > **Training** tab.
2. Click **+ New Training Course**.
3. Enter the **Course Name** and **Description**.
4. Set the **Training Type** (Online, In-Person, Video).
5. Set the **Duration** and **Due Date**.
6. Assign **Staff Members** who need to complete it.
7. Click **Save**.

**Expected result:** Training course appears. Assigned staff see it in their tasks.

### Report an Incident

1. Go to **Safety** > **Incidents** tab.
2. Click **+ New Incident**.
3. Select the **Incident Type** (Injury, Slip/Fall, Biohazard, Property Damage, etc.).
4. Enter the **Date**, **Time**, and **Location** (site).
5. Describe what happened.
6. Select the **Staff Member** involved (uses `assigned_to_staff_id` from the issues table).
7. If biohazard, use the **biohazard-report-form** for additional fields.
8. Click **Submit**.

**Expected result:** Incident is logged. Notifications sent to management.

### View the Safety Calendar

1. Go to **Safety** > **Calendar** tab.
2. See upcoming events:
   - Certification expirations
   - Scheduled training sessions
   - Incident review dates
3. Use month/week/day views to navigate.

---

## Screens & Views (4 Tabs)

### Certifications (`?tab=certifications`)

Staff certifications. Shows:
- Staff name, certification type, issue date, expiration date, status
- **Color coding:** Green = valid, Yellow = expiring soon, Red = expired
- Search by staff name or certification type

### Training (`?tab=training`)

Training courses and completion. Shows:
- Course name, type, duration, assigned staff count, completion rate
- Click to see course details and staff completion status

### Incidents (`?tab=incidents`)

Workplace incidents. Shows:
- Incident date, type, location, staff involved, severity, status
- Incident records use the `issues` table with `assigned_to_staff_id` for the involved staff member

### Calendar (`?tab=calendar`)

Safety calendar view. Shows:
- Certification expirations
- Training session dates
- Incident follow-up dates
- Standard month/week/day views

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Training Course** | Training tab | Opens training-course-form | Owner, Manager |
| **+ New Incident** | Incidents tab | Opens incident form | All staff |
| **Biohazard Report** | Incident form | Opens biohazard-report-form | All staff |
| **Export** | Top right area | Downloads CSV | Manager+ |
| Search | Top area | Filter by name or type | All |

---

## Forms

### Training Course Form (`training-course-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Course Name | Text | Yes | Training course title |
| Description | Textarea | No | What the training covers |
| Training Type | Select | No | Online, In-Person, Video |
| Duration | Number | No | Length in hours |
| Due Date | Date | No | When it must be completed by |
| Assigned Staff | Multi-select | No | Who needs to take it |

### Biohazard Report Form (`biohazard-report-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Incident Date | Date | Yes | When it happened |
| Location | Select | Yes | Which site |
| Biohazard Type | Select | Yes | Blood, Body Fluid, Chemical, etc. |
| Staff Involved | Select | Yes | Who was involved (assigned_to_staff_id) |
| Description | Textarea | Yes | What happened |
| PPE Used | Checkbox group | No | Which PPE was worn |
| Cleanup Method | Textarea | No | How it was cleaned |
| Medical Attention | Toggle | No | Was medical care needed |
| Photos | File upload | No | Documentation photos |
| Witnesses | Textarea | No | Witness names and statements |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No certifications | Empty state: "No certifications tracked" | Add certifications through staff records |
| No training courses | Empty state: "No training courses" | Click **+ New Training Course** |
| No incidents | Empty state: "No incidents reported" (this is good) | Only report when incidents occur |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load safety data" | Refresh the page and try again |

---

## Troubleshooting

> **If** certifications are not showing for a staff member → Check that certifications have been entered. They may need to be added manually.

> **If** expiration warnings are not appearing → Verify the expiration date is set correctly on the certification.

> **If** you cannot report an incident → All staff can report incidents. Check you are logged in.

> **If** biohazard report fields are missing → Make sure you selected the biohazard incident type to see the extended form.

> **If** training completion is not updating → Staff must mark their training as complete through self-service.

---

## Related Modules

- [Team](./team.md) — Staff members who hold certifications
- [Clients](./clients.md) — Sites where incidents occur
- [Equipment](./equipment.md) — Equipment-related safety certifications
- [Settings](./settings.md) — Certification types and training categories in lookups

---

## QA Fixes (March 2026)

### All Tabs
- All 4 Compliance KPIs converted from HEAD (503) to GET.
- KPIs now tab-aware: incidents tab shows different metrics than other tabs.

### Incidents
- Added "Assigned To" staff dropdown (persists assigned_to_staff_id).
- Added Status dropdown: Open, In Progress, Resolved, Closed.
- Due date auto-fills with today's local date.
- Empty state is search-aware.
- **Incidents tab KPIs:** Open Incidents (warn), High/Critical (warn), Total Incidents, Resolved.

### Expiration Tracker
- Added 'expiration-tracker' as URL tab alias (works alongside canonical 'calendar' param).
