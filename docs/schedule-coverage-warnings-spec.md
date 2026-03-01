# Schedule Coverage Warnings Specification

> How coverage gaps are detected, displayed, and pre-publish validated.

## Coverage Data Model

### Source Tables

| Table | Role |
|-------|------|
| `work_tickets` | Scheduled work instances with `site_id`, `position_code`, `assigned_to`, `scheduled_date`, `status` |
| `staff_eligible_positions` | Maps `staff_id` → `position_code` with `is_primary` flag |
| `staff_availability_rules` | Per-staff day-of-week availability (boolean + reason) |
| `ticket_assignments` | Links tickets to staff with `assignment_status` and `role` |

### Coverage Calculation

Coverage is computed per **site + position + date** group:

```typescript
interface CoverageGroup {
  clientName: string;
  siteName: string;
  siteCode: string | null;
  positionType: string;
  coverage: Map<string, { assigned: number; total: number }>;
}
```

- **`total`**: Number of work tickets for this group on this date
- **`assigned`**: Number of those tickets where `status !== 'open'` (has staff assigned)
- **Gap**: `assigned < total`

### Coverage Grid (`coverage-grid.tsx`)

Displays a site-position x date matrix:

1. **Header row**: Date columns with day-of-week + date label
2. **Client headers**: Group rows by client name
3. **Row labels**: Sticky left column with site name + position type
4. **Date cells**: Badge showing `assigned/total` — green if full, red if gap
5. **Warning indicator**: Yellow `AlertTriangle` icon next to position label when ANY date in that row has a gap

## Warning Display Hierarchy

### Level 1: Row-Level Warning (Sticky Left Column)
- **When**: Any date cell in the row has `assigned < total`
- **Display**: `<AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />` after position type text
- **Purpose**: Visible without horizontal scrolling

### Level 2: Cell-Level Badge (Date Columns)
- **When**: Specific date has gap
- **Display**: `<Badge color="red">{assigned}/{total}</Badge>`
- **Purpose**: Shows exact gap count per date

### Level 3: KPI Dashboard Warning
- **When**: Total coverage gaps > 0 across all sites/dates
- **Display**: KPI card "Coverage Gaps" with warning color
- **Purpose**: At-a-glance operational awareness

## Pre-Publish Validation

Before publishing a schedule period, the system checks:

1. **Unassigned shifts**: Count of `work_tickets` with `status = 'open'` in the period
2. **Scheduling conflicts**: Overlapping time ranges for the same staff on the same date
3. **Availability violations**: Staff scheduled on days marked unavailable
4. **Position eligibility**: Staff assigned to positions not in their `staff_eligible_positions`

### Publish Flow

```
User clicks "Publish" →
  Count warnings (conflicts + unassigned) →
  Show ConfirmDialog with warning counts →
  User confirms → Update ticket statuses to PUBLISHED →
  Trigger notifications
```

### Warning Counts in Publish Dialog

```typescript
const publishWarnings = {
  conflicts: number,  // Overlapping time range count
  unassigned: number, // Open shift count
};
```

## Conflict Detection Algorithm

```typescript
function buildConflictKeys(rows: RecurringScheduleRow[]): Set<string> {
  // Group by staff name
  // For each pair of shifts for same staff:
  //   If time ranges overlap (aStart < bEnd && bStart < aEnd):
  //     Mark shared dates as conflicted
  // Returns Set of "rowId:dateKey" strings
}
```

## Availability Rules

Fetched from `staff_availability_rules`:

```typescript
interface AvailabilityRule {
  staff_name: string;
  day_of_week: number;  // 0=Sun, 1=Mon, ..., 6=Sat
  is_available: boolean;
  reason?: string | null;
}
```

When `is_available === false`:
- Cell shows hatched background pattern
- "Unavailable" label with tooltip showing reason
- Staff should not be scheduled (warning only, not blocked)

## Position Eligibility Enforcement

On drag-and-drop reassignment:

1. Check if target staff has ANY entries in `staff_eligible_positions`
2. If yes, check if the shift's `position_code` is in their eligible set
3. If not eligible: reject drop + show toast error message
4. If no eligibility data: allow drop (graceful degradation)
