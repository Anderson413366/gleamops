# P0: Schema Contract Freeze

This document defines the naming conventions and structural patterns for all GleamOps database tables. These conventions are **frozen** as of P0 — any deviation requires an ADR entry.

## Standard Columns

Every business table MUST include these columns (the `StandardColumns` pattern):

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | `UUID` | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | — | Multi-tenant isolation (FK → `tenants.id`) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Last modification (auto-updated by trigger) |
| `archived_at` | `TIMESTAMPTZ` | `NULL` | Soft delete timestamp (NULL = active) |
| `archived_by` | `UUID` | `NULL` | Who archived the record |
| `archive_reason` | `TEXT` | `NULL` | Why it was archived |
| `version_etag` | `UUID` | `gen_random_uuid()` | Optimistic locking token |

### Trigger Conventions

- `set_updated_at` — Auto-updates `updated_at` on every UPDATE
- `no_hard_delete` — Blocks DELETE operations (see `P0_NO_DELETE_CHECKLIST.md`)

## Entity Code Patterns

Human-readable codes follow the format `PREFIX-DIGITS`:

| Entity | Prefix | Pattern | Example | Regex |
|--------|--------|---------|---------|-------|
| Client | `CLI` | `CLI-XXXX` | `CLI-0001` | `^CLI-\d{4,}$` |
| Site | `SIT` | `SIT-XXXX` | `SIT-0042` | `^SIT-\d{4,}$` |
| Contact | `CON` | `CON-XXXX` | `CON-0015` | `^CON-\d{4,}$` |
| Task | `TSK` | `TSK-XXX` | `TSK-001` | `^TSK-\d{3,}$` |
| Service | `SER` | `SER-XXXX` | `SER-0003` | `^SER-\d{4,}$` |
| Prospect | `PRO` | `PRO-XXXX` | `PRO-0001` | `^PRO-\d{4,}$` |
| Opportunity | `OPP` | `OPP-XXXX` | `OPP-0001` | `^OPP-\d{4,}$` |
| Bid | `BID` | `BID-XXXXXX` | `BID-000001` | `^BID-\d{6}$` |
| Proposal | `PRP` | `PRP-XXXX` | `PRP-0001` | `^PRP-\d{4,}$` |
| Job | `JOB` | `JOB-XXXX` | `JOB-0001` | `^JOB-\d{4,}$` |
| Ticket | `TKT` | `TKT-XXXX` | `TKT-0001` | `^TKT-\d{4,}$` |
| Staff | `STF` | `STF-XXXX` | `STF-1001` | `^STF-\d{4,}$` |
| File | `FIL` | `FIL-XXXX` | `FIL-0001` | `^FIL-\d{4,}$` |
| Equipment | `EQP` | `EQP-XXXX` | `EQP-0001` | `^EQP-\d{4,}$` |
| Subcontractor | `SUB` | `SUB-XXXX` | `SUB-0001` | `^SUB-\d{4,}$` |
| Position | `POS` | `POS-XXXX` | `POS-0001` | `^POS-\d{4,}$` |
| Vehicle | `VEH` | `VEH-XXXX` | `VEH-0001` | `^VEH-\d{4,}$` |
| Supply Order | `ORD` | `ORD-XXXX` | `ORD-0001` | `^ORD-\d{4,}$` |
| Inventory Count | `CNT` | `CNT-XXXX` | `CNT-0001` | `^CNT-\d{4,}$` |

### Code Generation

Codes are generated via the `system_sequences` table:
```sql
SELECT next_val FROM system_sequences WHERE entity_type = 'client' FOR UPDATE;
-- Format: PREFIX-{padded next_val}
```

### Validation

Entity code patterns are enforced at two levels:
1. **Zod schemas** (`packages/shared/src/validation/index.ts`) — form/API input validation
2. **Utility function** (`packages/shared/src/constants/entity-codes.ts`) — `validateEntityCode(type, code)`

## Foreign Key Conventions

| Pattern | Usage | Example |
|---------|-------|---------|
| `{entity}_id` | UUID FK to entity's `id` | `client_id`, `site_id`, `staff_id` |
| `{role}_id` | UUID FK to user/staff by role | `owner_user_id`, `supervisor_id` |
| `{entity}_code` | Human-readable code (denormalized) | `bid_code`, `job_code` |

### Rules

- **UUID FKs** are the canonical relationship — use `{entity}_id`
- **Code FKs** (`_code`) are for display convenience and MUST be kept in sync with the UUID FK
- FK constraints use `ON DELETE RESTRICT` (hard deletes are blocked anyway)
- All FKs include a btree index on the FK column

## Status Conventions

| Aspect | Convention |
|--------|-----------|
| Column type | `TEXT` |
| Naming | `status` or `{qualifier}_status` (e.g., `staff_status`, `prospect_status_code`) |
| Value format | `UPPER_SNAKE_CASE` (e.g., `ACTIVE`, `IN_PROGRESS`, `PENDING_APPROVAL`) |
| Governance | Controlled by `status_transitions` table |
| Default | Set via `DEFAULT` in migration or application layer |

### Common Status Values

| Status | Meaning |
|--------|---------|
| `DRAFT` | Created but not finalized |
| `ACTIVE` | Live and operational |
| `INACTIVE` | Disabled but not archived |
| `PENDING` | Awaiting action |
| `IN_PROGRESS` | Work underway |
| `COMPLETED` | Work finished |
| `APPROVED` | Reviewed and approved |
| `REJECTED` | Reviewed and denied |
| `CANCELLED` | Intentionally stopped |

## Timestamp Conventions

| Pattern | Type | Example |
|---------|------|---------|
| `{event}_at` | `TIMESTAMPTZ` | `created_at`, `archived_at`, `completed_at`, `sent_at` |
| `{event}_date` | `DATE` | `hire_date`, `expiry_date`, `service_date` |

### Rules

- Always use `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- Use `DATE` only for calendar dates without time significance
- Store all times in UTC; convert to local time in the UI layer
- Name the column `{past_tense_verb}_at` (e.g., `signed_at`, not `sign_time`)

## JSONB Conventions

| Pattern | Example | Usage |
|---------|---------|-------|
| `{purpose}_data` | `workload_data`, `pricing_data` | Structured computed results |
| `metadata` | `metadata` | Extensible key-value pairs |
| `address` | `billing_address`, `address` | Structured address objects |

### Rules

- Use JSONB for semi-structured data that varies between records
- Define the expected shape in TypeScript interfaces (not just `Record<string, unknown>`)
- Include a JSON schema comment in the migration for complex JSONB columns
- Never store data in JSONB that needs to be queried frequently — use columns instead

## Soft Delete Pattern

```sql
-- Archive
UPDATE entity SET
  archived_at = NOW(),
  archived_by = auth.uid(),
  archive_reason = 'Reason text'
WHERE id = '<uuid>';

-- Default queries exclude archived
SELECT * FROM entity WHERE archived_at IS NULL;

-- Restore
UPDATE entity SET
  archived_at = NULL,
  archived_by = NULL,
  archive_reason = NULL
WHERE id = '<uuid>';
```

See `P0_NO_DELETE_CHECKLIST.md` for full details.

## Optimistic Locking Pattern

Every update MUST check and rotate the `version_etag`:

```sql
UPDATE entity SET
  field = 'new_value',
  version_etag = gen_random_uuid()
WHERE id = '<uuid>'
  AND version_etag = '<expected_etag>';
-- If 0 rows affected → conflict (another user modified the record)
```

In the application layer:
```typescript
const { count } = await supabase
  .from('entity')
  .update({ field: 'new_value', version_etag: crypto.randomUUID() })
  .eq('id', entityId)
  .eq('version_etag', currentEtag);

if (count === 0) {
  throw new Error('Record was modified by another user. Please refresh and try again.');
}
```

## Table Naming Conventions

| Pattern | Example |
|---------|---------|
| Singular noun | `client` (not `clients`) — *Note: current tables use plural; this is grandfathered* |
| Snake_case | `supply_catalog`, `ticket_assignments` |
| Junction tables | `{parent}_{child}` (e.g., `service_tasks`, `supply_kit_items`) |
| Event/log tables | `{entity}_events` or `{entity}_log` (e.g., `time_events`, `key_event_log`) |

**Note:** Existing tables use plural names (e.g., `clients`, `sites`). This is grandfathered and will not be changed. New tables SHOULD use plural to stay consistent with the existing convention.

## Index Naming Conventions

```
idx_{table}_{column(s)}          -- btree index
idx_{table}_{column}_gin         -- GIN index (JSONB/tsvector)
idx_{table}_{column}_unique      -- unique index
```
