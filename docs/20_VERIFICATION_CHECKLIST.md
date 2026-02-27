# Verification Checklist (Current Release Baseline)

Version: v2026-02-26  
Scope: Monday replacement rollout + production readiness snapshot

## 1) Build and static quality gates

- [x] `pnpm lint` passed
- [x] `pnpm typecheck` passed
- [x] `pnpm build` passed
- [ ] Full automated test suite is green in CI for all apps/packages (environment-bound tests still require configured Supabase env)

## 2) Database and migration gates

- [x] Monday replacement migration files `00089` through `00099` exist in `supabase/migrations/`
- [x] Additional shifts/time migration files `00100` through `00109` are sequenced with no duplicate versions
- [x] Linked Supabase project is in parity through migration `00109`
- [x] New tenant tables in this rollout include standard columns + RLS (`tenant_id = current_tenant_id()` policy pattern)
- [x] Hardening migration applied for field report insert impersonation guard (`00099`)

## 3) Web production gates

- [x] Latest production deployment is live on `https://gleamops.vercel.app`
- [x] Production smoke checks completed for public pages + core APIs with 0 failures / 0 5xx
- [x] Public customer portal middleware allowlist fixed and verified in production
- [x] Protected APIs redirect unauthenticated sessions to `/login` as expected

## 4) Monday replacement feature gates (Phase 1-8)

- [x] Phase 1: Route templates + route generation + mobile route flow
- [x] Phase 2: Load sheet view + API + mobile checklist integration
- [x] Phase 3: Night bridge shift handoff + review APIs + operations UI
- [x] Phase 4: Complaint intake + issue hub + resolution workflow
- [x] Phase 5: Periodic task scheduler + generation integration
- [x] Phase 6: Field quick forms + specialist mobile workflow
- [x] Phase 7: Customer portal tables/pages/APIs
- [x] Phase 8: Owner dashboard + supply cost + microfiber tracking
- [x] PT-BR full i18n backfill completed (EN/ES/PT-BR parity)

## 5) Mobile release gates

- [x] Expo/EAS project initialized and linked (`@anderson860/gleamops-mobile`)
- [x] Android production build requested (`6e45a8e0-4161-4304-a4a3-a136f22837eb`)
- [ ] iOS production build is blocked pending Apple Developer account setup/acceptance
- [ ] App Store submission pending iOS credential setup

## 6) Go / No-Go

- [x] GO for next backend/web phase work
- [ ] GO for iOS store release (blocked by Apple account prerequisites)
