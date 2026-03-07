# Staff Schedule Closure (CLEANER + INSPECTOR, 2026-03-07)

## Release Context
- **Repo commit:** `72f5038`
- **Production deployment ID:** `dpl_FzJ6GsCyaqnh5GHWq47ZpAhLsrMV`
- **Production deployment URL:** `https://gleamops-gxhdbr4z1-andersons-projects-c6f0399d.vercel.app`
- **Production alias:** `https://gleamops.vercel.app`
- **Deploy status:** Ready (verified by `vercel inspect`)
- **Certification date/time (America/New_York):** 2026-03-07

## Scope
- Focused production closure rerun for `CLEANER` and `INSPECTOR`.
- Module under test: Staff Schedule.
- Route set exercised by the sweep:
  - `/schedule`
  - `/schedule?tab=recurring`
  - `/schedule?tab=leave`
  - `/schedule?tab=my-schedule`
- Evidence artifact:
  - `.tmp-roleext-staffschedule-cleaner-inspector-20260307-live-postauth.json`

## Closure Result
- `routesFailed: 0`
- `interactionsFailed: 0`
- `networkFailures: 0`
- `consoleErrors: 0`
- `pageErrors: 0`
- Per-role summaries:
  - `CLEANER`: `189/189` interactions passed
  - `INSPECTOR`: `189/189` interactions passed

## Defect Closure
### BUG-ID: ROLEEXT-STAFF-001
- **Original defect:** CLEANER/INSPECTOR could reach Leave & Availability controls that triggered unauthorized archive requests and `403 AUTH_002` noise.
- **Frontend status:** closed by the shared Staff Schedule permission gating shipped in `59c1ac2`.
- **Follow-up stability status:** a transient inspector-only auth/session fetch console error seen on the earlier 2026-03-07 production rerun no longer reproduces after `72f5038`.
- **Current production behavior:** the focused Staff Schedule rerun completes without `403` archive failures, console errors, page errors, or network failures for either field role.

## Verdict
- **Staff Schedule role extension (CLEANER + INSPECTOR):** GO
- **ROLEEXT-STAFF-001:** Closed
