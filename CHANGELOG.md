# Changelog

All notable changes to GleamOps are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed
- README.md rewritten with verified repo stats
- CLAUDE.md updated with corrected counts (84 migrations, 32 UI components, 19 hooks, 29 forms, 21 detail pages, 16 service modules)
- Added CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, LICENSE, CHANGELOG.md

---

## [2026-02-19] — Reorg Round 2

### Changed
- Extracted ~2,827 LOC from 24 API route handlers into 10 new domain modules
- All 36 API routes now follow thin delegate pattern (auth → validate → service → respond)
- Route max LOC reduced from ~50 to ~37
- Repo health score improved from 78 to 91/100
- Renamed 3 mobile component files from PascalCase to kebab-case

### Added
- 10 new service modules: `proposals-pdf`, `cron`, `public-counts`, `public-proposals`, `schedule` (completed), `inventory-orders`, `workforce-hr`, `warehouse`, `sites`, plus extended `proposals` (signature)
- PR #11 merged to main

---

## [2026-02-18] — Reorg Round 1

### Changed
- Extracted ~1,200 LOC from 7 API route handlers into 8 domain modules
- Centralized schedule permissions into `schedule.permissions.ts`
- Repo health score improved from 75 to 78/100

### Added
- 8 new service modules: `inventory`, `webhooks`, `proposals`, `counts`, `fleet`, `schedule` (stub), `messages`, `timekeeping`
- Error boundary component for runtime resilience
- PR #11 branch created (`chore/reorg-20260218`)

---

## [2026-02-18] — v3.1 UI Phases

### Added
- Unified staff + subcontractor picker and badge components (PR #6)
- Check writers config editor and export management pages
- Schedule policies management UI
- Full evening planning board UI
- Deep-route bridge pages for canonical navigation (PR #5)

### Changed
- Aligned all 10 modules to v3.1 Target Product Tree IA (PR #7)
- v3.1 routing stabilization with requirements-evidence matrix

### Reverted
- PRs #8, #9, #10 reverted — restored to stable deployment state

---

## [2026-02-18] — Infrastructure Hardening

### Changed
- Centralized redirect query helper
- Removed dead code and non-runtime artifacts
- Added canonical host enforcement and DNS audit
- Fixed Homebrew PATH in quality-gates stop hook

### Added
- Checkbox component to `@gleamops/ui`
- Claude worktrees added to `.gitignore`

---

## [2026-02-17] — v3.1 Rollout

### Added
- Canonical schedule/planning sub-route branches
- v3.1 masterplan implementation with DB lint baseline

### Fixed
- v3 navigation and routing breakage from masterplan rename (PR #3)
- Vercel prerender failures and redirect loop conflicts (PR #4)
- Auth: preserve requested route when login is required
- Login: avoid `useSearchParams` prerender bailout

---

## [2026-02-15] — UI Overhaul

### Changed
- Semantic HSL-channel token system adopted across all pages
- Badge system unified to 7 colors (green, red, yellow, blue, orange, purple, gray)
- App shell reskinned (sidebar, header, frosted glass)
- All 8 entity tables given List/Card view toggle
- Adopted CollapsibleCard with localStorage persistence

### Added
- True Black mode option
- Claude Code hooks for quality gates
- Density toggle for table views

---

## [2026-02-14] — Design System & Polish

### Changed
- Apple-level redesign with Blue (#007AFF) brand
- Light sidebar, rounded-2xl cards
- Comprehensive visual overhaul — ADHD-friendly, clean, polished UI
- Text visibility fixes across 40 files (223 occurrences)
- Table declutter and spacing improvements

### Added
- Dark mode with system preference detection
- CSV export on all tables
- Full module restructuring — 12 sidebar modules, 8 new DB tables, 37 new components

---

## [2026-02-13] — Bidding & Pipeline

### Added
- Complete bidding module with 8-phase wizard
- Pipeline enhancements with URL-based tab routing
- Split Inventory & Assets into 3 separate modules
- Blueprint compliance — CRM detail relations, Job Detail drawer, dashboards
- Demo data seed script for production database

### Fixed
- 10 bugs: inventory crash, settings 404, broken buttons, display issues
- Staff dedup, pipeline route, payroll auth check
- Dashboard active-only counts + clickable stat cards

---

## [2026-02-12] — Foundation

### Added
- Milestones A–H complete: Foundation, Auth, Design System, CRM, Bidding, Proposals, Conversion, Schedule
- Atomic `convert_bid_to_job` RPC v2 with Problem Details error rendering
- Dispatch Drawer with staff availability filtering
- Inspection Template Builder with CRUD
- Mobile My Day screen + GPS Clock In
- Proposal sending end-to-end with queue worker + webhook integration
- WorkTicket Detail 7-tab progressive disclosure drawer
- Inventory, Assets, Admin pages with seed scripts
- Mobile offline MVP with react-query + auto-reconnect sync

### Fixed
- SendGrid webhook ECDSA verification hardening + tests
- Proposal send worker race conditions + idempotency
- 9 migration fixes for real Excel data import

---

## Project Timeline

| Date | Milestone |
|------|-----------|
| 2026-02-12 | Initial commit — Milestones A–H |
| 2026-02-13 | Bidding module + pipeline |
| 2026-02-14 | Design system overhaul |
| 2026-02-15 | Semantic token system |
| 2026-02-17 | v3.1 rollout |
| 2026-02-18 | Reorg round 1 (8 modules) |
| 2026-02-19 | Reorg round 2 (16 modules total) |
