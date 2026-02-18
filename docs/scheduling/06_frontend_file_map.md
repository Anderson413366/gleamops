# Frontend File Map (Implementation Blueprint)

## Operations entrypoint updates
- `apps/web/src/app/(dashboard)/operations/operations-page.tsx`
- Add tab: `planning`
- Wire search placeholder and KPI behavior for planning tab

## New Planning components
- `apps/web/src/app/(dashboard)/operations/planning/planning-panel.tsx`
- `apps/web/src/app/(dashboard)/operations/planning/planner-grid.tsx`
- `apps/web/src/app/(dashboard)/operations/planning/planner-filters.tsx`
- `apps/web/src/app/(dashboard)/operations/planning/publish-drawer.tsx`
- `apps/web/src/app/(dashboard)/operations/planning/conflicts-panel.tsx`

## Existing components to extend
- `apps/web/src/app/(dashboard)/operations/calendar/week-calendar.tsx`
- Add coverage indicators, publish/lock badges, assignment actions

- `apps/web/src/app/(dashboard)/operations/tickets/ticket-detail.tsx`
- Add assignment status/type controls and release action entrypoint

- `apps/web/src/app/(dashboard)/workforce/hr/hr-lite-panel.tsx`
- Add PTO schedule impact preview and post-approval refresh hooks

## Shared typing and validation
- `packages/shared/src/types/database.ts`
- `packages/shared/src/validation/index.ts`
- Add schedule-period/availability/trade/conflict schemas
