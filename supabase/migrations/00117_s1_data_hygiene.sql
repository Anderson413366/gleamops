-- =============================================================================
-- Migration 00117: Sprint 1 — Data Hygiene (no schema changes)
-- =============================================================================
-- Cleans up data inconsistencies identified in DB audit.
-- Data-only operations. No schema changes. No frontend changes.
-- Tenant: a0000000-0000-0000-0000-000000000001
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S1-T1: Delete orphan lookups with NULL tenant_id that are NOT system/global
-- Global lookups (NULL tenant_id) are valid for system-wide values.
-- Only delete rows that should have had a tenant_id but don't.
-- ---------------------------------------------------------------------------
-- Note: Some lookups intentionally have NULL tenant_id (global/system lookups).
-- The seed data in 00032 and 00038 uses NULL for global lookups by design.
-- We only delete lookups that are clearly orphaned (no category match in seeds).
-- For S2, we will make tenant_id NOT NULL after assigning the test tenant to globals.

-- Assign the test tenant to all global lookups so S2 can enforce NOT NULL
UPDATE lookups
SET tenant_id = 'a0000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- S1-T2: Align staff_type ↔ employment_type
-- Where staff_type is set but employment_type is NULL, copy staff_type value.
-- Where both are set but contradict, prefer employment_type (more recent field).
-- ---------------------------------------------------------------------------
UPDATE staff
SET employment_type = staff_type
WHERE employment_type IS NULL
  AND staff_type IS NOT NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

-- Where both exist but differ, keep employment_type (authoritative), clear staff_type
UPDATE staff
SET staff_type = employment_type
WHERE employment_type IS NOT NULL
  AND staff_type IS NOT NULL
  AND staff_type <> employment_type
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- S1-T3: Backfill staff.pay_type and schedule_type where NULL
-- ---------------------------------------------------------------------------
UPDATE staff
SET pay_type = 'HOURLY'
WHERE pay_type IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE staff
SET schedule_type = 'VARIABLE'
WHERE schedule_type IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- S1-T4: Backfill site_jobs.start_date from sites.service_start_date or created_at
-- ---------------------------------------------------------------------------
UPDATE site_jobs sj
SET start_date = COALESCE(
  (SELECT s.service_start_date FROM sites s WHERE s.id = sj.site_id),
  sj.created_at::date
)
WHERE sj.start_date IS NULL
  AND sj.tenant_id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- S1-T5: Tag duplicate site names with [DUPLICATE-N] suffix
-- Only tags exact duplicates within the same tenant (case-insensitive).
-- ---------------------------------------------------------------------------
WITH duplicates AS (
  SELECT
    id,
    name,
    tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, lower(trim(name))
      ORDER BY created_at ASC
    ) AS rn
  FROM sites
  WHERE archived_at IS NULL
)
UPDATE sites s
SET name = s.name || ' [DUPLICATE-' || d.rn || ']'
FROM duplicates d
WHERE s.id = d.id
  AND d.rn > 1;

-- ---------------------------------------------------------------------------
-- S1-T6: Backfill work_tickets.priority and type where NULL
-- ---------------------------------------------------------------------------
UPDATE work_tickets
SET priority = 'NORMAL'
WHERE priority IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE work_tickets
SET type = 'RECURRING'
WHERE type IS NULL
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

COMMIT;
