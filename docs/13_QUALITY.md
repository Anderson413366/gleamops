# Quality: inspections (offline-first) + follow-up actions

## 1) Inspection templates
Templates define:
- sections and items
- scoring scale (0–5)
- photo requirements
- pass/fail threshold

## 2) Inspections
Inspection record includes:
- site/job/ticket link (optional but preferred)
- inspector
- started_at, completed_at
- total score
- submitted flag

## 3) Offline-first rule
Inspectors must be able to:
- complete inspection without internet
- attach photos
- sync later without re-entry

Recommended conflict policy:
- versioning (client increments version)
- server rejects outdated updates with `INSP_003`

## 4) Issues → follow-up tickets
If an item fails:
- create an “issue” record
- optionally auto-generate a follow-up ticket for remediation
- link issue to ticket(s) for closure

## 5) Reporting
- site quality trend
- recurring failures
- top issues by category
