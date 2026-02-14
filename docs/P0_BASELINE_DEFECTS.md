# P0: Baseline Defect Documentation

Captured at the conclusion of Milestones A–H. These are known issues documented for tracking — no fixes are applied in P0.

---

## Section 1: Route Duplication

**Severity:** Medium | **Deferred to:** P1-ROUTE-CLEANUP

Six orphaned or duplicate route directories exist under `apps/web/src/app/(dashboard)/`:

| Orphaned Directory | Canonical Location | Estimated Duplicate Files |
|-------------------|--------------------|--------------------------|
| `customers/` | `crm/clients/` | ~5 |
| `people/` | `workforce/staff/` | ~4 |
| `team/` | `workforce/staff/` | ~3 |
| `schedule/` | `operations/jobs/` | ~5 |
| `services/` | `admin/services/` | ~4 |
| `reports/` | *(no canonical — orphaned)* | ~4 |

**Total:** ~25 duplicate/orphaned files across 6 directories

### Impact

- Build includes unused routes (increases bundle size)
- Developer confusion about which directory to edit
- No runtime user impact (orphaned routes are not linked in navigation)

### Resolution Plan (P1)

1. Verify no navigation links point to orphaned routes
2. Remove orphaned directories
3. Add lint rule to prevent route directory duplication

---

## Section 2: Type Safety

**Severity:** Low | **Status:** Acceptable baseline, track for P1

| Metric | Count | Notes |
|--------|-------|-------|
| `as unknown as` casts | 606 | Mostly Supabase query results → typed interfaces |
| `any` usages | 42 | Mixed — some intentional (Zod workarounds), some legacy |

### Analysis

The majority of `as unknown as` casts are at the Supabase query boundary where the SDK returns generic types that need to be narrowed to application interfaces. This is a known pattern and acceptable until Supabase provides better generic support.

The 42 `any` usages include:
- ~15 in Zod schema workarounds (`AnyZodSchema` pattern)
- ~10 in form/hook generics where TypeScript cannot infer
- ~17 that should be typed (tracked for P1)

### Target (P1)

- Reduce `any` to ≤20 (eliminate unnecessary usages)
- `as unknown as` — no target (structural limitation of Supabase SDK)

---

## Section 3: Schema Gaps

**Severity:** Medium | **Status:** Documented for incremental resolution

### Types Without UI (21)

These TypeScript interfaces exist in `packages/shared/src/types/database.ts` but have no corresponding UI page:

| Type | Domain | Notes |
|------|--------|-------|
| `Tenant` | System | Admin-only, no UI planned |
| `TenantMembership` | System | Admin-only |
| `StatusTransition` | System | Admin config — future admin panel |
| `SystemSequence` | System | Internal auto-increment — no UI needed |
| `AuditEvent` | System | Future audit log viewer |
| `Notification` | System | Future notification center |
| `FileRecord` | System | Future file manager |
| `TimelineEvent` | CRM | Future timeline widget |
| `TaskProductionRate` | Service DNA | Embedded in task detail |
| `ServiceTask` | Service DNA | Embedded in service detail |
| `RecurrenceRule` | Operations | Embedded in job detail |
| `TicketChecklist` | Operations | Embedded in ticket detail |
| `TicketChecklistItem` | Operations | Embedded in ticket detail |
| `TicketPhoto` | Operations | Embedded in ticket detail |
| `Alert` | Timekeeping | Future alert dashboard |
| `TimesheetApproval` | Timekeeping | Embedded in timesheet detail |
| `SiteSupply` | Inventory | Embedded in site detail |
| `SiteAssetRequirement` | Inventory | Embedded in site detail |
| `TicketAssetCheckout` | Operations | Embedded in ticket detail |
| `SupplyKitItem` | Inventory | Embedded in supply kit detail |
| `InventoryCountDetail` | Inventory | Embedded in count detail |

### Types Without Zod Schemas (59)

Many database types do not have corresponding Zod validation schemas. This is expected for:
- System tables (no user input)
- Join/junction tables (created by application logic, not forms)
- Computed/result tables (populated by business logic)

Types that SHOULD get schemas (priority for P1):
- `TimeEntry` — manual time entry form
- `TimeException` — exception request form
- `Timesheet` — approval workflow
- `Inspection` — inspection form
- `InspectionItem` — inspection checklist
- `WorkTicket` — ticket creation form
- `TicketAssignment` — assignment form
- `ChecklistTemplate` — template builder
- `GeofenceConfig` — geofence setup form

---

## Section 4: Baseline Metrics Snapshot

Captured at P0 freeze (post-Milestone H):

| Metric | Value |
|--------|-------|
| **Routes** | 33 page routes |
| **Forms** | 21 form components |
| **Migrations** | 49 SQL files (7,015 lines) |
| **TypeScript Interfaces** | 97 (database.ts + app.ts) |
| **Zod Schemas** | 38 validation schemas |
| **UI Components** | 16 design system components |
| **Custom Hooks** | 11 hooks |
| **Tables** | 103 database tables |
| **Test Files** | 1 (SendGrid webhook verify) |
| **`as unknown as` Casts** | 606 |
| **`any` Usages** | 42 |
| **Orphaned Routes** | 6 directories (~25 files) |
| **Feature Flags** | 6 domains (all disabled) |
| **Protected Tables** | 84 (hard delete blocked) |
| **Entity Code Patterns** | 19 validated patterns |
