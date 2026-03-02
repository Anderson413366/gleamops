# GleamOps Documentation Index

> Quick-reference index for all project documentation.
> For full architecture, code patterns, and conventions see [`/CLAUDE.md`](/CLAUDE.md).

---

## Start Here

| File | Purpose |
|------|---------|
| [`/CLAUDE.md`](/CLAUDE.md) | **Primary context** — architecture, patterns, code examples, conventions |
| [`/README.md`](/README.md) | Project truth — tech stack, quickstart |
| [`/AGENTS.md`](/AGENTS.md) | Universal AI entry point — read order, rules, repo map |
| [`/CONTRIBUTING.md`](/CONTRIBUTING.md) | Dev setup, coding standards, PR process |

---

## Active Reference Docs

### Product & API

| # | Doc | Summary |
|---|-----|---------|
| 01 | [Product Scope](01_PRODUCT_SCOPE.md) | Feature boundaries — what's in/out |
| 06 | [API Contract](06_API_CONTRACT.md) | API conventions, Problem Details format |
| 07 | [Error Catalog](07_ERROR_CATALOG.md) | RFC 9457 error codes |
| 20 | [ADR Log](20_ADR_LOG.md) | Architecture Decision Records — the *why* behind decisions |

### Domain Logic

| # | Doc | Summary |
|---|-----|---------|
| 09 | [CleanFlow Engine](09_CLEANFLOW_ENGINE.md) | Bid math: rates, workload, pricing |
| 10 | [Proposals & Email](10_PROPOSALS_EMAIL.md) | PDF gen, send, tracking, follow-ups |
| 12 | [Timekeeping](12_TIMEKEEPING.md) | Clock in/out, geofence, timesheet derivation |
| 13 | [Quality](13_QUALITY.md) | Inspections, quality control |
| 14 | [Inventory, Assets, Safety](14_INVENTORY_ASSETS_SAFETY.md) | Supply management, equipment, safety certs |
| 27 | [Messaging](27_MESSAGING.md) | Thread messaging system |

### Infrastructure & Operations

| # | Doc | Summary |
|---|-----|---------|
| 15 | [Search & Performance](15_SEARCH_PERFORMANCE.md) | Search implementation, performance tuning |
| 16 | [Testing & QA](16_TESTING_QA.md) | Test strategy, coverage goals |
| 18 | [AI Developer Runbook](18_AI_DEVELOPER_RUNBOOK.md) | AI-assisted development playbook |
| 22 | [Reporting & Dashboards](22_REPORTING_DASHBOARDS.md) | Dashboard widgets, reports |
| 23 | [Mobile & Offline](23_MOBILE_OFFLINE.md) | Expo app, offline sync |
| 24 | [Operations Runbooks](24_OPERATIONS_RUNBOOKS.md) | Production operations playbook |

### Contracts & Governance

| Doc | Summary |
|-----|---------|
| [P0 Feature Flag Guide](P0_FEATURE_FLAG_GUIDE.md) | Feature flag mechanics (17 domains) |
| [P0 No-Delete Checklist](P0_NO_DELETE_CHECKLIST.md) | Hard delete prevention rules |
| [P0 Schema Contract](P0_SCHEMA_CONTRACT.md) | Naming conventions frozen at P0 |
| [Architecture Handoff](ARCHITECTURE_HANDOFF.md) | Current-state summary + future roadmap |
| [App Clickability Contract](app-clickability-contract.md) | Every entity navigates to detail page |
| [App Integrity Audit](app-integrity-audit.md) | Full route inventory (76 pages) |
| [Neuroinclusive UX Contract](neuroinclusive-ux-contract.md) | 12 ADHD/Dyslexia/Anxiety UX rules |
| [Terminology Glossary](terminology-glossary.md) | Canonical terms for UI labels |
| [Ops Hardening](ops-hardening.md) | P0/P1 security hardening checklist |
| [QA Manual Checklist](qa-manual-checklist.md) | Manual QA test checklist |
| [Schedule Coverage Warnings](schedule-coverage-warnings-spec.md) | Coverage gap detection spec |

---

## Appendices

| Doc | Summary |
|-----|---------|
| [A — Table Catalog](appendices/A_TABLE_CATALOG.md) | Full ~251 object reference |
| [B — Endpoint Catalog](appendices/B_ENDPOINT_CATALOG.md) | All API endpoints |
| [C — Lookup Seed](appendices/C_LOOKUP_SEED.md) | Lookup data seed values |
| [D — SQL Migration Plan](appendices/D_SQL_MIGRATION_PLAN.md) | Migration sequence |
| [E — RLS Policy Matrix](appendices/E_RLS_POLICY_MATRIX.md) | RLS policy reference |
| [F — V7 Schema Reference](appendices/F_V7_SCHEMA_REFERENCE.sql) | Canonical SQL schema |

---

## User Manual

The [`manual/`](manual/) folder contains the full 40-file user instruction manual — module guides, reference docs, navigation cheatsheets, and troubleshooting.

See [`manual/README.md`](manual/README.md) for the manual index.

---

## Feature Dev Plans

| Folder | Summary |
|--------|---------|
| [`dev/`](dev/) | Shifts & Time master plan + phase 0 baseline |

---

## Archive

Historical docs from completed milestones. Kept for reference, not active development.

| Folder | What was completed |
|--------|-------------------|
| [`_archive/completed-plans/`](_archive/completed-plans/) | UI refresh, scheduling P1-P8, Monday.com replacement, verification |
| [`_archive/duplicated-by-claude-md/`](_archive/duplicated-by-claude-md/) | Docs whose content was absorbed into CLAUDE.md |
| [`_archive/historical/`](_archive/historical/) | Migration strategy, JIRA backlog, AI prompts, P0 defects |
| [`_archive/reorg/`](_archive/reorg/) | Previous restructuring attempt |
| [`_archive/execution/`](_archive/execution/) | Session close-out logs |
| [`_archive/schema-snapshots/`](_archive/schema-snapshots/) | Legacy schema JSON definitions |

---

## Governance

| File | Purpose |
|------|---------|
| [`/SECURITY.md`](/SECURITY.md) | Vulnerability reporting, security architecture |
| [`/CODE_OF_CONDUCT.md`](/CODE_OF_CONDUCT.md) | Contributor Covenant |
| [`/LICENSE`](/LICENSE) | Proprietary license |
| [`/CHANGELOG.md`](/CHANGELOG.md) | Project changelog |
