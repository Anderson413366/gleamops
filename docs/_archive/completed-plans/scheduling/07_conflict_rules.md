# Conflict Rules and Severity

## Blocking rules (phase 1)
- `OVERLAP`: same staff has overlapping assigned shifts
- `PTO_CONFLICT`: approved PTO overlaps ticket window
- `AVAILABILITY_CONFLICT`: assignment violates unavailable window
- `COVERAGE_GAP`: assigned active crew < required staff count

## Warning rules (phase 2)
- `REST_WINDOW_WARNING`
- `MAX_WEEKLY_HOURS_WARNING`
- `ROLE_MISMATCH_WARNING`

## Conflict record standard
Each row should include:
- period id
- ticket id
- staff id (nullable for coverage)
- conflict type
- severity
- human-readable message
- payload json for UI details
