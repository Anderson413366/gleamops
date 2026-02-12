# Claude Code “God Prompt” (Scaffold + Guardrails)
**Version:** vFinal2  
**Date:** 2026-02-12

Paste this into Claude Code at the start of the project to scaffold the repo.
Then use the milestone prompts in `docs/19_AI_AGENT_PROMPTS.md` for execution.

---

```markdown
Act as a Principal Software Architect and Lead Full-Stack Engineer.

Project: GleamOps (B2B ERP for commercial cleaning)
Objective: Build a GREENFIELD Next.js + Supabase ERP that replaces spreadsheets.

Design principles:
- Data continuity: Services → Bids → Proposals → Won conversion → Contracts → Tickets → Time/QA/Inventory/Assets/Safety
- Work Ticket is the nucleus
- Apple-simple UX (no clutter; progressive disclosure; list→drawer; one primary action)
- ADHD-friendly defaults (clear next actions; minimal cognitive load)

Scope (v1 in):
- Pipeline: prospects/bids/proposals/send/tracking/follow-ups/win-loss
- Service DNA: tasks/services/service_tasks
- Ops: service plans/contracts created from won proposals
- Scheduling: recurring + one-time tickets, drag/drop reassign/reschedule
- Execution: ticket checklists + photos
- Timekeeping: geofence check-in/out, exceptions, timesheets, approvals, PIN override
- Quality: offline-first inspections + reports + follow-up tickets
- Messaging: controlled 1:1 + supervisor escalation
- Reporting: ops/sales dashboards + exports
- Optional: QuickBooks Online timesheet sync only
Out of scope:
- invoicing/payments/taxes

Hard constraints:
1) Use OpenAPI 3.1 contract-first (openapi/openapi.yaml)
2) Errors use application/problem+json (RFC 9457 style) with stable error codes
3) RLS enabled on ALL tenant tables (tenant_id required)
4) Soft delete + optimistic locking (version_etag / If-Match)
5) CleanFlow engine must live in packages/cleanflow and be pure (no framework imports)
6) PDF generation must be async in Node runtime worker (NOT edge)

Database schema:
- Implement the v7.0 schema snippet EXACTLY as a subset (same columns and relationships):
  See: docs/appendices/F_V7_SCHEMA_REFERENCE.sql
- Extend with standard columns (tenant_id, created_at, updated_at, archived_at, version_etag) and add additional module tables from:
  - docs/appendices/A_TABLE_CATALOG.md
  - spreadsheets/GleamOps_Master_Roadmap_vFinal2.xlsx

Output required right now:
1) Full monorepo directory structure
2) package.json dependencies (Next.js, Supabase, Zod, RHF, React Query or server actions, @react-pdf/renderer, Sentry)
3) Supabase migrations scaffolded (empty stubs per milestone, correct order)
4) A plan for convert_bid_to_job (atomic transaction; idempotent; dry-run option)

Do not invent new modules or change the table catalog without explicit instruction.
```
