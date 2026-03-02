# Inventory, Assets, Safety (SDS)

This is the part where the software has to respect physics and liability.

## Inventory (supplies)

### Supplies
- `supplies` includes:
  - `supply_code`
  - `name`
  - `sds_url`
  - cost fields

### Assignments
- `supply_assignments` links supplies to sites with `min_quantity`

### Kits (recommended)
- `supply_kits` (template)
- `supply_kit_items` (supply + quantity)
Used during conversion to quickly set up a new site.

## Safety dashboard

### Site Safety tab (required)
For a given site:
- query assigned supplies
- show SDS links for only those supplies

### Ticket Safety docs (required)
A cleaner on a ticket sees:
- SDS links for site-assigned supplies
- plus any ticket-specific supplies (if modeled)

## Assets

### Vehicles
- registry + maintenance
- checkout rules:
  - certain jobs require a vehicle checkout before starting a route

### Keys
- keys are tied to sites
- key assignments track custody:
  - assigned_at / checked_out_at
  - returned_at

Ticket gating rules:
- cannot close ticket without recording key return/retention when required

### Equipment (recommended)
Track:
- equipment inventory
- assignment to staff or site
- condition and maintenance logs
