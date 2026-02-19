# Stack Detection Report

**Date:** 2026-02-18
**Target:** gleamops_dev_pack

---

## Detected Stack

| Layer | Technology | Confidence |
|-------|-----------|------------|
| **Monorepo** | Turborepo v2 + pnpm 9.15.9 | HIGH |
| **Frontend** | Next.js 15 (App Router) + React 19 + TypeScript 5.7 | HIGH |
| **Styling** | Tailwind CSS 4 (CSS-first @theme) | HIGH |
| **Backend** | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) | HIGH |
| **Testing** | Playwright (E2E) + Vitest (unit) | HIGH |
| **Deploy** | Vercel (web), worker TBD | HIGH |
| **Package Manager** | pnpm 9.15.9 | HIGH |

---

## Evidence

### Monorepo
- `turbo.json` present at root with build/dev/lint/typecheck/test tasks
- `pnpm-workspace.yaml` present at root
- `/apps` directory with `web`, `mobile`, `worker`
- `/packages` directory with `shared`, `domain`, `cleanflow`, `ui`
- Root `package.json` has `"packageManager": "pnpm@9.15.9"`

### Next.js 15 App Router
- `apps/web/next.config.ts` present
- `apps/web/src/app/layout.tsx` present (App Router sentinel)
- Route groups: `(auth)`, `(dashboard)` in `/app`
- Dynamic routes: `[id]`, `[code]`, `[token]`, `[slug]`, `[entity]`
- API routes under `/app/api/` using `route.ts` convention
- `export const dynamic = 'force-dynamic'` in page files

### Supabase
- `/supabase` directory with 49 migrations
- `@supabase/supabase-js` and `@supabase/ssr` in dependencies
- RLS patterns in migration files
- `getServiceClient()` and `getSupabaseBrowserClient()` patterns in code
- JWT-based auth with `custom_access_token_hook`

### TypeScript 5.7
- `tsconfig.base.json` at root
- `tsconfig.json` in each app/package
- `.ts` and `.tsx` files throughout

### Tailwind CSS 4
- CSS-first `@theme` configuration
- Semantic HSL tokens (--background, --foreground, etc.)

### Playwright
- `apps/web/e2e/` with 15 `.spec.ts` files
- `playwright.config.ts` in web app

### Vitest
- `vitest.config.ts` in packages
- `__tests__/` directories in cleanflow (7), domain (2), shared (2), lib (2)

---

## Classification

**Primary Template Match:** Template E (Monorepo) + Template A (Next.js App Router)

This is a **Turborepo monorepo** with a **Next.js 15 App Router** as the primary app, **Supabase** as the backend-as-a-service, and **four shared packages** providing types, business rules, math, and UI components.

**Confidence:** HIGH (all sentinel files confirmed)
