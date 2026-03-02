# GleamOps Documentation Index

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

### API & Contracts

| Doc | Summary |
|-----|---------|
| [API Contract](06_API_CONTRACT.md) | API conventions, Problem Details format |
| [P0 Schema Contract](P0_SCHEMA_CONTRACT.md) | Naming conventions, standard columns, entity codes |
| [P0 Feature Flag Guide](P0_FEATURE_FLAG_GUIDE.md) | Feature flag mechanics (17 domains) |
| [P0 No-Delete Checklist](P0_NO_DELETE_CHECKLIST.md) | Hard delete prevention, cascade rules, 84 protected tables |
| [App Clickability Contract](app-clickability-contract.md) | Every entity navigates to detail page — 39-entity routing table |
| [Neuroinclusive UX Contract](neuroinclusive-ux-contract.md) | 12 ADHD/Dyslexia/Anxiety UX rules with acceptance criteria |
| [Terminology Glossary](terminology-glossary.md) | Canonical terms for UI labels |

### Domain Logic

| Doc | Summary |
|-----|---------|
| [CleanFlow Engine](09_CLEANFLOW_ENGINE.md) | Bid math: production rates, workload, pricing strategies |
| [Proposals & Email](10_PROPOSALS_EMAIL.md) | PDF gen, SendGrid, follow-up state machine, rate limiting |
| [Timekeeping](12_TIMEKEEPING.md) | Clock in/out, geofence, PIN fallback, exceptions |
| [Quality](13_QUALITY.md) | Inspections, offline-first sync, issue-to-ticket automation |
| [Inventory, Assets, Safety](14_INVENTORY_ASSETS_SAFETY.md) | Supply management, kits, SDS integration |
| [Messaging](27_MESSAGING.md) | Thread model, routing rules, permissions, retention |
| [Schedule Coverage Warnings](schedule-coverage-warnings-spec.md) | Coverage gap detection, pre-publish validation |

### Infrastructure

| Doc | Summary |
|-----|---------|
| [Search & Performance](15_SEARCH_PERFORMANCE.md) | Index strategy, caching, query optimization |
| [Testing & QA](16_TESTING_QA.md) | Test layers, CI quality gates |
| [Reporting & Dashboards](22_REPORTING_DASHBOARDS.md) | Dashboard KPIs, export, materialized views |
| [Mobile & Offline](23_MOBILE_OFFLINE.md) | Expo app, SQLite, offline sync strategy |
| [Operations Runbooks](24_OPERATIONS_RUNBOOKS.md) | Backups, monitoring, incident response |
| [Ops Hardening](ops-hardening.md) | SendGrid signature verification, asset gating, staff mapping |

### Appendices

| Doc | Summary |
|-----|---------|
| [E — RLS Policy Matrix](appendices/E_RLS_POLICY_MATRIX.md) | RLS policy checklist across all domains |

---

## User Manual

The [`manual/`](manual/) folder contains the 40-file user instruction manual — module guides, field dictionaries, navigation cheatsheets, and troubleshooting.

See [`manual/README.md`](manual/README.md) for the manual index.

---

## Archive

Historical docs from completed milestones and content absorbed into CLAUDE.md.

| Folder | Contents |
|--------|----------|
| [`_archive/completed-plans/`](_archive/completed-plans/) | UI refresh, scheduling P1-P8, Monday.com replacement, Shifts & Time, verification |
| [`_archive/duplicated-by-claude-md/`](_archive/duplicated-by-claude-md/) | Product scope, architecture, data model, security, UX rules, workflows, ops, error catalog, ADR log |
| [`_archive/historical/`](_archive/historical/) | AI runbook, migration strategy, JIRA backlog, AI prompts, P0 defects, integrity audit, QA checklist, architecture handoff |
| [`_archive/appendices/`](_archive/appendices/) | Table catalog, endpoint catalog, lookup seeds, migration plan, schema reference |
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
