# ADR log (architecture decisions)

This is the place you write down decisions so nobody “re-decides” them every two weeks.

## ADR-0001: Work Ticket is the nucleus
Decision: all ops objects attach to `work_tickets`.

## ADR-0002: RLS-first, tenant-safe by design
Decision: every business table has `tenant_id` and RLS policies.

## ADR-0003: Dual-key IDs
Decision: UUID primary keys + human-readable `{entity}_code` unique keys.

## ADR-0004: Soft delete everywhere
Decision: archive, do not hard delete.

## ADR-0005: Optimistic locking on concurrent edit objects
Decision: use `version_etag` + `If-Match`.

## ADR-0006: Contract-first API
Decision: OpenAPI 3.1 is the source of truth.

## ADR-0007: PDF generation runs in Node runtime
Decision: use `@react-pdf/renderer` in Node, store in Supabase Storage.

## ADR-0008: Webhooks are signature-verified and idempotent
Decision: store provider IDs + enforce idempotency constraints.

## ADR-0009: Postgres-first job queue (initial)
Decision: prefer Postgres-backed queue for simplicity; switch to Redis only if needed.
