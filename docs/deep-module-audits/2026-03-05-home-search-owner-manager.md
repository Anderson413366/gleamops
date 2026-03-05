# Deep Module Audit — Home + Search/⌘K (OWNER_ADMIN, MANAGER)

## Session Metadata
- Module under test: Home + Search/⌘K
- Environment: Production (`https://gleamops.vercel.app`)
- Run window (ET): 2026-03-04 21:02:28 → 21:02:50
- Roles tested: OWNER_ADMIN, MANAGER
- Tooling: Playwright deep-module runner with console + network capture
- Raw artifact: `.tmp-deep-home-search-owner-manager-20260305.json`

## Coverage Executed
- Baseline load and role variant heading checks
- Command palette open paths:
  - keyboard
  - header trigger
  - sidebar trigger
- Search behavior:
  - quick-action term
  - go-to schedule term
  - fuzzy phrase (`go schedule`)
  - ESC close
- Quick Action behavior:
  - open/close and click-outside
  - New Prospect navigation
- Keyboard shortcuts modal (`?`) open/close
- Connectivity trails from Home cards:
  - Staff Turnover (90d)
  - Tonight Routes
  - Overdue Periodic Tasks
- Deep links in new tabs (`/home`, `/schedule`, `/jobs?tab=routes`)
- Browser back/forward predictability

## Result Summary
- Total checks: 32
- Passed: 27
- Failed: 5
- Console errors: 0
- Network failures: 0
- Page runtime errors: 0

## Defects / Gaps Found

### `HOME-003` Missing/Non-clickable Staff Turnover trail
- Roles affected: OWNER_ADMIN, MANAGER
- Evidence:
  - Expected target: `/team?tab=staff`
  - Actual: card text not found/clickable in Home view (`found=false`, final URL stays `/home`)
- Impact:
  - Breaks required Home → Workforce connectivity proof path.

### `HOME-004` Missing/Non-clickable Tonight Routes trail
- Roles affected: OWNER_ADMIN, MANAGER
- Evidence:
  - Expected target: `/jobs?tab=routes`
  - Actual: card text not found/clickable in Home view (`found=false`, final URL stays `/home`)
- Impact:
  - Breaks required Home → Dispatch/Routes connectivity proof path.

### `HOME-005` Missing/Non-clickable Overdue Periodic Tasks trail (MANAGER)
- Roles affected: MANAGER
- Evidence:
  - Expected target: `/schedule?tab=recurring`
  - Actual: card text not found/clickable in MANAGER Home view (`found=false`, final URL stays `/home`)
  - OWNER_ADMIN passes this same trail.
- Impact:
  - Role inconsistency in core planning navigation.

## Neuroinclusive / ADHD Notes
- Positive:
  - Palette, quick action, shortcuts, and keyboard close behaviors are predictable and low-friction.
- High-impact friction:
  - Missing direct Home card affordances for required operational trails increase recall burden and force context switching.
- Recommendation:
  - Ensure role-appropriate Home cards are consistently visible and clickable for key operational trails, or provide equivalent clearly labeled shortcuts in fixed locations.

## Release Readiness Verdict (Home + Search, deep audit scope)
- Verdict: **NO-GO** for deep-audit certification closure of this module.
- Reasons:
  - 5 failed connectivity checks across required card-to-module trails.
