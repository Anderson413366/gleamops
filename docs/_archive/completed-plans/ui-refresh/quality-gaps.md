# Quality Gaps

Gaps identified while configuring Claude Code quality-gate hooks.

## Missing: Prettier (formatter)

**Status:** Not installed, no config file, no `format` script in any `package.json`.

**Impact:** No automated code formatting. Inconsistent whitespace, quote styles, and trailing commas may accumulate across contributors.

**To fix:**

```bash
pnpm add -Dw prettier prettier-plugin-tailwindcss
```

Create `.prettierrc` at the repo root:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Add scripts to root `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Then update `.claude/hooks/quality-gates.sh` to add a formatting step before lint.

## Pre-existing Issue: `next lint` Deprecation

**Status:** `pnpm lint` currently fails.

**Root cause:** `next lint` is deprecated in Next.js 15+. Additionally, a user-level `eslint.config.mjs` at `~/eslint.config.mjs` references `@eslint/eslintrc` which is not installed, causing an import error.

**Error:**
```
Cannot find package '@eslint/eslintrc' imported from /Users/andersongomes/eslint.config.mjs
```

**Impact:** The quality-gate hook catches this failure on the first stop attempt. The `stop_hook_active` guard allows Claude to finish on the retry so it won't block indefinitely.

**To fix:**
1. Migrate from `next lint` to standalone ESLint with a flat config (`eslint.config.mjs` in repo root)
2. Install `@eslint/eslintrc` if the user-level config is needed, or remove `~/eslint.config.mjs`
3. Update `apps/web/package.json` lint script from `next lint` to `eslint .`

## Present: Lint

- Root: `pnpm lint` → `turbo lint`
- `apps/web`: `next lint` (ESLint via Next.js) — **currently broken, see above**
- Other packages: stub (`echo 'lint passed'`) — only the web app has real linting

**Potential improvement:** Add ESLint configs to `packages/*` for library-level linting.

## Present: Typecheck

- Root: `pnpm typecheck` → `turbo typecheck`
- All 7 packages run `tsc --noEmit` — full coverage, no gaps
