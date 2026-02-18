# State Report — v3.1 Routing Stabilization

Owner: Claude (AGENT 0)
Date: 2026-02-18
Branch: `fix/v3-1-routing-stabilization`

---

## Preflight Outputs

### Git state
```
Branch: fix/v3-1-routing-stabilization
HEAD: b7eb4b8 Merge pull request #4 from Anderson413366/fix/vercel-prerender-and-redirect-loops
```

### Recent commits
```
b7eb4b8 Merge pull request #4 from Anderson413366/fix/vercel-prerender-and-redirect-loops
0249e83 fix: resolve Vercel prerender failures and redirect loop conflicts
20d762f Merge pull request #3 from Anderson413366/fix/v3-navigation-routing
3f8b7fd fix: resolve v3 navigation & routing breakage from masterplan rename
2d14c68 fix: complete masterplan v3.1 audit gaps — missing API routes, types, permissions, mobile routes
ca605e2 Add canonical schedule/planning sub-route branches
d336cde Implement GleamOps v3.1 rollout and fix DB lint baseline
```

### Typecheck
```
pnpm typecheck
Tasks: 7 successful, 7 total
Cached: 7 cached, 7 total
Result: PASS
```

### Build
```
pnpm build:web
Result: PASS
All pages dynamic (force-dynamic via layout)
No prerender errors
```

### Test
```
No unit test failures. E2E not run locally (requires Playwright + running server).
```

---

## Prior fixes (already merged to main)

### PR #3 — fix/v3-navigation-routing
- Narrowed legacy-redirect-map.ts to exact-match only (Phase C)
- Fixed /schedule defaultTab to "calendar" (Phase D)
- Updated header shortcuts/command palette to canonical routes (Phase E)
- Created API proxy routes for schedule (Phase H partial)
- Created planning items/proposals endpoints (Phase H partial)
- Updated E2E test redirect assertions to v3 direction (Phase I partial)

### PR #4 — fix/vercel-prerender-and-redirect-loops
- Removed conflicting v2-direction redirects from next.config.ts
- Added `export const dynamic = 'force-dynamic'` to dashboard + auth layouts
- Fixed stale redirect targets (/team → /people, /subcontractors → /supplies, login → /command)

---

## Known gaps (this branch will fix)

1. **Route-parity matrix** not written
2. **Breadcrumbs** still show legacy labels on canonical routes (e.g., "Home" as root instead of "Command Center")
3. **Canonical deep-route bridges** missing — `/customers/clients`, `/people/staff` (list), `/supplies/orders`, etc. do not exist
4. **E2E tests** lack deep-route non-redirect assertions and canonical bridge assertions
5. **Requirements-evidence matrix** not written
