-- =============================================================================
-- Task 3: Verify supply_catalog and task_categories vs Sprint 1-14
-- =============================================================================
-- VERIFICATION FINDINGS:
--
-- 1. supply_catalog (64 rows, 22 frontend files referencing it):
--    - NO Sprint 1-14 migration touches this table. No conflicts.
--    - Properly linked: site_supplies.supply_id references supply_catalog — all 754 rows.
--    - Heavily used in inventory module (supplies, kits, counts, orders, assignments).
--    - VERDICT: Clean. No action needed.
--
-- 2. task_categories (18 rows, queried via get-task-categories.ts):
--    *** CONFLICT FOUND ***
--    - Migration 00119_s3_staff_columns.sql (line 121) drops task_category_id from tasks:
--        ALTER TABLE tasks DROP COLUMN IF EXISTS task_category_id;
--    - This severs the FK link: tasks.task_category_id → task_categories(id)
--    - The task_categories table itself is intact (18 rows) but orphaned.
--    - Frontend helper get-task-categories.ts still queries the table.
--    - The column was only referenced in auto-gen supabase.ts and field-parity-index.ts
--      (no .tsx components query task_category_id directly).
--
--    IMPACT: Low runtime impact (no UI fetches task_category_id), but the FK
--    relationship is lost. The 18 task_categories rows become orphaned reference
--    data with no inbound FK from tasks.
--
-- ACTION: Re-add the task_category_id column to tasks to restore the FK link.
-- This runs AFTER 00119 drops it, restoring the relationship.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- Restore the FK column that Sprint 3 dropped
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_category_id UUID REFERENCES task_categories(id);

-- Rebuild the index for task category lookups
CREATE INDEX IF NOT EXISTS idx_tasks_task_category_id
  ON tasks (task_category_id)
  WHERE task_category_id IS NOT NULL AND archived_at IS NULL;

COMMIT;
