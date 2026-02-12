# API contract (OpenAPI + standards)

The contract is the source of truth. Code is allowed to be wrong; the contract isn’t.

## Contract-first rules
- `openapi/openapi.yaml` is OpenAPI 3.1
- Generate types for web/mobile from the spec
- Never “wing it” in the frontend

## API style
- REST-ish paths, but pragmatic
- Use RPC-ish endpoints for operations:
  - `/bids/{id}/calculate`
  - `/proposals/{id}/send`
  - `/bids/{id}/convert`

## Authentication
- Supabase Auth JWT for user context
- Service role only in server environments (never in clients)

## Error format
All errors are `application/problem+json` (Problem Details, RFC 9457; RFC 7807 is the older version).
See `docs/07_ERROR_CATALOG.md`.

## Optimistic locking
For concurrent edit endpoints:
- client sends `If-Match: {version_etag}`
- server returns 409 if mismatch

## Idempotency
For side-effect endpoints (send email, conversion, create tickets):
- accept `Idempotency-Key` header
- enforce uniqueness in DB for “at-most-once” behavior

## Pagination
Standard:
- `limit`, `cursor`
- `next_cursor` in responses

## Endpoint groups (minimum viable)

Auth
- POST `/auth/login` (if not using Supabase hosted UI)
- POST `/auth/refresh`
- GET `/me`

CRM
- CRUD `/clients`
- CRUD `/sites`
- CRUD `/contacts`
- POST `/files` (upload metadata, return signed URL policy)

Service DNA
- CRUD `/tasks`
- CRUD `/services`
- CRUD `/services/{id}/tasks`

Pipeline
- CRUD `/prospects`
- CRUD `/opportunities`
- CRUD `/bids`
- CRUD `/bids/{id}/versions`
- POST `/bids/{version_id}/calculate`
- POST `/proposals`
- POST `/proposals/{id}/pdf`
- POST `/proposals/{id}/send`

Tracking + follow-ups
- POST `/webhooks/sendgrid`
- CRUD `/followups/templates`
- POST `/proposals/{id}/followups/start`
- POST `/followups/sequences/{id}/stop`

Operations
- POST `/bids/{version_id}/convert` (won → service plan/job)
- CRUD `/site-jobs`
- CRUD `/tickets`
- GET `/tickets?start&end&siteId&assigneeId`
- POST `/site-jobs/{id}/generate-tickets` (recurrence)

Execution
- CRUD `/checklist-templates`
- POST `/tickets/{id}/checklist`
- POST `/tickets/{id}/photos`

Timekeeping
- PUT `/sites/{id}/geofence`
- POST `/checkins`
- POST `/checkouts`
- GET `/timesheets`
- POST `/timesheets/{id}/approve`
- POST `/alt-checkin/checkin` (PIN mode)
- GET `/alerts`

Quality
- CRUD `/inspection-templates`
- POST `/inspections`
- POST `/inspections/{id}/submit`
- POST `/sync/inspections` (offline batch)
- POST `/inspections/{id}/followups`

Reports
- GET `/reports/ops-dashboard`
- GET `/reports/sales-dashboard`

## Webhooks
- must verify signature (provider retries)
- must be idempotent
