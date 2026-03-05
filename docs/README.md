# GleamOps Docs

> 20 active docs. Everything else is in `_archive/` or `manual/`.
> For code patterns and architecture, see [`/CLAUDE.md`](/CLAUDE.md).

---

## Rules & Contracts (8 docs)

*These define HOW the app must be built. Follow them exactly.*

| Doc | What it governs |
|-----|-----------------|
| [schema-contract](schema-contract.md) | Table naming, standard columns, entity codes, FK/status/timestamp conventions |
| [no-delete-rules](no-delete-rules.md) | Soft delete pattern, 84 protected tables, cascade rules, emergency procedure |
| [api-contract](api-contract.md) | REST conventions, error format (RFC 9457), optimistic locking, pagination |
| [feature-flags](feature-flags.md) | 11 flag domains, env var setup, rollout lifecycle, removal criteria |
| [clickability](clickability.md) | 39-entity routing table, EntityLink map, back-link rules |
| [neuroinclusive-ux](neuroinclusive-ux.md) | 12 ADHD/Dyslexia/Anxiety rules with acceptance criteria |
| [terminology](terminology.md) | Canonical UI labels (Staff not Employee, Site not Location, etc.) |
| [rls-matrix](rls-matrix.md) | RLS policy checklist per table (tenant isolation, site scoping, role gates) |

## Domain Specs (12 docs)

*These define WHAT each feature does. Reference when building or debugging.*

| Doc | Domain |
|-----|--------|
| [cleanflow-engine](cleanflow-engine.md) | Bid math: production rates, workload, pricing strategies |
| [proposals-email](proposals-email.md) | PDF generation, SendGrid, follow-up state machine, rate limiting |
| [timekeeping](timekeeping.md) | Geofence, clock in/out, PIN fallback, exceptions, timesheets |
| [quality-inspections](quality-inspections.md) | Inspection templates, offline-first sync, issue-to-ticket automation |
| [inventory-assets-safety](inventory-assets-safety.md) | Supplies, kits, SDS integration, vehicle/key checkout |
| [messaging](messaging.md) | Thread model, routing rules (cleaner to supervisor), retention |
| [schedule-coverage](schedule-coverage.md) | Coverage gap detection, warning hierarchy, pre-publish validation |
| [search-performance](search-performance.md) | Index strategy, tsvector search, caching rules |
| [dashboards](dashboards.md) | KPI widgets, CSV export, materialized views |
| [mobile-offline](mobile-offline.md) | Expo app, SQLite, offline sync, photo upload retry |
| [testing](testing.md) | Test layers (unit/integration/contract/E2E), CI quality gates |
| [ops-runbooks](ops-runbooks.md) | Backups, monitoring, incident response, rate limiting |

*See also:* [ops-hardening](ops-hardening.md) — SendGrid signature verification, asset gating, staff mapping

---

## User Manual

40-file instruction manual in [`manual/`](manual/README.md) — module guides, field dictionaries, navigation, troubleshooting.

## QA Evidence

Deep module-by-module certification runs and reports live in [`deep-module-audits/`](deep-module-audits/README.md).

## Archive

Completed milestones and superseded docs in [`_archive/`](_archive/) — kept for git history, not active development.
