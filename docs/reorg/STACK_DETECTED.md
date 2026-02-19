# Stack Detection Report (Round 2)

**Date:** 2026-02-19
**Target:** gleamops_dev_pack
**Confidence:** HIGH

---

## Detected Stack

| Layer | Technology | Version | Evidence |
|-------|-----------|---------|----------|
| **Monorepo** | Turborepo + pnpm | v2.8.7, pnpm 9.15.9 | `turbo.json`, `pnpm-workspace.yaml`, 7 packages |
| **Frontend** | Next.js (App Router) | 15.5.12 | `next.config.ts`, `app/layout.tsx`, `app/(dashboard)/` |
| **React** | React | 19 | `package.json` |
| **TypeScript** | TypeScript | 5.7 | `tsconfig.base.json` |
| **Styling** | Tailwind CSS | 4 (CSS-first @theme) | `postcss.config.mjs`, semantic HSL tokens |
| **Backend** | Supabase | PostgreSQL + RLS + Auth + Storage + Realtime | `supabase/`, 84 migrations |
| **Testing** | Playwright (e2e) + Vitest (unit) | — | 15 e2e specs, vitest in 3 packages |
| **Deploy** | Vercel | — | `vercel.json`, `.vercel/` |
| **Mobile** | Expo React Native | — | `apps/mobile/app.json` |
| **Workers** | Background jobs | — | `apps/worker/src/` (3 workers) |

---

## Sentinel Files Confirmed

- [x] `turbo.json` — Turborepo
- [x] `pnpm-workspace.yaml` — pnpm workspaces
- [x] `next.config.ts` — Next.js
- [x] `app/layout.tsx` — App Router
- [x] `supabase/config.toml` — Supabase
- [x] `playwright.config.ts` — Playwright
- [x] `packages/*/vitest.config.ts` — Vitest (3 packages)
- [x] `apps/mobile/app.json` — Expo

---

## Changes Since Round 1 (2026-02-18)

| Metric | Round 1 | Round 2 |
|--------|---------|---------|
| Supabase migrations | 49 | **84** (+35) |
| API route files | 38 | **36** (recounted accurately) |
| Modules | 0 | **8** (added in round 1) |
| Thin-delegate routes | 0 | **7** (19% of total) |
| Error boundary | 0 | **1** (added in round 1) |

**Classification:** Template E (Monorepo) + Template A (Next.js App Router) — Hybrid
