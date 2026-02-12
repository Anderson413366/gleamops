# Verification Checklist (Definition of Done)
**Version:** vFinal2  
**Date:** 2026-02-12

This checklist exists because “trust me bro” is not a QA strategy.

---

## 1) Data continuity checks (must pass)

- [ ] Service template can be created (tasks + services + service_tasks)
- [ ] Bid can be created from a service template without manual re-entry
- [ ] Proposal can be generated deterministically (same input → same PDF hash)
- [ ] Proposal can be sent and tracked (delivered/open/bounce)
- [ ] Follow-ups stop on:
  - [ ] proposal WON
  - [ ] proposal LOST
  - [ ] bounce/spam report
  - [ ] manual stop
- [ ] WON conversion produces:
  - [ ] contract/service plan
  - [ ] recurrence rule
  - [ ] generated tickets (next N weeks)
  - [ ] correct links back to source bid/proposal
- [ ] Ticket completion attaches:
  - [ ] checklist completion
  - [ ] photos
  - [ ] time entries
  - [ ] inspection results (if applicable)
  - [ ] safety docs visibility for assigned supplies

---

## 2) Security checks (must pass)

- [ ] Every tenant table has `tenant_id`
- [ ] RLS enabled on every tenant table
- [ ] Policies prevent cross-tenant reads/writes
- [ ] Site scoping enforced (supervisor sees only assigned sites)
- [ ] Service role usage is limited to server-side code only
- [ ] Audit events exist for:
  - [ ] ticket create/update/reschedule/reassign/status change
  - [ ] time entry edits
  - [ ] timesheet approvals
  - [ ] proposal sent / status changed
  - [ ] geofence changes / site assignments changes

---

## 3) Reliability checks (must pass)

- [ ] Webhooks are idempotent (same event twice → one stored record)
- [ ] Webhook signature verification implemented (raw request bytes)
- [ ] PDF generation is async and retried safely (idempotency key)
- [ ] Job worker can restart without duplicating side effects
- [ ] Follow-up scheduler does not send after stop conditions
- [ ] Offline inspection sync does not lose data (versioned upsert)

---

## 4) Performance checks (must pass)

- [ ] Schedule week view query uses correct indexes
- [ ] Tickets list payload remains small (no giant joins)
- [ ] Full-text search uses GIN indexes (tsvector + trigram where needed)
- [ ] High-volume tables (email_events) have proper indexes and retention plan

---

## 5) UX checks (must pass)
- [ ] Navigation stays at 5 top-level spaces
- [ ] Each screen has one primary action
- [ ] List → detail drawer pattern used consistently
- [ ] Critical statuses are never “fake optimistic”
- [ ] No dense “Microsoft Excel cosplay” tables unless absolutely required

---

## 6) Release checks (must pass)

- [ ] CI gates: lint + typecheck + tests + OpenAPI contract validation
- [ ] Database migrations run cleanly in staging and are reversible
- [ ] Monitoring exists (Sentry + structured logs)
- [ ] Backups and restore procedure documented
