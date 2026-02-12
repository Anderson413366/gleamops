# Executive summary

Your earlier “plan” had the right ideas, but the inspections were correct: without **constraints, indexes, RLS policies, conversion rules, error catalog, and test gates**, it wasn’t implementation-ready.

This dev pack fixes that. It’s now a buildable blueprint that a lead AI developer can execute *without inventing the product in the gaps*.

## What’s now fully specified (the inspection punch‑list)

### Data integrity (no more garbage-in garbage-out)
- Database **constraints** (NOT NULL, CHECKs, FK rules) for all business-critical fields
- **Soft delete** columns standardized across tables (`archived_at`, `archived_by`, `archive_reason`)
- **Optimistic locking** via `version_etag` for concurrent edits (bid wizard, proposals, jobs)

### Performance and scalability (no “it worked on my laptop”)
- Index plan for:
  - pipeline lookups (status/stage, owners)
  - schedule queries (tickets by date/assignee/site)
  - high-write tables (email events, check-in/out events)
  - full-text search (tsvector + GIN)
  - fuzzy duplicate detection (pg_trgm)

### Security (RLS-first, tenant-safe)
- Multi-tenant isolation strategy with **explicit RLS policies**
- RBAC + **site-scoping** (supervisors only see assigned sites)
- Secure file delivery via **signed URLs** + private buckets
- Webhook ingestion with signature verification (email tracking)

### Bid engine (CleanFlow) is now deterministic and explainable
- Production rate matching algorithm (most-specific → least-specific)
- Workloading formulas (minutes/hours)
- Pricing formulas (true labor cost + burden + supplies + overhead + profit)
- “Why this price?” explanation payload (trust-building, not vibes)

### Conversion is now a real system, not a wish
- Explicit trigger: *user action* (“Convert to Job”) or API call
- Transaction rules, idempotency, duplicate prevention
- Conversion event stream for auditability and forensic debugging
- Optional **dry-run** conversion mode to validate before committing

### Follow-ups are now a state machine (not a spam cannon)
- Sequence states, send states, bounce stop rules
- Timezone rules and business-hours scheduling
- Stop conditions (Won/Lost/Manual stop) enforced

### Ops reality is included (Assets, Inventory, Safety)
- SDS links at the site and ticket level
- Key custody and vehicle checkout rules integrated into ticket lifecycle
- Staff certifications tracking (compliance)

## Canonical terms (so the codebase doesn’t become a synonym museum)
- Product name: **GleamOps**
- Sales/bid math engine folder name: **CleanFlow**
- Operational center of gravity: **Work Ticket**

## Next-step for engineering
1. Implement the database foundation + RLS (`docs/04_DATA_MODEL.md`, `docs/05_SECURITY_RLS.md`)
2. Implement CleanFlow calculation package and unit tests (`docs/09_CLEANFLOW_ENGINE.md`)
3. Ship Pipeline MVP (Prospects → Bid → Proposal PDF → Send/Track)
4. Ship Won → Service Plan → Tickets conversion
5. Ship Schedule + Ticket execution + Timekeeping + Quality

If the build follows this order, you get value early and avoid the classic ERP death spiral.
