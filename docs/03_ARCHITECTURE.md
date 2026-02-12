# Architecture

Target: **One product**, not a franken-stack. Keep infra minimal, but don’t be naïve about background jobs and security.

## High-level architecture

- **Web:** Next.js (TypeScript)
- **Mobile:** React Native (Expo) (TypeScript)
- **Backend data plane:** Supabase Postgres + RLS
- **Backend logic plane:**
  - Supabase Edge Functions (Deno) for:
    - lightweight secure RPC endpoints
    - webhook ingestion (email events)
    - calculation endpoints (CleanFlow) if runtime permits
  - Node runtime (Next.js route handler OR worker) for:
    - PDF generation (@react-pdf/renderer)
    - heavy processing / long jobs

### Why split Deno Edge vs Node?
Supabase Edge Functions are Deno-based. That’s great for fast edge logic, but not ideal for complex Node libraries (PDF toolchains, headless browsers, etc.). So PDFs run in Node.

## “One package” monorepo

Recommended monorepo layout:

```
gleamops/
  apps/
    web/        # Next.js
    mobile/     # Expo RN
    worker/     # Optional Node worker (PDFs, follow-ups, sync)
  packages/
    domain/     # Pure TS domain rules (no framework imports)
    shared/     # Types, Zod schemas, constants, error catalog
    ui/         # Design system components/tokens
    cleanflow/  # Bid/workloading/pricing engine (pure functions)
  supabase/
    migrations/
    functions/  # Edge functions (Deno)
    storage/    # bucket rules (docs)
  docs/
```

### Code boundary rule
- **packages/domain** and **packages/cleanflow** contain rules and math.
- Apps call domain/use-cases, not the other way around.
- No database calls inside cleanflow math.

## Runtime components

### Postgres (Supabase)
- Source of truth
- RLS enforced on all tables
- Triggers for:
  - `updated_at` timestamps
  - `version_etag` rolling
  - audit events
  - status transition validation

### Storage
Use private buckets for:
- proposals PDFs
- bid walkthrough photos
- checklist / inspection photos
Use signed URLs for access.

### Realtime
Use one of:
- Supabase Realtime for listening to Postgres changes (tickets, messages)
- or explicit websockets service later

### Background jobs
You need background jobs for:
- PDF generation
- follow-up emails
- recurring ticket generation
- QuickBooks sync

Minimal-infra approach:
- Start with **worker** using Postgres-backed queue (pg-boss or graphile-worker)
- Move to Redis/BullMQ only if you actually need it

## Environments

- dev: local + Supabase dev project
- staging: production-like
- prod: production

## CI/CD gates (minimum)
- Lint + typecheck
- Unit tests (cleanflow math)
- Integration tests (API endpoints against test DB)
- Contract validation (OpenAPI)
- Migration checks
- Build web/mobile/worker

## Observability
- Structured logs (JSON)
- Error tracking (Sentry)
- Audit logs in DB for all sensitive operations
