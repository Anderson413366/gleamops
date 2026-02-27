# Session Closeout — Monday Cutover Execution

Date: 2026-02-27  
Branch: `main`  
Final commit in this session: `8489172`

## Objective

Execute and document Monday.com cutover preparation for:
- sites/procedures/access windows
- weekday route templates
- periodic tasks
- supply assignment verification
- microfiber enrollments
- UAT sign-off package

Store release work (Play Console/App Store) is intentionally deferred.

## Completed Work

### 1) Migration sequencing and deployment hygiene

- Confirmed and maintained linked Supabase migration parity.
- Added and applied:
  - `00110_sites_access_windows.sql`
  - `00111_fix_sites_access_window_constraint.sql`
- Constraint fix in `00111` intentionally allows overnight windows (for example `22:00` → `02:00`) while enforcing paired start/end values.

### 2) Cutover execution tooling

- Added script:
  - `scripts/cutover/execute-monday-cutover.ts`
- Script behavior:
  - resolves tenant by `tenant_code`
  - optionally bootstraps weekday route template skeleton (MON-SAT) if none exist
  - reads live data from Supabase
  - outputs cutover CSV workbooks + summary JSON under `reports/cutover/...`

### 3) Database bootstrap run for tenant `TNT-0001`

- Executed:
  - `pnpm --filter @gleamops/web exec tsx ../../scripts/cutover/execute-monday-cutover.ts --tenant-code TNT-0001 --apply-route-template-skeleton`
- Result:
  - 6 weekday route templates created (MON-SAT)
  - cutover workbook generated:
    - `reports/cutover/TNT-0001-2026-02-27T01-18-31.550Z`

### 4) Generated cutover artifacts

Output directory:
- `reports/cutover/TNT-0001-2026-02-27T01-18-31.550Z`

Files generated:
- `sites_procedures_access_windows.csv`
- `route_templates_weekday.csv`
- `route_template_stops.csv`
- `route_template_tasks.csv`
- `periodic_tasks.csv`
- `supply_assignments_verification.csv`
- `microfiber_enrollments.csv`
- `summary.json`

Summary snapshot:
- sites: `401`
- sites missing procedures/windows: `401`
- site jobs: `156`
- periodic task seed rows: `156`
- supply verification rows: `401`
- microfiber staff rows: `58`
- route templates: `6`

### 5) UAT and execution documentation

- Added UAT sign-off template:
  - `docs/execution/monday-cutover-uat-signoff.md`
- Updated execution and status docs to reflect:
  - cutover bootstrap completed
  - migration parity through `00111`
  - app store release deferred by decision

## Validation Gates

All passed in this session:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `supabase migration list --linked` (parity through `00111`)

## What Is Still Pending

These are operational tasks that require business inputs and stakeholder participation:

1. Fill generated cutover CSVs with real Monday.com values.
2. Import/apply reviewed cutover values into production tables.
3. Run stakeholder UAT sessions and collect signatures in:
   - `docs/execution/monday-cutover-uat-signoff.md`
4. Final operational cutover approval.

## Key Files Changed in This Session

- `supabase/migrations/00110_sites_access_windows.sql`
- `supabase/migrations/00111_fix_sites_access_window_constraint.sql`
- `scripts/cutover/execute-monday-cutover.ts`
- `docs/execution/monday-cutover-uat-signoff.md`
- `docs/execution/one-shot-remaining-checklist.md`
- `docs/MONDAY_REPLACEMENT_PLAN.md`
- `docs/00_EXEC_SUMMARY.md`
- `docs/20_VERIFICATION_CHECKLIST.md`
- `docs/P0_REQUIREMENTS_TRACEABILITY.md`
- `README.md`
