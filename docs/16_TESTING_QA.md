# Testing & QA (the stuff people pretend they’ll do later)

Testing is how you stop “one tiny change” from breaking payroll, proposals, and your sanity.

## 1) Required test layers

### Unit tests (fast, deterministic)
Must cover:
- CleanFlow: production rate matching, workload totals, pricing
- geofence evaluation + late rules
- follow-up state machine transitions
- conversion mapping (bid → job payload)

### Integration tests (API + DB)
- create prospect → opportunity → bid → calculate → proposal → send
- webhook ingestion idempotency
- conversion transaction and rollback
- ticket generation idempotency
- timekeeping exception creation + approvals

### Contract tests
- OpenAPI schema validation in CI
- ensure clients generated types match server

### E2E tests (web)
- full sales cycle: bid → proposal PDF → send → tracking pill updates
- schedule: drag/drop reschedule
- ticket: checklist completion → complete

### E2E tests (mobile)
- check-in/out
- offline inspection → sync
- photo attachments

## 2) Acceptance tests (Gherkin examples)

### bid_to_proposal.feature
- Given a service template exists…
- When user creates bid and calculates…
- Then proposal PDF is generated deterministically…

### geofence_exceptions.feature
- Given site geofence is set…
- When cleaner checks in outside radius…
- Then exception is created and supervisor alerted…

### followups.feature
- Given proposal was sent…
- When bounce occurs…
- Then follow-ups stop and no further sends occur…

## 3) Quality gates in CI
- typecheck must pass
- lint must pass
- unit tests must pass
- contract validation must pass
- migrations must apply cleanly to empty DB
