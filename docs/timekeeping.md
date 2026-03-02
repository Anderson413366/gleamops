# Timekeeping (geofence, check-in/out, exceptions, timesheets)

Timekeeping must be:
- payroll-ready
- auditable
- resistant to “creative time”

## 1) Geofences
Per site:
- center lat/lng
- radius meters
- optional polygon later

Rules:
- check-in captures lat/lng + accuracy
- server evaluates inside/outside

## 2) Events and entries
Option A (recommended): unified `time_events`
- CHECK_IN
- CHECK_OUT
- BREAK_START
- BREAK_END
- MANUAL_ADJUSTMENT

Derived `time_entries` per ticket:
- start_at, end_at
- duration_minutes
- created_by, approved_by

## 3) Exceptions
Create exceptions for:
- out-of-geofence
- late arrival
- early departure
- missing checkout
- manual override

Exceptions generate alerts to supervisors.

## 4) Timesheets
Timesheets are weekly per staff:
- totals by day
- totals by job/site
- exceptions summary
- approval workflow

Approvals write audit events.

## 5) Alternative PIN-based check-in
For devices without GPS or in dead zones:
- site has rotating PIN (optional)
- PIN check-in still logs exception if no GPS proof

## 6) Audit requirements
Write audit events for:
- time entry edits
- exception resolution
- timesheet approvals/unapprovals
