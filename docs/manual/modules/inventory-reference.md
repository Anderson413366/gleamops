# Inventory Module Reference

## Field Dictionary

### Supply Item

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique supply item identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| name | string | Yes | 1-200 chars | Supply item name |
| sku | string | No | Unique per tenant | Stock keeping unit code |
| category | string | No | 1-100 chars | Item category (e.g. "Chemicals", "Paper Products") |
| unit | string | Yes | 1-50 chars | Unit of measure (e.g. "case", "gallon", "each") |
| current_quantity | decimal | Yes | >= 0 | Current stock level |
| reorder_point | decimal | No | >= 0 | Quantity that triggers reorder alert |
| reorder_quantity | decimal | No | > 0 | Default quantity to reorder |
| unit_cost | decimal | No | >= 0 | Cost per unit |
| vendor_id | UUID | No | Valid vendor | Preferred vendor |
| location | string | No | 1-100 chars | Storage location |
| notes | text | No | Max 1000 chars | Item notes |
| is_active | boolean | Yes | true/false | Whether item is actively tracked |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Supply Order

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique order identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| order_number | string | Auto | System-generated | Human-readable order number |
| vendor_id | UUID | Yes | Valid vendor | Vendor for this order |
| status | Enum | Yes | Valid SUPPLY_ORDER_STATUS | Current order status |
| order_date | date | Yes | Valid date | Date order was placed |
| expected_delivery | date | No | >= order_date | Expected delivery date |
| actual_delivery | date | No | Auto on delivery | Actual delivery date |
| total_amount | decimal | No | >= 0 | Total order cost |
| line_items | JSON | Yes | Valid line items array | Ordered items and quantities |
| notes | text | No | Max 1000 chars | Order notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Inventory Count

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique count identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| count_date | date | Yes | Valid date | Date of the inventory count |
| status | Enum | Yes | Valid COUNT_STATUS | Current count status |
| counted_by | UUID | Yes | Valid staff ID | Staff member performing count |
| location | string | No | 1-100 chars | Warehouse/storage location |
| items | JSON | Yes | Valid count items array | Items counted with quantities |
| variance_notes | text | No | Max 2000 chars | Notes on discrepancies |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### SUPPLY_ORDER_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Order is being prepared | SUBMITTED, CANCELED |
| SUBMITTED | gray | Order has been submitted for approval | ORDERED, CANCELED |
| ORDERED | blue | Order has been placed with vendor | SHIPPED, CANCELED |
| SHIPPED | yellow | Order has been shipped by vendor | DELIVERED |
| DELIVERED | green | Order has arrived at destination | RECEIVED |
| RECEIVED | green | Order has been inspected and accepted into inventory | -- |
| CANCELED | red | Order has been canceled | -- |

### COUNT_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Count is being prepared | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | yellow | Count is actively being performed | SUBMITTED, CANCELLED |
| SUBMITTED | blue | Count has been submitted for review | COMPLETED, CANCELLED |
| COMPLETED | green | Count has been reviewed and finalized, quantities updated | -- |
| CANCELLED | red | Count has been cancelled | -- |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Item | Supply list toolbar | Open supply item creation form | Manager, Admin, Owner |
| Edit Item | Item detail toolbar | Open supply item edit form | Manager, Admin, Owner |
| Adjust Quantity | Item detail toolbar | Open manual quantity adjustment dialog | Manager, Admin, Owner |
| Deactivate | Item detail action menu | Set is_active to false | Admin, Owner |
| + New Order | Orders tab toolbar | Open supply order creation form | Manager, Admin, Owner |
| Edit Order | Order detail toolbar | Open order edit form | Manager, Admin, Owner |
| Submit Order | Order detail toolbar | Transition DRAFT -> SUBMITTED | Manager, Admin, Owner |
| Place Order | Order detail toolbar | Transition SUBMITTED -> ORDERED | Manager, Admin, Owner |
| Mark Shipped | Order detail toolbar | Transition ORDERED -> SHIPPED | Manager, Admin, Owner |
| Mark Delivered | Order detail toolbar | Transition SHIPPED -> DELIVERED | Manager, Admin, Owner |
| Receive Order | Order detail toolbar | Transition DELIVERED -> RECEIVED, update quantities | Manager, Admin, Owner |
| Cancel Order | Order detail action menu | Transition -> CANCELED with confirmation | Admin, Owner |
| + New Count | Counts tab toolbar | Open inventory count form | Manager, Admin, Owner |
| Start Count | Count detail toolbar | Transition DRAFT -> IN_PROGRESS | Manager, Admin, Owner |
| Submit Count | Count detail toolbar | Transition IN_PROGRESS -> SUBMITTED | Manager, Admin, Owner |
| Complete Count | Count detail toolbar | Transition SUBMITTED -> COMPLETED | Admin, Owner |
| Cancel Count | Count detail action menu | Transition -> CANCELLED | Admin, Owner |
| View Vendor | Item detail vendor link | Navigate to vendor detail page | Any |
| Back to Inventory | Item/Order/Count detail breadcrumb | Navigate to `/inventory` | Any |
| Filter by Category | Supply list filter bar | Filter items by category | Any |
| Low Stock Alert | Supply list filter | Show items at or below reorder point | Any |
| Search | Supply list search bar | Search items by name or SKU | Any |
