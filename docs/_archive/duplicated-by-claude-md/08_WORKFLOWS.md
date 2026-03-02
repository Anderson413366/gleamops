# Key workflows (sequence diagrams + rules)

These are the flows that make or break trust. If these are wrong, the rest is decoration.

## 1) Proposal send + tracking

```mermaid
sequenceDiagram
  participant U as User (Web)
  participant API as API (Edge/Next)
  participant DB as Postgres
  participant W as Worker (PDF/Email)
  participant E as Email Provider

  U->>API: POST /proposals/{id}/send
  API->>DB: validate + create proposal_send (status=SENDING)
  API->>DB: enforce rate limits + idempotency
  API->>W: enqueue send job
  W->>E: send email with tracking link + provider metadata
  E-->>API: webhook delivered/open/bounce (retryable)
  API->>DB: insert email_event (idempotent)
  API->>DB: update proposal_send status pill
  API-->>U: UI shows Delivered/Open/Bounced
```

Rules:
- Webhook ingestion must be idempotent (provider retries).
- “Open” can be noisy (privacy blockers). Treat as “engaged signal”, not absolute truth.
- Bounce should stop follow-ups by default.

## 2) Won proposal → service plan/job → tickets

```mermaid
sequenceDiagram
  participant U as User
  participant API as API
  participant DB as Postgres
  participant W as Worker

  U->>API: PATCH /proposals/{id} status=WON
  API->>DB: mark proposal WON + stop sequences
  U->>API: POST /bids/{versionId}/convert
  API->>DB: begin transaction
  API->>DB: create site_job/service_plan + tasks
  API->>DB: create recurrence_rule
  API->>DB: create first N work_tickets
  API->>DB: write conversion_events
  API->>DB: commit
  API-->>U: returns client/site/job/ticket summary
```

Rules:
- Conversion is idempotent (cannot convert twice).
- Conversion uses transaction and emits conversion event stream.
- Support “dry run” mode: validate without committing.

## 3) Check-in/out with geofence + exceptions

```mermaid
sequenceDiagram
  participant C as Cleaner (Mobile)
  participant API as API
  participant DB as Postgres
  participant P as Push/Notify

  C->>API: POST /checkins (ticketId, lat, lng)
  API->>DB: load ticket + site geofence
  API->>API: evaluate inside/outside + late rules
  API->>DB: create time_entry + exception if needed
  API->>DB: alert supervisor if needed
  API->>P: push notification (optional)
  API-->>C: check-in confirmed + status
```

Rules:
- Out-of-geofence does not block check-in by default; it creates an exception.
- Managers can approve overrides.

## 4) Offline inspection sync (never lose completed work)

```mermaid
sequenceDiagram
  participant I as Inspector (Offline)
  participant API as API
  participant DB as Postgres

  I->>I: complete inspection locally (SQLite)
  Note over I: later network returns
  I->>API: POST /sync/inspections (batched)
  API->>DB: upsert by (tenant_id, client_id, local_id) + version
  API-->>I: mapping of localId -> serverId
```

Conflict rule (recommended):
- version mismatch returns `INSP_003` + server state
- client can show “Resolve” UI or retry

## 5) Asset chain gating (vehicle + keys)

- Starting ticket may require:
  - vehicle checkout (if job is route-based)
  - key custody confirmation (if key-controlled site)

Rules:
- Ticket cannot be marked “Completed” unless required key state is recorded.
- Ticket cannot be “Started” if required vehicle checkout missing (configurable by job).
