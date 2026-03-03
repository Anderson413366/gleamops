-- ============================================================================
-- Archive ghost staff records (STF-1048 through STF-1059)
-- These 12 records have no real data — created without proper names,
-- showing as "[Name Required - STF-XXXX]" in the directory.
-- Soft-delete them to clean up the Workforce module.
-- ============================================================================
SET search_path TO 'public';

UPDATE staff
SET archived_at = NOW(), archive_reason = 'Ghost record — no real employee data'
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND full_name LIKE '[Name Required%'
  AND archived_at IS NULL;
