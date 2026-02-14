# P0: Feature Flag Guide

## How Flags Work

GleamOps uses **environment-variable-based feature flags**. Each flag maps to a domain of functionality.

### Architecture

```
.env / Vercel env vars
  ↓
getFeatureFlags()           ← reads env, caches result
  ↓
isFeatureEnabled(domain)    ← single flag check
  ↓
useFeatureFlag(domain)      ← React hook (web)
```

- **Read-once, cached**: Flags are read from `process.env` on first call and cached in memory. Restart the process to pick up changes.
- **Default: disabled**: All flags default to `false` if the env var is missing or set to anything other than `enabled`, `true`, or `1`.
- **No runtime toggle**: Flags cannot be changed at runtime. This keeps the system simple and deterministic.

### Domains

| Domain | Env Var (Web/Mobile) | Env Var (Worker) | Purpose |
|--------|---------------------|------------------|---------|
| `schema_parity` | `NEXT_PUBLIC_FF_SCHEMA_PARITY` | — | Remaining schema alignment work |
| `bid_specialization` | `NEXT_PUBLIC_FF_BID_SPECIALIZATION` | `FF_BID_SPECIALIZATION` | Bid engine specialization features |
| `proposal_studio_v2` | `NEXT_PUBLIC_FF_PROPOSAL_STUDIO_V2` | `FF_PROPOSAL_STUDIO_V2` | Proposal Studio v2 redesign |
| `ops_geofence_auto` | `NEXT_PUBLIC_FF_OPS_GEOFENCE_AUTO` | — | Auto geofence clock-in/out |
| `messaging_v1` | `NEXT_PUBLIC_FF_MESSAGING_V1` | — | In-app messaging system |
| `mobile_inspections` | `NEXT_PUBLIC_FF_MOBILE_INSPECTIONS` | — | Mobile inspection workflows |

## Usage

### In React Components (Web)

```tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function MyComponent() {
  const messagingEnabled = useFeatureFlag('messaging_v1');

  if (!messagingEnabled) return null;
  return <MessagingPanel />;
}
```

### In Server/Worker Code

```typescript
import { isFeatureEnabled } from '@gleamops/shared';

if (isFeatureEnabled('bid_specialization')) {
  // run specialized bid logic
}
```

### Getting All Flags

```tsx
import { useFeatureFlags } from '@/hooks/use-feature-flag';

function DebugPanel() {
  const flags = useFeatureFlags();
  return <pre>{JSON.stringify(flags, null, 2)}</pre>;
}
```

## When to Use Flags vs Branches

| Scenario | Use |
|----------|-----|
| New feature that touches existing code paths | **Feature flag** |
| Isolated new page/route with no existing code changes | **Branch** (merge when ready) |
| Gradual rollout to staging → canary → production | **Feature flag** |
| One-time migration or refactor | **Branch** |
| A/B testing or gradual enablement | **Feature flag** |

## How to Enable Per Environment

### Local Development

Edit `.env.local`:
```
NEXT_PUBLIC_FF_MESSAGING_V1=enabled
```

### Vercel (Staging/Production)

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add the variable with value `enabled`
3. Select the target environment (Preview, Production, or both)
4. Redeploy

### Worker

Edit the worker's `.env` file or set the environment variable in the deployment platform:
```
FF_BID_SPECIALIZATION=enabled
```

## Rollout Lifecycle

```
disabled → staging → canary → production → remove flag
```

1. **Disabled** (default) — Code merged behind flag, not active anywhere
2. **Staging** — Enable on preview/staging deployments for QA
3. **Canary** — Enable on production with limited scope (e.g., specific tenants via additional logic)
4. **Production** — Enable for all users
5. **Remove flag** — Once stable, remove the flag check and the env var. The code becomes permanent.

### When to Remove a Flag

- The feature has been enabled in production for **2+ weeks** with no rollback
- No open bugs related to the feature
- Remove: env var, `isFeatureEnabled()` check, `useFeatureFlag()` call, and the domain from the type union
