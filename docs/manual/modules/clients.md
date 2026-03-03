# Clients

> Manage your client companies, their sites, and the people you work with.

**Route:** `/clients`
**Sidebar icon:** Building2
**Accent color:** Purple (#8b5cf6)
**Default tab:** Clients

---

## What This Module Is

The Clients module is the customer directory for GleamOps.
It stores three connected things: clients, sites, and contacts.
A client is a company. A site is a physical location that belongs to a client.
A contact is a person at a client or site.

This is where all customer data lives.
Jobs, bids, proposals, and schedules all point back here.

## When to Use It

- Add a new client company
- Add a site (building) under a client
- Add a contact person for a client or site
- Review client requests
- Change a client status (Active, Inactive, Prospect, etc.)
- Look up a site address or contact phone number

---

## Quick Win

1. Click **Clients** in the sidebar.
2. You are on the **Clients** tab (table view).
3. See a list of all client companies with status badges.
4. Click any row to open the client detail page.
5. Click **+ New Client** to add a client.

---

## Common Tasks

### Add a New Client

1. Go to **Clients** > **Clients** tab.
2. Click **+ New Client** (top right).
3. Fill in the **Company Name** (required).
4. Set the **Client Type** (Commercial, Residential, etc.).
5. Set the **Status** (defaults to PROSPECT).
6. Add address, phone, email as needed.
7. Click **Save**.

**Expected result:** The client appears in the table with a new code (CLI-NNNN).

> **Stop Point:** Client is created. You can add sites and contacts next.

### Add a Site to a Client

1. Go to **Clients** > **Sites** tab.
2. Click **+ New Site**.
3. Select the **Client** from the dropdown.
4. Enter the **Site Name** (required).
5. Enter the address fields.
6. Set the **Site Type** (Office, Warehouse, Medical, etc.).
7. Click **Save**.

**Expected result:** The site appears in the sites table with a new code (SIT-NNNN).

### Add a Contact

1. Go to **Clients** > **Contacts** tab.
2. Click **+ New Contact**.
3. Enter **First Name** and **Last Name**.
4. Select the **Client** they belong to.
5. Optionally select a **Site**.
6. Add phone, email, and job title.
7. Click **Save**.

**Expected result:** The contact appears in the contacts table with a new code (CON-NNNN).

### Change a Client Status

1. Open a client detail page (click a row in the table).
2. Click the **Status** button or **Deactivate** button.
3. Select the new status from the dialog.
4. Confirm.

**Expected result:** The status badge updates. Status transitions are enforced by the database.

---

## Screens & Views (4 Tabs)

### Clients (`?tab=clients`)

The main client directory. Shows:
- **Table view:** Company name, code, status, type, phone, email
- **Card view:** Avatar circle with company initials, name, status badge
- **Status filter chips:** ACTIVE, INACTIVE, PROSPECT, ON_HOLD, CANCELED, All

Click any row to open the client detail page at `/clients/[id]`.

### Sites (`?tab=sites`)

All sites across all clients. Shows:
- Site name, code, client name, address, type, status
- Status filter chips for site statuses

Click any row to open the site detail page at `/clients/sites/[id]`.

### Contacts (`?tab=contacts`)

All contacts across all clients and sites. Shows:
- Name, code, client, site, phone, email, job title
- Search by name or email

Click any row to open the contact detail page at `/clients/contacts/[code]`.

### Requests (`?tab=requests`)

Client service requests and inquiries.
Used for tracking inbound requests from clients.

---

## Detail Pages

### Client Detail (`/clients/[id]`)

- **Back link:** "Back to Clients"
- **Header:** Avatar circle + company name + CLI code badge + status badge
- **ProfileCompletenessCard:** Tracks filled fields
- **Stat cards:** Sites count, contacts count, active jobs, total contract value
- **Sections:** Company Info, Address, Billing, Notes
- **Actions:** Edit (opens client-form), Deactivate/Reactivate
- **ActivityHistorySection:** Audit trail
- **Metadata footer:** Created / Updated dates

### Site Detail (`/clients/sites/[id]`)

- **Back link:** "Back to Clients"
- **Header:** Avatar circle + site name + SIT code badge + status badge
- **Sections:** Site Info, Address, Access Details, Compliance, Assigned Supplies
- **Related:** Link to parent client, assigned jobs, assigned staff

### Contact Detail (`/clients/contacts/[code]`)

- **Back link:** "Back to Clients"
- **Header:** Avatar circle + contact name + CON code badge
- **Sections:** Contact Info, Client/Site assignment, Communication preferences

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Client** | Clients tab, top right | Opens client-form | Owner, Manager, Sales |
| **+ New Site** | Sites tab, top right | Opens site-form | Owner, Manager |
| **+ New Contact** | Contacts tab, top right | Opens contact-form | Owner, Manager, Sales |
| View toggle (List/Card) | Top right | Switches between table and card view | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | All |
| **Edit** | Detail page | Opens the entity form for editing | Owner, Manager |
| **Deactivate** | Detail page | Opens status change dialog | Owner, Manager |

---

## Forms

### Client Form (`client-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes | Legal company name |
| Client Type | Select | No | Commercial, Residential, etc. |
| Status | Select | No | ACTIVE, INACTIVE, PROSPECT, ON_HOLD, CANCELED |
| Phone | Text | No | Main phone number |
| Email | Text | No | Main email address |
| Website | Text | No | Company website URL |
| Address fields | Text | No | Street, city, state, zip |
| Notes | Textarea | No | Internal notes |

### Site Form (`site-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Site Name | Text | Yes | Name of the location |
| Client | Select | Yes | Parent client |
| Site Type | Select | No | Office, Warehouse, Medical, etc. |
| Address fields | Text | No | Street, city, state, zip |
| Square Footage | Number | No | Total cleanable area |
| Access Instructions | Textarea | No | How to get into the building |

### Contact Form (`contact-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| First Name | Text | Yes | Contact first name |
| Last Name | Text | Yes | Contact last name |
| Client | Select | Yes | Which client they belong to |
| Site | Select | No | Specific site (optional) |
| Job Title | Text | No | Their role at the company |
| Phone | Text | No | Contact phone |
| Email | Text | No | Contact email |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No clients | Empty state: "No clients yet" | Click **+ New Client** to add one |
| No sites | Empty state: "No sites found" | Click **+ New Site** to add one |
| No contacts | Empty state: "No contacts found" | Click **+ New Contact** to add one |
| Loading | Skeleton animation in table | Wait for data to load |
| Error toast | "Could not load clients" | Refresh the page and try again |

---

## Troubleshooting

> **If** you cannot find a client → Check the status filter. It defaults to ACTIVE. Click "All" to see all statuses.

> **If** you cannot create a client → Check your role. Sales, Manager, and Owner can create clients.

> **If** a site does not appear under a client → Verify the site is linked to the correct client in the site form.

> **If** the client code is missing → Codes are auto-generated (CLI-NNNN). They appear after saving.

> **If** you cannot deactivate a client → Check if there are active jobs linked to this client.

---

## Related Modules

- [Jobs](./jobs.md) — Service plans and tickets linked to client sites
- [Pipeline](./pipeline.md) — Prospects and bids for potential clients
- [Schedule](./schedule.md) — Shifts assigned to client sites
- [Inventory](./inventory.md) — Supplies assigned to sites

---

## QA Fixes (March 2026)

### Tab-Specific KPIs
KPIs are now tab-aware instead of showing the same 4 generic metrics on all tabs:
- **Clients tab:** Total Clients, Active Clients, Total Sites, Active Sites
- **Sites tab:** Total Sites, Active Sites, Total Clients, Active Clients
- **Contacts tab:** Total Contacts, Primary Contacts, With Email, With Phone
- **Requests tab:** Open Requests (warn), Approved, Rejected, Total Requests

### Requests Tab
- Empty state now renders table header with 7 column headers above the EmptyState component.
