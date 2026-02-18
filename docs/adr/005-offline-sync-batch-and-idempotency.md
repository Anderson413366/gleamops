# ADR 005: Offline Sync Batch With Idempotency Audit

- Status: Accepted
- Date: 2026-02-18

## Context
Field workflows require reliable offline write durability and replay without duplication.

## Decision
Add sync ingestion endpoint `/api/sync/batch` and audit table `sync_events`.
Queue items carry idempotency keys and return one of:
- `accepted`
- `duplicate`
- `conflict`
- `error`

Mobile queue uses batch sync when API base URL is configured; unsupported operations fall back to direct replay.
Failed items move to sync inbox and can be retried or dismissed.

## Consequences
- Replay is auditable and idempotent.
- Duplicate retries do not create duplicate writes.
- User-visible recovery path exists for terminal sync failures.
