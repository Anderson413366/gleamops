# QA Manual Checklist

> Manual QA checklist for the Old-Plan Delta sprint (9 changes).

## Pre-Testing Setup

- [ ] Login with OWNER_ADMIN account on test tenant (TNT-0001)
- [ ] Verify at least 2 staff members exist with `staff_eligible_positions` entries
- [ ] Verify at least 2 positions exist in `staff_positions`
- [ ] Verify at least 1 work ticket exists with status SCHEDULED

---

## Change 1: Positions KPI Fix

- [ ] Navigate to `/team?tab=positions`
- [ ] Verify "Total Positions" KPI card shows correct count (not 0)
- [ ] Verify "Staff Assigned" KPI shows count of unique staff with position assignments
- [ ] Navigate to other tabs and back to positions — KPIs refresh correctly

## Change 2: Staff Count on Positions Table

- [ ] On `/team?tab=positions`, verify each position row shows correct staff count
- [ ] Staff count matches the number of `staff_eligible_positions` entries for that position
- [ ] Positions with no assigned staff show 0

## Change 3: Coverage Grid Warning Triangles

- [ ] Navigate to `/schedule?tab=recurring` and switch to coverage view
- [ ] For rows with any coverage gap (red badge), verify yellow triangle appears in left column
- [ ] For fully covered rows (all green badges), verify NO triangle appears
- [ ] Verify triangle is visible without horizontal scrolling (sticky left column)

## Change 4: Position Detail Page

- [ ] On `/team?tab=positions`, click a position row
- [ ] Verify navigation to `/team/positions/{position_code}` (NOT a SlideOver)
- [ ] Verify back link "Back to Team" returns to `/team?tab=positions`
- [ ] Verify breadcrumb: Home > Team > Positions > {code}
- [ ] Verify header: title, code badge, Active/Inactive status badge
- [ ] Verify stat cards: Staff Assigned count, Color Token preview, Department, Pay Grade
- [ ] Verify Position Details card with `<dl>` key-value layout
- [ ] Verify Eligible Staff card lists staff names with EntityLinks
- [ ] Click a staff name — navigates to staff detail page
- [ ] Click "Edit" — opens PositionForm SlideOver
- [ ] Click "Deactivate" — shows confirmation dialog
- [ ] Test route alias: navigate to `/workforce/positions/{code}` — same page renders

## Change 5: Staff Recurring Assignments

- [ ] Navigate to a staff detail page (`/team/staff/{code}`)
- [ ] Click the "Schedule" tab
- [ ] Verify "Recurring Site Assignments" card appears between Employee Schedule and Work Schedule
- [ ] If staff has work tickets assigned: verify date, time range, position, and site name display
- [ ] Click a site name — navigates to site detail page
- [ ] Verify "View Full Schedule" link navigates to `/schedule?tab=recurring`
- [ ] If no assignments: verify "No upcoming site assignments." empty state

## Change 6: Schedule Filter Persistence

- [ ] Navigate to `/schedule`
- [ ] Select at least one client, site, position, or employee filter
- [ ] Navigate away (e.g., to `/team`)
- [ ] Navigate back to `/schedule`
- [ ] Verify previously selected filters are restored
- [ ] Clear all filters
- [ ] Navigate away and back — verify filters are NOT restored (cleared)

## Change 7: Keyboard DnD Alternatives

- [ ] Navigate to `/schedule?tab=recurring` (grid view)
- [ ] Tab to a shift cell — verify it receives focus (visible ring)
- [ ] Press Enter — verify "Moving... Esc to cancel" indicator appears
- [ ] Press Left/Right arrow — verify focus moves between date columns
- [ ] Press Enter on a target cell — verify shift is moved
- [ ] Press Escape while in move mode — verify cancellation
- [ ] Verify `aria-label` attribute on shift cells (inspect in DevTools)
- [ ] Empty cells show "Drop here" text when move is in progress

## Change 8: Terminology Consistency

- [ ] On `/schedule` grid view, verify left column header says "Staff" (not "Specialist")
- [ ] On `/schedule` list view, verify first column header says "Staff"
- [ ] On `/home`, verify KPI shows "Staff Turnover (90d)" (not "Specialist Turnover")
- [ ] On public forms page, verify title says "Staff Self-Service Forms"
- [ ] Verify position-specific names like "Floor Specialist" are unchanged (they're data, not labels)

## Change 9: Documentation

- [ ] Verify `/docs/terminology-glossary.md` exists with canonical terms
- [ ] Verify `/docs/app-integrity-audit.md` exists with route inventory
- [ ] Verify `/docs/app-clickability-contract.md` exists with routing rules
- [ ] Verify `/docs/neuroinclusive-ux-contract.md` exists with 12 UX rules
- [ ] Verify `/docs/schedule-coverage-warnings-spec.md` exists with coverage spec
- [ ] Verify `/docs/qa-manual-checklist.md` exists (this file)

---

## Post-Testing

- [ ] Verify Vercel production deployment succeeded for all commits
- [ ] Spot-check 3 routes on production URL (https://gleamops.vercel.app)
- [ ] No console errors on critical pages (home, schedule, team)
