# Dashboards + reporting

Dashboards need to be **fast** and reflect permissions.

## Ops dashboard (minimum)
- tickets today (by status)
- late starts / missing checkouts
- exception inbox count
- quality score trend
- labor hours vs budgeted (from CleanFlow)

## Sales dashboard (minimum)
- pipeline value by stage
- bids in progress
- proposals sent last 7/30
- open rate (as signal)
- win rate by service type
- average margin

## Export requirements
- CSV exports:
  - tickets (range)
  - time entries/timesheets
  - pipeline objects

## Performance strategy
Start with direct queries + indexes.
If a dashboard becomes slow:
- add materialized view refreshed every 5–15 minutes
- or cache table keyed by tenant_id + date window
