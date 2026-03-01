# App Clickability Contract

> Every clickable entity in GleamOps must navigate to a full detail page. No orphan links.

## Rules

1. **Table rows navigate to detail pages** — never open drawers/modals for read views
2. **EntityLink components resolve to canonical routes** — defined in `entity-link.tsx`
3. **Detail pages have a "Back to [Module]" link** — always using canonical module route
4. **Breadcrumbs trace the full path** — Home > Module > Entity
5. **Card grid clicks navigate identically to table row clicks**

## Per-Entity Routing Table

| Entity | List Route | Detail Route | Link Param | EntityLink Type |
|--------|-----------|-------------|-----------|----------------|
| Client | `/clients` | `/clients/[id]` | `client_code` | `client` |
| Site | `/clients?tab=sites` | `/clients/sites/[id]` | `site_code` | `site` |
| Contact | `/clients?tab=contacts` | `/clients/contacts/[code]` | `contact_code` | — |
| Prospect | `/pipeline?tab=prospects` | `/pipeline/prospects/[id]` | `prospect_code` | `prospect` |
| Opportunity | `/pipeline?tab=opportunities` | `/pipeline/opportunities/[id]` | `opportunity_code` | `opportunity` |
| Bid | `/pipeline?tab=bids` | `/pipeline/bids/[id]` | `bid_code` | — |
| Proposal | `/pipeline?tab=proposals` | `/pipeline/proposals/[id]` | `proposal_code` | — |
| Job / Service Plan | `/jobs` | `/operations/jobs/[id]` | `job_code` | `job` |
| Work Ticket | `/jobs?tab=tickets` | `/operations/tickets/[id]` | `ticket_code` | `ticket` |
| Complaint | `/operations?tab=complaints` | `/operations/complaints/[code]` | `complaint_code` | — |
| Periodic Task | `/operations?tab=periodic` | `/operations/periodic/[code]` | `periodic_code` | — |
| Task (catalog) | `/catalog?tab=tasks` | `/operations/task-catalog/[id]` | `task_code` | — |
| Staff | `/team?tab=staff` | `/team/staff/[code]` | `staff_code` | `staff` |
| Position | `/team?tab=positions` | `/team/positions/[code]` | `position_code` | `position` |
| Supply | `/inventory?tab=supplies` | `/inventory/supplies/[id]` | `code` | `supply` |
| Inventory Count | `/inventory?tab=counts` | `/inventory/counts/[id]` | `count_code` | — |
| Equipment | `/equipment` | `/assets/equipment/[code]` | `equipment_code` | `equipment` |
| Vehicle | `/equipment?tab=vehicles` | `/assets/vehicles/[id]` | `vehicle_code` | `vehicle` |
| Key | `/equipment?tab=keys` | `/assets/keys/[id]` | `key_code` | — |
| Subcontractor | `/vendors?tab=subcontractors` | `/vendors/subcontractors/[code]` | `subcontractor_code` | `subcontractor` |
| Supply Vendor | `/vendors?tab=supply-vendors` | `/vendors/supply-vendors/[slug]` | `slug` | — |
| Field Report | `/workforce?tab=field-reports` | `/workforce/field-reports/[code]` | `report_code` | — |

## EntityLink Route Map

Defined in `apps/web/src/components/links/entity-link.tsx`:

```typescript
const ROUTE_PREFIX: Record<EntityType, string> = {
  client: '/clients',
  site: '/clients/sites',
  job: '/operations/jobs',
  ticket: '/operations/tickets',
  staff: '/team/staff',
  equipment: '/assets/equipment',
  vehicle: '/equipment/vehicles',
  subcontractor: '/vendors/subcontractors',
  supply: '/inventory/supplies',
  position: '/team/positions',
  prospect: '/pipeline/prospects',
  opportunity: '/pipeline/opportunities',
};
```

## Legacy Route Aliases

| Legacy Route | Canonical Route | Implementation |
|-------------|----------------|----------------|
| `/crm/clients/[id]` | `/clients/[id]` | Separate page.tsx (both render) |
| `/crm/sites/[id]` | `/clients/sites/[id]` | Separate page.tsx |
| `/crm/contacts/[code]` | `/clients/contacts/[code]` | Separate page.tsx |
| `/workforce/staff/[code]` | `/team/staff/[code]` | Separate page.tsx |
| `/workforce/positions/[code]` | `/team/positions/[code]` | Re-export alias |
| `/assets/*` | `/equipment/*` | Both routes work |
| `/services/*` | `/catalog/*` | Both routes work |

## Back Link Rules

Every detail page must include:

```tsx
<Link href="/[canonical-module-route]" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
  <ArrowLeft className="h-4 w-4" /> Back to [Module Name]
</Link>
```

Use canonical routes, never legacy:
- Staff detail: "Back to Team" → `/team?tab=staff`
- Position detail: "Back to Team" → `/team?tab=positions`
- Client detail: "Back to Clients" → `/clients`
- Site detail: "Back to Clients" → `/clients?tab=sites`
