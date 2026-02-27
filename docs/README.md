# GleamOps Documentation Index

> Quick-reference index for all project documentation.

---

## Start Here

| File | Purpose |
|------|---------|
| [`/AGENTS.md`](/AGENTS.md) | Universal AI entry point — read order, rules, repo map |
| [`/README.md`](/README.md) | Project truth — tech stack, quickstart, architecture |
| [`/CLAUDE.md`](/CLAUDE.md) | Claude-specific context — patterns, code examples, conventions |
| [`/CONTRIBUTING.md`](/CONTRIBUTING.md) | Dev setup, coding standards, PR process |

---

## Core Documentation

### Planning & Scope

| # | Doc | Summary |
|---|-----|---------|
| 00 | [Executive Summary](00_EXEC_SUMMARY.md) | One-page project overview |
| 00 | [Master Dev Plan](00_MASTER_DEV_PLAN.md) | Roadmap and milestone tracking |
| 01 | [Product Scope](01_PRODUCT_SCOPE.md) | Feature boundaries, what's in/out |

### Design & UX

| # | Doc | Summary |
|---|-----|---------|
| 02 | [UX Rules (ADHD)](02_UX_RULES_ADHD.md) | Neuro-optimized accessibility rules |
| 03 | [Architecture](03_ARCHITECTURE.md) | System architecture decisions |

### Data & Security

| # | Doc | Summary |
|---|-----|---------|
| 04 | [Data Model](04_DATA_MODEL.md) | Table patterns, dual keys, standard columns |
| 05 | [Security & RLS](05_SECURITY_RLS.md) | Tenant isolation, RLS policies, site scoping |
| 06 | [API Contract](06_API_CONTRACT.md) | API conventions, OpenAPI reference |
| 07 | [Error Catalog](07_ERROR_CATALOG.md) | RFC 9457 Problem Details error codes |

### Business Logic

| # | Doc | Summary |
|---|-----|---------|
| 08 | [Workflows](08_WORKFLOWS.md) | Sequence diagrams for critical flows |
| 09 | [CleanFlow Engine](09_CLEANFLOW_ENGINE.md) | Bid math: rates, workload, pricing |
| 10 | [Proposals & Email](10_PROPOSALS_EMAIL.md) | PDF gen, send, tracking, follow-ups |
| 11 | [Operations & Tickets](11_OPERATIONS_TICKETS.md) | Service plans, recurrence, ticket lifecycle |
| 12 | [Timekeeping](12_TIMEKEEPING.md) | Clock in/out, timesheet logic |
| 13 | [Quality](13_QUALITY.md) | Inspections, quality control |
| 14 | [Inventory, Assets, Safety](14_INVENTORY_ASSETS_SAFETY.md) | Supply management, equipment, safety certs |

### Infrastructure

| # | Doc | Summary |
|---|-----|---------|
| 15 | [Search & Performance](15_SEARCH_PERFORMANCE.md) | Search implementation, performance tuning |
| 16 | [Testing & QA](16_TESTING_QA.md) | Test strategy, coverage goals |
| 17 | [Migration Strategy](17_MIGRATION_STRATEGY.md) | Database migration approach |
| 22 | [Reporting & Dashboards](22_REPORTING_DASHBOARDS.md) | Dashboard widgets, reports |
| 23 | [Mobile & Offline](23_MOBILE_OFFLINE.md) | Expo app, offline sync |
| 27 | [Messaging](27_MESSAGING.md) | Thread messaging system |

### Operations

| # | Doc | Summary |
|---|-----|---------|
| 18 | [AI Developer Runbook](18_AI_DEVELOPER_RUNBOOK.md) | AI-assisted development guide |
| 19 | [AI Agent Prompts](19_AI_AGENT_PROMPTS.md) | AI agent prompt library |
| 20 | [ADR Log](20_ADR_LOG.md) | Architecture Decision Records |
| 21 | [Claude Code God Prompt](21_CLAUDE_CODE_GOD_PROMPT.md) | Claude Code configuration |
| 24 | [Operations Runbooks](24_OPERATIONS_RUNBOOKS.md) | Production operations playbook |
| 25 | [JIRA Backlog](25_JIRA_BACKLOG.md) | Backlog tracking and prioritization |
| 26 | [Verification Checklist](26_VERIFICATION_CHECKLIST.md) | Pre-deploy verification |

---

## Appendices

| Doc | Summary |
|-----|---------|
| [A — Table Catalog](appendices/A_TABLE_CATALOG.md) | Full ~86 table reference |
| [B — Endpoint Catalog](appendices/B_ENDPOINT_CATALOG.md) | All API endpoints |
| [C — Lookup Seed](appendices/C_LOOKUP_SEED.md) | Lookup data seed values |
| [D — SQL Migration Plan](appendices/D_SQL_MIGRATION_PLAN.md) | Migration sequence |
| [E — RLS Policy Matrix](appendices/E_RLS_POLICY_MATRIX.md) | RLS policy reference |
| [F — V7 Schema Reference](appendices/F_V7_SCHEMA_REFERENCE.sql) | Canonical SQL schema |

---

## Specialized Docs

| Folder | Purpose |
|--------|---------|
| [`reorg/`](reorg/) | Code reorganization reports, audit, validation results |
| [`scheduling/`](scheduling/) | Schedule system design (state analysis, gap matrix, RPC contracts) |
| [`schema/`](schema/) | Schema JSON definitions |
| [`ui-refresh/`](ui-refresh/) | UI token migration, theme modes, quality gaps |
| [`execution/`](execution/) | Execution checklists |

---

## Governance

| File | Purpose |
|------|---------|
| [`/SECURITY.md`](/SECURITY.md) | Vulnerability reporting, security architecture |
| [`/CODE_OF_CONDUCT.md`](/CODE_OF_CONDUCT.md) | Contributor Covenant |
| [`/LICENSE`](/LICENSE) | Proprietary license |
| [`/CHANGELOG.md`](/CHANGELOG.md) | Project changelog |
