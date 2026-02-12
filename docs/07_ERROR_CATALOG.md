# Error catalog (Problem Details)

We use **Problem Details for HTTP APIs** (`application/problem+json`).  
All error responses share the same shape.

## Response shape

```json
{
  "type": "https://gleamops.app/errors/BID_003",
  "title": "Workload calculation failed",
  "status": 422,
  "detail": "Missing production rate for task VACUUM_CARPET",
  "instance": "/bids/BID-000123/versions/2/calculate",
  "code": "BID_003",
  "errors": [
    { "field": "tasks[3].task_code", "message": "No production rate configured" }
  ]
}
```

Notes:
- `type` is a stable URL.
- `code` is the internal catalog key for analytics and support.

## Sales / Pipeline errors

Prospects
- `PROSPECT_001` (400) Invalid prospect data
- `PROSPECT_002` (404) Prospect not found
- `PROSPECT_003` (409) Prospect already converted
- `PROSPECT_004` (422) Missing contact method (email/phone)

Bids
- `BID_001` (400) No areas defined
- `BID_002` (409) Bid version locked (sent snapshot)
- `BID_003` (422) Missing production rate for a task
- `BID_004` (409) ETag mismatch (concurrent edit)
- `BID_005` (400) Invalid schedule configuration

Proposals
- `PROPOSAL_001` (400) Proposal incomplete
- `PROPOSAL_002` (429) Proposal send rate limit exceeded
- `PROPOSAL_003` (502) Email provider failed
- `PROPOSAL_004` (409) Proposal already sent (idempotency conflict)
- `PROPOSAL_005` (500) PDF generation failed

Conversion
- `CONVERT_001` (409) Bid not won
- `CONVERT_002` (409) Already converted
- `CONVERT_003` (500) Conversion failed (entity creation failed)
- `CONVERT_004` (400) Invalid conversion mode

Follow-ups
- `FOLLOWUP_001` (409) Sequence stopped
- `FOLLOWUP_002` (409) Proposal won/lost (stop condition)
- `FOLLOWUP_003` (422) Invalid delay or timezone config

## Operations / Tickets errors
- `TICKET_001` (404) Ticket not found
- `TICKET_002` (409) Ticket already completed
- `TICKET_003` (422) Missing required checklist items
- `TICKET_004` (409) Asset requirement not satisfied (vehicle/keys)

## Timekeeping errors
- `TIME_001` (409) Already checked in
- `TIME_002` (409) No active check-in found
- `TIME_003` (422) Out of geofence (exception created)
- `TIME_004` (403) Not allowed for this site

## Quality / Inspection errors
- `INSP_001` (422) Inspection incomplete
- `INSP_002` (409) Inspection already submitted
- `INSP_003` (409) Offline sync conflict (version mismatch)

## Auth / Access errors
- `AUTH_001` (401) Unauthorized
- `AUTH_002` (403) Forbidden
- `AUTH_003` (403) Tenant scope mismatch

## System errors
- `SYS_001` (429) Rate limit exceeded
- `SYS_002` (503) Service unavailable
