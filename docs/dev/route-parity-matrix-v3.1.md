# Route Parity Matrix — v3.1

Owner: Claude (AGENT 0)
Date: 2026-02-18

---

## Top-level redirect inventory

| Legacy From | Canonical To | Target Exists? | Target Page Path | Safe? | Notes |
|---|---|---|---|---|---|
| `/home` | `/command` | ✅ | `(dashboard)/command/page.tsx` | ✅ | |
| `/crm` | `/customers` | ✅ | `(dashboard)/customers/page.tsx` | ✅ | |
| `/pipeline` | `/sales` | ✅ | `(dashboard)/sales/page.tsx` | ✅ | |
| `/operations` | `/work` | ✅ | `(dashboard)/work/page.tsx` | ✅ | Special: tab=planning→/planning, tab=calendar→/schedule |
| `/workforce` | `/people` | ✅ | `(dashboard)/people/page.tsx` | ✅ | |
| `/inventory` | `/supplies` | ✅ | `(dashboard)/supplies/page.tsx` | ✅ | |
| `/assets` | `/supplies` | ✅ | `(dashboard)/supplies/page.tsx` | ✅ | |
| `/vendors` | `/supplies` | ✅ | `(dashboard)/supplies/page.tsx` | ✅ | |
| `/reports` | `/insights` | ✅ | `(dashboard)/insights/page.tsx` | ✅ | |
| `/admin` | `/platform` | ✅ | `(dashboard)/platform/page.tsx` | ✅ | |

**All top-level redirect targets exist. All safe.**

---

## Legacy deep routes (must NOT be redirected)

| Legacy Deep Route | Exists? | Notes |
|---|---|---|
| `/crm/clients/[id]` | ✅ | Client detail page |
| `/crm/sites/[id]` | ✅ | Site detail page |
| `/crm/contacts/[code]` | ✅ | Contact detail page |
| `/pipeline/bids/[id]` | ✅ | Bid detail page |
| `/pipeline/proposals/[id]` | ✅ | Proposal detail page |
| `/pipeline/opportunities/[id]` | ✅ | Opportunity detail page |
| `/pipeline/prospects/[id]` | ✅ | Prospect detail page |
| `/pipeline/admin` | ✅ | Pipeline admin page |
| `/pipeline/supply-calculator` | ✅ | Supply calculator |
| `/operations/jobs/[id]` | ✅ | Job detail page |
| `/operations/tickets/[id]` | ✅ | Ticket detail page |
| `/operations/task-catalog` | ✅ | Task catalog |
| `/operations/task-catalog/[id]` | ✅ | Task detail page |
| `/workforce/staff/[code]` | ✅ | Staff detail page |
| `/inventory/supplies/[id]` | ✅ | Supply detail page |
| `/inventory/counts/[id]` | ✅ | Count detail page |

**All deep legacy routes are exact-match safe (redirect map uses `pathname === from`).**

---

## Canonical deep routes (bridges needed)

| Canonical Route | Exists? | Bridge Needed? | Bridge Target | Notes |
|---|---|---|---|---|
| `/customers/clients` | ❌ | ✅ | `/customers?tab=clients` | Tab bridge |
| `/customers/sites` | ❌ | ✅ | `/customers?tab=sites` | Tab bridge |
| `/customers/contacts` | ❌ | ✅ | `/customers?tab=contacts` | Tab bridge |
| `/customers/clients/[id]` | ❌ | ✅ | `/crm/clients/[id]` | Dynamic bridge |
| `/customers/sites/[id]` | ❌ | ✅ | `/crm/sites/[id]` | Dynamic bridge |
| `/customers/contacts/[code]` | ❌ | ✅ | `/crm/contacts/[code]` | Dynamic bridge |
| `/people/staff` | ❌ | ✅ | `/people?tab=staff` | Tab bridge (note: /people/staff/[code] exists) |
| `/people/timekeeping` | ❌ | ✅ | `/people?tab=timekeeping` | Tab bridge |
| `/supplies/orders` | ❌ | ✅ | `/supplies?tab=orders` | Tab bridge |
| `/supplies/kits` | ❌ | ✅ | `/supplies?tab=kits` | Tab bridge |
| `/sales/prospects` | ❌ | ✅ | `/sales?tab=prospects` | Tab bridge |
| `/sales/opportunities` | ❌ | ✅ | `/sales?tab=opportunities` | Tab bridge |
| `/sales/prospects/[id]` | ❌ | ✅ | `/pipeline/prospects/[id]` | Dynamic bridge |
| `/sales/opportunities/[id]` | ❌ | ✅ | `/pipeline/opportunities/[id]` | Dynamic bridge |
| `/work/tickets` | ❌ | ✅ | `/work?tab=tickets` | Tab bridge |
| `/work/jobs` | ❌ | ✅ | `/work?tab=jobs` | Tab bridge |
| `/work/tickets/[id]` | ❌ | ✅ | `/operations/tickets/[id]` | Dynamic bridge |
| `/work/jobs/[id]` | ❌ | ✅ | `/operations/jobs/[id]` | Dynamic bridge |

---

## Action plan
1. All top-level redirects: ✅ safe (no changes needed)
2. Deep legacy routes: ✅ protected by exact-match redirect
3. Canonical deep routes: ❌ need bridge pages (Phase G)
