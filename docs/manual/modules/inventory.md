# Inventory

> Track supplies, manage stock, and handle orders.

**Route:** `/inventory`
**Sidebar icon:** Package
**Accent color:** Teal (#14b8a6)
**Default tab:** Supplies

---

## What This Module Is

The Inventory module manages all cleaning supplies and consumables.
It tracks what you have, where it is, and when you need more.

The **supply catalog** contains 64 standard cleaning items.
Supplies are assigned to sites, counted regularly, and reordered as needed.

**Kits** are pre-built bundles of supplies.
**Site assignments** show which supplies go to which sites.
**Counts** are physical inventory counts.
**Orders** track purchase orders and deliveries.
**Vendors** are the suppliers you buy from.

## When to Use It

- Look up a supply item
- Assign supplies to a client site
- Conduct a physical inventory count
- Create a supply order
- Track supply usage
- Submit a supply request
- Manage vendor relationships

---

## Quick Win

1. Click **Inventory** in the sidebar.
2. You are on the **Supplies** tab.
3. See the supply catalog with names, codes, categories, and stock levels.
4. Click any row to open the supply detail page.
5. Use search to find a specific item.

---

## Common Tasks

### Add a New Supply Item

1. Go to **Inventory** > **Supplies** tab.
2. Click **+ New Supply** (top right).
3. Enter the **Supply Name** (required).
4. Set the **Category** (Chemicals, Paper, Equipment, etc.).
5. Set the **Unit of Measure** (Each, Case, Gallon, etc.).
6. Set the **Reorder Point** (minimum stock level).
7. Click **Save**.

**Expected result:** Supply item appears in the catalog.

### Assign Supplies to a Site

1. Go to **Inventory** > **Site Assignments** tab.
2. Click **+ New Assignment**.
3. Select the **Site**.
4. Select the **Supply** item.
5. Set the **Quantity** assigned.
6. Click **Save**.

**Expected result:** The supply is linked to the site. Shows in the site detail page too.

### Conduct an Inventory Count

1. Go to **Inventory** > **Counts** tab.
2. Click **+ New Count**.
3. Select the **Location** (warehouse or site).
4. The count form lists all expected items.
5. Enter the **Actual Quantity** for each item.
6. Add notes for discrepancies.
7. Click **Submit Count**.

**Expected result:** Count appears in the list. Discrepancies are flagged.

> **Stop Point:** Count is submitted. Review discrepancies and adjust stock levels.

### Create a Supply Order

1. Go to **Inventory** > **Orders** tab.
2. Click **+ New Order**.
3. Select the **Vendor**.
4. Add line items: supply, quantity, unit price.
5. Set the **Expected Delivery Date**.
6. Click **Submit Order**.

**Expected result:** Order appears in the list with PENDING status.

### Log Supply Usage

1. Open a supply detail page.
2. Click **Log Usage**.
3. Enter the quantity used, date, and site.
4. Click **Save**.

**Expected result:** Usage is recorded. Stock level adjusts.

### Submit a Supply Request

1. Use the **supply-request-form** (available to field staff).
2. Select the **Supply** item.
3. Enter the **Quantity** needed.
4. Select the **Site** where it is needed.
5. Add a reason.
6. Click **Submit**.

**Expected result:** Request is submitted for manager approval.

---

## Screens & Views (8 Tabs)

### Supply Catalog (`?tab=supplies`)

The supply catalog. Shows:
- Supply name, code, category, unit, current stock, reorder point
- **Card view** available
- Search by name or code

Click any row to open `/inventory/supplies/[id]`.

### Kits (`?tab=kits`)

Pre-built supply bundles. Shows:
- Kit name, items included, total value
- Use kits for standard site setup

### Site Assignments (`?tab=site-assignments`)

Which supplies are assigned to which sites. Shows:
- Site name, supply, assigned quantity, last restocked date

### Counts (`?tab=counts`)

Physical inventory count records. Shows:
- Count date, location, counted by, discrepancy flag, status

Click any row to open `/inventory/counts/[id]`.

### Orders (`?tab=orders`)

Purchase orders. Shows:
- Order number, vendor, order date, expected delivery, total, status
- **Status filter chips:** PENDING, ORDERED, DELIVERED, CANCELED, All

### Forecasting (`?tab=forecasting`)

Supply usage forecasting and demand planning. Shows:
- Projected usage by supply and site
- Reorder recommendations based on consumption trends
- Seasonal demand patterns

### Warehouse (`?tab=warehouse`)

Warehouse inventory management. Shows:
- Warehouse locations and stock levels
- Transfer records between warehouses and sites
- Receiving and put-away tracking

### Vendors (`?tab=vendors`)

Supply vendors. Shows:
- Vendor name, contact, phone, email, items supplied
- Links to the Vendors module for full vendor management

---

## Detail Pages

### Supply Detail (`/inventory/supplies/[id]`)

- **Back link:** "Back to Inventory"
- **Header:** Supply name + code badge + category badge
- **Stat cards:** Current stock, reorder point, total usage this month, assigned sites
- **Sections:** Supply Info, Stock Levels, Usage History, Site Assignments, Order History
- **Actions:** Edit (opens supply-form), Log Usage, Reorder

### Inventory Count Detail (`/inventory/counts/[id]`)

- **Back link:** "Back to Inventory"
- **Header:** Count code + date + location
- **Sections:** Count Summary, Line Items (expected vs actual), Discrepancies, Notes
- **Actions:** Approve Count, Adjust Stock

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Supply** | Supplies tab | Opens supply-form | Owner, Manager |
| **+ New Count** | Counts tab | Opens inventory-count-form | Owner, Manager, Supervisor |
| **+ New Order** | Orders tab | Opens supply-order-form | Owner, Manager |
| **Log Usage** | Supply detail | Opens supply-usage-form | Supervisor+ |
| **Submit Request** | Supply request | Opens supply-request-form | All staff |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | Manager+ |

---

## Forms

### Supply Form (`supply-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Supply Name | Text | Yes | Name of the supply item |
| Category | Select | No | Chemicals, Paper, Equipment, etc. |
| Unit of Measure | Select | No | Each, Case, Gallon, Box, etc. |
| Reorder Point | Number | No | Minimum stock before reorder |
| Cost per Unit | Number | No | Purchase price |
| Description | Textarea | No | Item description |
| Vendor | Select | No | Preferred vendor |

### Supply Order Form (`supply-order-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Vendor | Select | Yes | Which vendor to order from |
| Line Items | Repeater | Yes | Supply + quantity + unit price |
| Expected Delivery | Date | No | When you expect the order |
| Notes | Textarea | No | Special instructions |

### Supply Usage Form (`supply-usage-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Supply | Select | Yes | Which supply was used |
| Quantity | Number | Yes | How much was used |
| Site | Select | Yes | Where it was used |
| Date | Date | Yes | When it was used |
| Notes | Textarea | No | Usage context |

### Supply Request Form (`supply-request-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Supply | Select | Yes | What is needed |
| Quantity | Number | Yes | How much |
| Site | Select | Yes | Where it is needed |
| Urgency | Select | No | Normal, Urgent |
| Reason | Textarea | No | Why it is needed |

### Inventory Count Form (`inventory-count-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Location | Select | Yes | Warehouse or site |
| Date | Date | Yes | Count date |
| Line Items | Repeater | Yes | Supply + expected qty + actual qty |
| Notes | Textarea | No | Discrepancy notes |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No supplies | Empty state: "No supplies in the catalog" | Click **+ New Supply** |
| No counts | Empty state: "No inventory counts" | Click **+ New Count** |
| No orders | Empty state: "No orders found" | Click **+ New Order** |
| Loading | Skeleton animation | Wait for data to load |
| Error toast | "Could not load inventory" | Refresh the page and try again |

---

## Troubleshooting

> **If** stock levels seem wrong → Conduct a new inventory count to reconcile.

> **If** a supply is not assignable to a site → Check that the supply exists in the catalog first.

> **If** orders are not updating → Check the order status. Only PENDING orders can be edited.

> **If** you cannot submit a request → All staff can submit requests. Check you are logged in.

> **If** the supply catalog seems incomplete → The default catalog has 64 items. Custom items need to be added manually.

---

## Related Modules

- [Clients](./clients.md) — Sites where supplies are assigned
- [Vendors](./vendors.md) — Supply vendors for ordering
- [Equipment](./equipment.md) — Equipment that uses supplies (e.g., vacuum bags)
- [Reports](./reports.md) — Inventory usage reports
