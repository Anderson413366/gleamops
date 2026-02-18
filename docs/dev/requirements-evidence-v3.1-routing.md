# Requirements -> Evidence Matrix (v3.1 Routing Stabilization)

Owner: Claude (AGENT 0)
Date: 2026-02-18
Branch: `fix/v3-1-routing-stabilization`

---

## Routing & navigation requirements

### R1. Top-level legacy -> canonical redirects work

- Requirement:
  - `/crm` -> `/customers`
  - `/workforce` -> `/people`
  - `/inventory` -> `/supplies`
  - `/pipeline` -> `/sales`
  - `/operations` -> `/work`
  - `/home` -> `/command`
  - `/assets` -> `/supplies`
  - `/vendors` -> `/supplies`
  - `/reports` -> `/insights`
  - `/admin` -> `/platform`
- Evidence (code):
  - `apps/web/src/lib/routing/legacy-redirect-map.ts` — `LEGACY_REDIRECTS` array defines all 10 mappings. `getLegacyRedirect()` uses exact match (`pathname === item.from`). `getLegacyRedirectUrl()` handles `/operations` special case (tab=planning->/planning, tab=calendar->/schedule).
  - `apps/web/src/lib/supabase/middleware.ts` — calls `getLegacyRedirectUrl()` for non-API, non-static routes.
- Evidence (tests):
  - `apps/web/e2e/redirect-navigation.spec.ts` — `REDIRECT_CASES` array tests all 11 legacy->canonical redirects including query string preservation.
- Evidence (build):
  - `pnpm typecheck` — 7/7 pass
  - `pnpm build` — all target pages exist in build output

### R2. Deep legacy routes do NOT redirect

- Requirement:
  - `/crm/clients/CLI-1001` remains on legacy path
  - `/operations/jobs/JOB-2026-A` remains on legacy path
  - `/workforce/staff/STF-1001` remains on legacy path
  - `/pipeline/prospects/PRO-0001` remains on legacy path
- Evidence (code):
  - `apps/web/src/lib/routing/legacy-redirect-map.ts:20` — `getLegacyRedirect()` uses exact match: `pathname === item.from`. Only `/crm` matches, not `/crm/clients/CLI-1001`.
  - `apps/web/src/lib/routing/legacy-redirect-map.ts:28` — `/operations` special case also uses `pathname === '/operations'`.
- Evidence (tests):
  - `apps/web/e2e/redirect-navigation.spec.ts` — "Deep legacy routes do NOT redirect" test suite checks 5 deep paths remain on their legacy prefixes.

### R3. Canonical deep routes do not 404 (real or bridge)

- Requirement:
  - `/customers/clients` loads (bridge -> `/customers?tab=clients`)
  - `/customers/sites` loads (bridge -> `/customers?tab=sites`)
  - `/customers/contacts` loads (bridge -> `/customers?tab=contacts`)
  - `/customers/clients/[id]` loads (bridge -> `/crm/clients/[id]`)
  - `/customers/sites/[id]` loads (bridge -> `/crm/sites/[id]`)
  - `/customers/contacts/[code]` loads (bridge -> `/crm/contacts/[code]`)
  - `/people/staff` loads (bridge -> `/people?tab=staff`)
  - `/people/timekeeping` loads (bridge -> `/people?tab=timekeeping`)
  - `/supplies/orders` loads (bridge -> `/supplies?tab=orders`)
  - `/supplies/kits` loads (bridge -> `/supplies?tab=kits`)
  - `/sales/prospects` loads (bridge -> `/sales?tab=prospects`)
  - `/sales/opportunities` loads (bridge -> `/sales?tab=opportunities`)
  - `/sales/prospects/[id]` loads (bridge -> `/pipeline/prospects/[id]`)
  - `/sales/opportunities/[id]` loads (bridge -> `/pipeline/opportunities/[id]`)
  - `/work/tickets` loads (bridge -> `/work?tab=tickets`)
  - `/work/jobs` loads (bridge -> `/work?tab=jobs`)
  - `/work/tickets/[id]` loads (bridge -> `/operations/tickets/[id]`)
  - `/work/jobs/[id]` loads (bridge -> `/operations/jobs/[id]`)
- Evidence (code):
  - 10 tab bridge pages created: `customers/clients/page.tsx`, `customers/sites/page.tsx`, `customers/contacts/page.tsx`, `people/staff/page.tsx`, `people/timekeeping/page.tsx`, `supplies/orders/page.tsx`, `supplies/kits/page.tsx`, `sales/prospects/page.tsx`, `sales/opportunities/page.tsx`, `work/tickets/page.tsx`, `work/jobs/page.tsx`
  - 8 dynamic bridge pages created: `customers/clients/[id]/page.tsx`, `customers/sites/[id]/page.tsx`, `customers/contacts/[code]/page.tsx`, `sales/prospects/[id]/page.tsx`, `sales/opportunities/[id]/page.tsx`, `work/tickets/[id]/page.tsx`, `work/jobs/[id]/page.tsx`
- Evidence (tests):
  - `apps/web/e2e/redirect-navigation.spec.ts` — "Canonical deep-route bridges resolve" test suite checks 11 bridge paths redirect to canonical module roots.
- Evidence (build):
  - All 18 bridge routes appear in `pnpm build` output as dynamic pages.

### R4. /schedule and /planning are distinct

- Requirement:
  - `/schedule` default view is schedule calendar (defaultTab="calendar")
  - `/planning` default view is planning board (defaultTab="planning")
- Evidence (code):
  - `apps/web/src/app/(dashboard)/schedule/page.tsx` — `<OperationsPageClient defaultTab="calendar" />`
  - `apps/web/src/app/(dashboard)/planning/page.tsx` — `<OperationsPageClient defaultTab="planning" />`
- Evidence (tests):
  - `apps/web/e2e/redirect-navigation.spec.ts` — "Schedule and Planning are distinct" test asserts different pathnames.

### R5. Nav consistency (sidebar, header shortcuts, breadcrumbs)

- Requirement:
  - Header hotkeys route to canonical roots
  - Breadcrumbs match canonical IA on canonical routes
  - Command palette uses canonical labels and routes
- Evidence (code):
  - `apps/web/src/components/layout/header.tsx` — `GO_NAV_ROUTES`: h->'/command', c->'/customers', o->'/work', w->'/people'. `QUICK_CREATE_ROUTES`: use canonical `/customers?tab=...`, `/work?tab=...`, `/sales?tab=...`. Command palette items use canonical labels and hrefs.
  - `apps/web/src/components/layout/breadcrumbs.tsx` — Root breadcrumb is "Command Center" linking to `/command`. `SEGMENT_LABELS` includes canonical labels: customers->"Customers", command->"Command Center", work->"Work Execution", sales->"Sales", people->"People", supplies->"Supplies & Assets", insights->"Insights", platform->"Platform". Legacy labels preserved for legacy paths: crm->"CRM", workforce->"Workforce", operations->"Operations".

### R6. Canonical API parity endpoints exist

- Requirement:
  - `/api/schedule/periods`, `/api/schedule/conflicts`, `/api/schedule/trades` non-404
  - `/api/planning/items`, `/api/planning/proposals` non-404
- Evidence (code):
  - `apps/web/src/app/api/schedule/periods/route.ts` — re-exports GET, POST from operations schedule
  - `apps/web/src/app/api/schedule/conflicts/route.ts` — re-exports GET from operations schedule
  - `apps/web/src/app/api/schedule/trades/route.ts` — re-exports GET, POST from operations schedule
  - `apps/web/src/app/api/planning/items/route.ts` — standalone GET endpoint listing planning board items
  - `apps/web/src/app/api/planning/proposals/route.ts` — standalone GET/POST endpoint for proposals
- Evidence (build):
  - All 5 API routes appear in build output as dynamic routes.

---

## Sign-off checklist

- [x] typecheck passes (7/7 packages)
- [x] build passes (0 errors, all pages dynamic)
- [x] E2E test file updated with redirect + deep-route + bridge + schedule/planning assertions
- [ ] E2E execution (requires Playwright + running server — manual verification)
- [x] manual smoke check targets documented
