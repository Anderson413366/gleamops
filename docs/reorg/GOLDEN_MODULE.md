# Golden Module Definition

**Date:** 2026-02-18

---

## Golden Module Template (TypeScript)

Every domain module under `apps/web/src/modules/<domain>/` follows this **identical** internal structure:

```
modules/<domain>/
  <domain>.service.ts          # Business logic (workflows, calculations, rules)
  <domain>.repository.ts       # All Supabase queries for this domain
  <domain>.types.ts            # Route-local types (OPTIONAL — only if beyond @gleamops/shared)
  <domain>.permissions.ts      # Domain permission checks (OPTIONAL — only if domain has inline checks)
  <domain>.validation.ts       # Route-specific Zod schemas (OPTIONAL — only if beyond @gleamops/shared)
  index.ts                     # Re-exports (named exports only, no mega-barrel)
```

---

## File Responsibilities

### `<domain>.service.ts` — Business Logic
- Workflow state transitions
- Calculations (dates, rates, quotas)
- Orchestration (multi-step operations)
- Rate limiting logic
- Event normalization

**Rules:**
- Receives typed inputs (not raw Request objects)
- Returns typed results (not NextResponse objects)
- Calls repository for data access (never Supabase directly)
- Pure functions where possible (easier to test)
- May call `@gleamops/domain` for shared business rules

**Example signature:**
```typescript
export async function processApproval(
  auth: AuthContext,
  body: ApprovalInput,
): Promise<Result<ApprovalOutput, ProblemDetails>> {
  // ...
}
```

### `<domain>.repository.ts` — Data Access
- All Supabase queries for this domain
- Inserts, updates, selects, RPC calls
- Audit logging calls

**Rules:**
- Only file that imports `getServiceClient()` or `createClient()`
- Returns typed data (not raw Supabase responses)
- No business logic
- No HTTP concerns

**Example signature:**
```typescript
export async function getApprovalWorkflow(
  tenantId: string,
  workflowId: string,
): Promise<ApprovalWorkflow | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('approval_workflows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', workflowId)
    .single();
  return data;
}
```

### `<domain>.types.ts` — Local Types (OPTIONAL)
- Types specific to this module's API contract
- Only create if types don't exist in `@gleamops/shared`
- Prefer adding to `@gleamops/shared` if the type is reusable

### `<domain>.permissions.ts` — Permission Checks (OPTIONAL)
- Domain-specific role/permission guards
- Extracted from inline `hasRole()` / `canManage()` checks in routes

**Example:**
```typescript
import { hasAnyRole } from '@/lib/api/role-guard';

const APPROVAL_ROLES = ['OWNER_ADMIN', 'MANAGER'] as const;

export function hasApprovalRole(roles: string[], requiredRole: string): boolean {
  return hasAnyRole(roles, APPROVAL_ROLES) || roles.includes(requiredRole);
}
```

### `index.ts` — Re-exports
- Named exports only
- No wildcard re-exports (`export * from`)
- Clean barrel that documents the module's public API

**Example:**
```typescript
export { processApproval, submitApproval, rejectApproval } from './inventory.service';
export { getApprovalWorkflow, updateApprovalStep } from './inventory.repository';
export { hasApprovalRole } from './inventory.permissions';
```

---

## Golden Rules

1. **Domain logic lives in `*.service.ts`.**
   Route handlers delegate to services. Services orchestrate.

2. **Data access lives in `*.repository.ts` only.**
   No `supabase.from()` anywhere else in the module.

3. **Routes become thin.**
   Target: <50 LOC per route handler.
   Pattern: `extractAuth -> validateBody -> service.method() -> respond`

4. **UI must not call modules directly.**
   Modules are server-side only. UI calls routes (HTTP), routes call modules.

5. **Modules import from `lib/` and `@gleamops/*` only.**
   No reverse dependencies (routes don't export to modules).

6. **Permissions are centralized per domain.**
   No inline role checks in routes — delegate to `*.permissions.ts`.

7. **Every module looks identical inside.**
   No custom layouts. No creative directory structures. Symmetry.

---

## Route Handler After Pattern

```typescript
// api/inventory/approvals/route.ts — AFTER (~40 LOC)
import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody, isValidationError } from '@/lib/api/validate-request';
import { approvalSchema } from '@gleamops/shared';
import { processApproval } from '@/modules/inventory';

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, '/api/inventory/approvals');
  if (isAuthError(auth)) return auth;

  const body = validateBody(request, approvalSchema);
  if (isValidationError(body)) return body;

  const result = await processApproval(auth, body);
  if (result.error) {
    return NextResponse.json(result.error, { status: result.error.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
```

---

## Planned Modules

| Module | Service Functions | Repository Functions | Permissions |
|--------|------------------|---------------------|-------------|
| `inventory` | processApproval, submitForApproval, rejectApproval | getWorkflow, updateStep, loadEntity, writeAudit | hasApprovalRole |
| `webhooks` | processEvent, normalizeStatus, handleBounce | upsertEvent, stopFollowUps | — |
| `counts` | submitCount, calculateNextDue, determineAlertStatus | saveCount, updateSiteDueDates | — |
| `fleet` | processChecklist, calculateDvirStatus | saveChecklist, updateVehicleState | — |
| `proposals` | sendProposal, checkRateLimit, wireFollowUp | insertSendRecord, insertFollowUpSequence | — |
| `schedule` | publishPeriod, processTradeApproval | getSchedulePeriod, updateTradeStatus | canManageSchedule, canPublishSchedule |
| `messages` | createThread | insertThread, insertMembers, insertMessage | — |
| `timekeeping` | verifyPinCheckIn | verifyPin, insertTimeEvent | — |
