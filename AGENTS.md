# AGENTS.md
# Repo Operating Manual for Any AI (Read This First)

> **Purpose:** This file is the universal entry point for *any* coding AI (Claude, Codex, Copilot, Cursor, etc.).
> **Rule:** If you are about to touch code, read this file first.

---

## One-screen scoreboard
- **Do first:** Read `README.md` → `docs/README.md` → relevant docs under `docs/` and `agents/`
- **Mode:** Plan first. Apply only if explicitly requested.
- **Non-negotiable:** Preserve observable behavior.
- **Never:** Rename DB tables/routes/endpoints/env vars unless explicitly authorized.

---

## Read order (mandatory)
1) `AGENTS.md` (this file)
2) `README.md` (project truth + quickstart)
3) `docs/README.md` (docs index)
4) `agents/` (tool-specific guidance, if present)
5) Domain docs in `docs/architecture/`, `docs/reference/`, `docs/runbooks/` (as needed)

If any of these are missing, create them **only if asked** or if your task is doc-related.

---

## Repo map (predictable structure)
Use this as the default "where things live" map.

- `/app` or `/src/routes`
  UI routes. Minimal logic. No DB calls.
- `/components`
  Reusable UI only. No business rules.
- `/modules/<domain>`
  Domain logic lives here. Symmetrical "golden module" structure.
- `/lib`
  Infrastructure/adapters/clients (Supabase, HTTP clients, helpers with clear ownership).
- `/config` + `/constants`
  Single source of truth (roles/permissions/statuses/feature flags).
- `/types`
  Shared types/contracts.
- `/tests`
  Mirrors domain ownership whenever possible.
- `/docs`
  Human docs (architecture, runbooks, reference).
- `/agents`
  AI tool instruction files (CLAUDE/CODEX/GPT/etc.).

> If the repo differs, follow `README.md` and `docs/README.md` as the source of truth.

---

## Golden module rule (domain symmetry)
Every domain module should look predictable.

**Target pattern (TS/JS example):**
- `modules/<domain>/<domain>.service.ts` (business rules)
- `modules/<domain>/<domain>.repository.ts` (data access only)
- `modules/<domain>/<domain>.types.ts`
- `modules/<domain>/<domain>.validation.ts`
- `modules/<domain>/<domain>.permissions.ts`
- `modules/<domain>/<domain>.constants.ts`
- `modules/<domain>/<domain>.hooks.ts` (optional)
- `modules/<domain>/index.ts`

**Boundary rule:**
- UI calls domain services.
- Services call repositories.
- Repositories call DB/clients.
- UI never calls DB directly.

---

## Operating rules (do / don't)

### Do
- Start with a **plan** and a small first step.
- Make changes in **small batches**.
- Run the repo's **existing** verification commands after each batch:
  - lint
  - typecheck
  - tests
  - build
- Update docs when behavior/config/dev workflow changes:
  - `README.md`, `docs/README.md`, relevant docs under `docs/`
- Leave a clean trail:
  - clear commit messages (if committing)
  - explicit file paths in your notes

### Don't
- Don't guess commands. Discover them from repo truth (`package.json`, `pyproject.toml`, etc.).
- Don't create "junk drawer" folders (`misc`, `old`, `temp`, `utils` without categories).
- Don't rename routes, endpoints, DB tables, env vars unless explicitly approved.
- Don't delete anything unless you can prove it's dead and the user approves.

---

## How to find the right command (truth-first)
1) Look in `package.json` scripts (JS/TS) or `pyproject.toml`/Makefile (Python/other).
2) Use existing repo tooling.
3) If commands are missing or broken, document the gap and propose a fix instead of inventing one.

---

## Danger zones (read before touching)
- Routing conventions (Next.js route folders, special files)
- Auth/session handling
- DB migrations/schema
- Server/client boundaries
- Offline sync / background jobs
- Any "source of truth" scheduler/planning logic

If your task touches any danger zone:
- plan first
- change one thing at a time
- validate immediately

---

## Definition of done (pass/fail)
You are done only when:
- The change matches the request.
- The repo still builds (if it built before).
- Tests/typecheck still pass (if they existed before).
- Docs are updated if developer workflow or configuration changed.
- Nothing important was renamed "because it felt cleaner."

---

## If you're unsure
- Ask **one** targeted question OR
- Mark as `TODO (needs confirmation)` and proceed with safe, non-breaking work.

---

End of AGENTS.md
