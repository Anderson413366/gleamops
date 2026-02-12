# Operations, service plans, tickets, scheduling

## 1) Service plans / contracts (site_jobs)
A `site_job` is the recurring contract created from a won bid/proposal.

It defines:
- site
- scope (tasks, frequencies)
- contract amount and billing frequency
- start date
- recurrence rule (days, times, holidays)

## 2) Recurrence rules (ticket generation)
Use an explicit recurrence model:
- weekly pattern (Mon..Sun)
- start/end date
- optional exceptions (holidays, skips)
- generation horizon (next N weeks)

Ticket generation should be a job:
- idempotent by (job_id, date)
- can rerun safely

## 3) Work tickets (nucleus)
Ticket contains:
- schedule time window
- site + job link
- assignees (support multiple)
- status
- checklist instance
- photos
- time entries
- inspection links
- assets required/used

### Ticket statuses (lookup-driven)
- SCHEDULED
- IN_PROGRESS
- COMPLETED
- VERIFIED
- CANCELLED

## 4) Scheduling UI
Minimum:
- calendar views (day/week)
- list view (today/next 7)
- drag/drop reschedule/reassign
- filters: assignee, site, job, status

Performance rules:
- list views return lean payload
- detail drawer lazy-loads heavy objects (photos/checklist)

## 5) Dispatch workflow
- manager assigns tickets
- cleaners see “Today”
- start → checklist → photos → complete
- supervisor verifies

## 6) Checklists
Two layers:
- checklist templates (admin)
- ticket checklist instances (generated)

Checklist items:
- task title
- required flag
- notes
- photo required flag
- completion timestamp + actor

Rule:
- ticket cannot complete if required checklist items incomplete.
