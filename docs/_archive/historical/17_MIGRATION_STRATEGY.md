# Migration + Transition Strategy (Prototype → GleamOps vFinal2)

This is where software projects go to die: *“Let’s just retrofit the new architecture into the old database.”*

We are not doing that.

## Executive decision (recommended)
**Build GleamOps as a GREENFIELD repo + new Supabase project**, then cut over using a **Strangler Fig** transition:

1) Keep the current app running (so revenue doesn’t stop).  
2) Build GleamOps correctly (RLS-first + Service DNA + Sales→Ops continuity).  
3) Migrate data (imports + mapping scripts).  
4) Cut over users once the Sales→Ops loop is stable.  

Why:
- Retrofitting tenant isolation + RLS into an existing unstructured schema is painful and risky.
- The “Service DNA → Bids → Jobs → Tickets” chain is relational. If the old DB is “flat,” migrations get ugly fast.
- You want speed and certainty, not a month of “why did this foreign key explode.”

---

## Phase 0: Discovery (before touching anything)
- Export current schema: `pg_dump --schema-only --no-owner $DATABASE_URL > current_schema.sql`
- Inventory existing RLS policies and roles
- Identify existing “system tables” you will reuse (users, roles, lookups, sequences)
- Pull a data sample export (CSV dumps) for: clients/sites/staff/any existing bids/jobs/tickets

Deliverable: `docs/migration/current_schema.sql` + a mapping spreadsheet.

---

## Phase 1: Build GleamOps in parallel
- New repo (this dev pack)
- New Supabase project (staging first, prod later)
- Implement Milestones A → G first (Foundation through Won conversion)
- Seed lookups + role table
- Build import tooling (CSV import + idempotent upserts)

Deliverable: “Bid → Proposal → Send → Open tracking → Won → Tickets generated” working end-to-end.

---

## Phase 2: Data import (controlled + repeatable)
### Import order
1) tenants/companies  
2) users + roles  
3) clients → sites → contacts  
4) staff  
5) services/tasks templates  
6) active contracts/jobs (if any)  
7) tickets (if any)  
8) attachments/files  
9) historical events (optional)

Rules:
- idempotent imports (re-run safe)
- preserve original ids/codes in `source_system` columns when needed
- do not import “junk statuses” (normalize into the new lookups/state machines)

---

## Phase 3: Cutover (Strangler Fig)
### Step A: soft launch
- Give access to a small pilot group
- Run real bids and conversions
- Validate schedule performance

### Step B: “feature switch” cutover
- Freeze writes in old system for a short window
- Import last delta
- Point production users to GleamOps
- Keep old system read-only for 30–90 days

---

## Rollback plan (because reality exists)
- Always snapshot DB before cutover
- Keep old system running read-only
- Every migration script has a “down” or is isolated to new schema namespaces
- If cutover fails, revert DNS / login routing and keep imports for later

---

## Post-cutover integrity checklist
- record counts match expected
- no orphan foreign keys
- RLS policies validated using tenant test accounts
- CleanFlow calculations match baseline fixtures
- schedule loads under target time on real ticket volume
