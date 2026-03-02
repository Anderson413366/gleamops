# Vendors

> Manage subcontractors and supply vendors.

**Route:** `/vendors` (redirects to `/inventory?tab=vendors`)
**Sidebar icon:** Not in sidebar NAV_TREE (legacy route)
**Accent color:** Orange (#f97316)

---

## What This Module Is

The `/vendors` route is a **legacy redirect**. Navigating to `/vendors` automatically redirects to `/inventory?tab=vendors`.

Vendor management is distributed across two canonical modules:
- **Subcontractors** → available in the **Team** module (`/team?tab=subcontractors`, labeled "Partners")
- **Supply vendors** → available in the **Inventory** module (`/inventory?tab=vendors`)

Detail pages still render at their original paths:
- Subcontractor detail: `/vendors/subcontractors/[code]`
- Supply vendor detail: `/vendors/supply-vendors/[slug]`

## When to Use It

- Add a new subcontractor
- View subcontractor job assignments
- Manage supply vendor contacts
- Review vendor performance
- Update vendor information

---

## Quick Win

1. Navigate to `/vendors` in the URL bar (or click a vendor link from Team or Inventory).
2. You are on the **Subcontractors** tab.
3. See all subcontractors with name, contact, services, and status.
4. Click any row to open the subcontractor detail page.

---

## Common Tasks

### Add a New Subcontractor

1. Go to `/vendors` > **Subcontractors** tab.
2. Click **+ New Subcontractor**.
3. Enter the **Company Name** (required).
4. Add contact person name, phone, and email.
5. Describe the **Services** they provide.
6. Set insurance and license details.
7. Click **Save**.

**Expected result:** Subcontractor appears in the list with an auto-generated code.

> **Stop Point:** Subcontractor is created. They can now be assigned to jobs.

### View Subcontractor Jobs

1. Open a subcontractor detail page.
2. See the list of jobs they are assigned to.
3. Review their performance and hours.

### Manage Supply Vendors

1. Go to `/vendors` > **Vendors** tab.
2. See all supply vendors with contact info and supplied items.
3. Click any row to open the vendor detail page.

---

## Screens & Views (3 Tabs)

### Subcontractors (`?tab=subcontractors`)

Subcontractor directory. Shows:
- Company name, code, contact person, phone, email, services, status
- **Card view** available

Click any row to open `/vendors/subcontractors/[code]`.

### Jobs (`?tab=jobs`)

Jobs assigned to subcontractors. Shows:
- Subcontractor name, job code, site, dates, status
- Cross-reference with the Jobs module

### Vendors (`?tab=vendors`)

Supply vendor directory. Shows:
- Vendor name, slug, contact, phone, email, items supplied
- **Card view** available

Click any row to open `/vendors/supply-vendors/[slug]`.

---

## Detail Pages

### Subcontractor Detail (`/vendors/subcontractors/[code]`)

- **Back link:** "Back to Vendors"
- **Header:** Avatar circle + company name + code badge + status badge
- **Sections:** Company Info, Contact Info, Services, Insurance/License, Job History
- **Actions:** Edit (opens subcontractor-form), Deactivate
- **ActivityHistorySection:** Audit trail

### Supply Vendor Detail (`/vendors/supply-vendors/[slug]`)

- **Back link:** "Back to Vendors"
- **Header:** Vendor name + slug badge
- **Sections:** Vendor Info, Contact Info, Items Supplied, Order History

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Subcontractor** | Subcontractors tab | Opens subcontractor-form | Owner, Manager |
| View toggle (List/Card) | Top right | Switches view mode | All |
| **Export** | Top right area | Downloads CSV | Manager+ |
| **Edit** | Detail page | Opens the entity form for editing | Owner, Manager |
| **Deactivate** | Detail page | Opens status change dialog | Owner, Manager |

---

## Forms

### Subcontractor Form (`subcontractor-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes | Subcontractor company name |
| Contact Name | Text | No | Primary contact person |
| Phone | Text | No | Contact phone |
| Email | Text | No | Contact email |
| Services | Textarea | No | What services they provide |
| Insurance Number | Text | No | Insurance policy number |
| Insurance Expiration | Date | No | When insurance expires |
| License Number | Text | No | Business license number |
| Notes | Textarea | No | Additional notes |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No subcontractors | Empty state: "No subcontractors added" | Click **+ New Subcontractor** |
| No vendors | Empty state: "No supply vendors" | Add vendors through the Inventory module |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load vendors" | Refresh the page and try again |

---

## Troubleshooting

> **If** you cannot find the Vendors module in the sidebar → It is not in the sidebar. Navigate to `/vendors` directly.

> **If** subcontractors do not appear in Team → They should show in the Team > Subcontractors tab as well. Check the data.

> **If** supply vendors are missing → Supply vendors are typically added through the Inventory module's vendor management.

> **If** a subcontractor cannot be assigned to a job → Check their status is active and they have the right services listed.

---

## Related Modules

- [Team](./team.md) — Subcontractors tab links here
- [Inventory](./inventory.md) — Supply vendors tab links here
- [Jobs](./jobs.md) — Jobs that subcontractors are assigned to
