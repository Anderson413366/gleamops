# GleamOps Instruction Manual

> **Start here.** This manual covers every screen, button, and workflow in GleamOps.
> Written for clarity. Short steps. No fluff.

---

## How to Use This Manual

1. **New to GleamOps?** Start with [00-quickstart.md](./00-quickstart.md).
2. **Looking for a specific screen?** Use the [Navigation Cheatsheet](./01-navigation-cheatsheet.md).
3. **Need to do a specific task?** Go to the module file (listed below).
4. **Something broke?** Go to [Troubleshooting](./05-troubleshooting.md).
5. **Need a term defined?** Check the [Glossary](./06-glossary.md).

---

## Table of Contents

### Foundation (For Everyone)

| # | Document | What It Covers |
|---|----------|---------------|
| 00 | [Quickstart](./00-quickstart.md) | Get productive in 10 minutes |
| 01 | [Navigation Cheatsheet](./01-navigation-cheatsheet.md) | Where everything lives + keyboard shortcuts |
| 02 | [Roles & Permissions](./02-roles-permissions.md) | Who can do what |
| 03 | [Architecture Overview](./03-architecture-overview.md) | How the system is built (diagrams) |
| 04 | [Data Model Overview](./04-data-model-overview.md) | Key entities and how they connect |
| 05 | [Troubleshooting](./05-troubleshooting.md) | Panic guide: what to do when stuck |
| 06 | [Glossary](./06-glossary.md) | Plain-language definitions |

### Developer Deep Dives

| # | Document | What It Covers |
|---|----------|---------------|
| 07 | [Code Architecture](./07-code-architecture.md) | Folder-by-folder code structure, data flows, conventions |
| 08 | [Supabase Architecture](./08-supabase-architecture.md) | Tables, triggers, functions, RLS, multi-tenant design |
| 09 | [Developer Workflows](./09-developer-workflows.md) | How to add entities, pages, tabs, modules (step-by-step) |
| 10 | [Form Field Reference](./10-form-field-reference.md) | Every form, every field — tree-branch layout (38 forms, ~344 fields) |

### Module Guides

Each module has two files:
- **`<module>.md`** — How-to guides, workflows, what each screen does
- **`<module>-reference.md`** — Field dictionaries, button inventories, status values

| Module | Guide | Reference |
|--------|-------|-----------|
| Home (Dashboard) | [home.md](./modules/home.md) | [home-reference.md](./modules/home-reference.md) |
| Schedule | [schedule.md](./modules/schedule.md) | [schedule-reference.md](./modules/schedule-reference.md) |
| Jobs | [jobs.md](./modules/jobs.md) | [jobs-reference.md](./modules/jobs-reference.md) |
| Clients | [clients.md](./modules/clients.md) | [clients-reference.md](./modules/clients-reference.md) |
| Pipeline | [pipeline.md](./modules/pipeline.md) | [pipeline-reference.md](./modules/pipeline-reference.md) |
| Catalog | [catalog.md](./modules/catalog.md) | [catalog-reference.md](./modules/catalog-reference.md) |
| Team | [team.md](./modules/team.md) | [team-reference.md](./modules/team-reference.md) |
| Inventory | [inventory.md](./modules/inventory.md) | [inventory-reference.md](./modules/inventory-reference.md) |
| Equipment | [equipment.md](./modules/equipment.md) | [equipment-reference.md](./modules/equipment-reference.md) |
| Safety | [safety.md](./modules/safety.md) | [safety-reference.md](./modules/safety-reference.md) |
| Reports | [reports.md](./modules/reports.md) | [reports-reference.md](./modules/reports-reference.md) |
| Settings | [settings.md](./modules/settings.md) | [settings-reference.md](./modules/settings-reference.md) |
| Shifts & Time | [shifts-time.md](./modules/shifts-time.md) | [shifts-time-reference.md](./modules/shifts-time-reference.md) |
| Vendors | [vendors.md](./modules/vendors.md) | [vendors-reference.md](./modules/vendors-reference.md) |
| Operations (Legacy) | [operations.md](./modules/operations.md) | [operations-reference.md](./modules/operations-reference.md) |

### Contracts & Checklists

| Document | Purpose |
|----------|---------|
| [Clickability Contract](./CLICKABILITY-CONTRACT.md) | Rules for what must be clickable and where it links |
| [Coverage Checklist](./COVERAGE-CHECKLIST.md) | Completion gate — is the manual done? |

---

## Conventions Used in This Manual

- **Bold text** = button labels, menu items, page titles
- `Code text` = field names, URLs, keyboard shortcuts
- "Quoted text" = exact text you'll see on screen
- [Links] = click to jump to that section
- Numbers (1, 2, 3) = do these steps in order
- Bullets = items in any order

### Stop Points

> **Stop Point:** You can safely pause here. Your work is saved.

These appear after steps where it's safe to take a break. Nothing will be lost.

### Troubleshooting Blocks

> **If** the page is empty **→** clear all filters by clicking "all" in the status chips.

These appear inline when a step might not work as expected.

---

## Quick Reference

| Need | Shortcut |
|------|----------|
| Search anything | `Cmd+K` (Mac) or `Ctrl+K` (Windows) |
| New Client | `Cmd+Shift+C` |
| New Site | `Cmd+Shift+S` |
| New Prospect | `Cmd+Shift+P` |
| New Service Plan | `Cmd+Shift+J` |
| Log Ticket | `Cmd+Shift+T` |
| Keyboard shortcuts help | `?` |

---

*This manual was generated from the GleamOps source code (134 migrations, 30 detail pages, 38 forms, 108 API routes, 21 hooks, 28 service modules). Last updated: March 2026.*
