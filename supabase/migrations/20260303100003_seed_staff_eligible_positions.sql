-- ============================================================================
-- Seed staff_eligible_positions
-- All 37 active staff members have role=CLEANER but are not mapped to any
-- positions, making the Roles & Positions staff counts all show 0.
-- Map each active cleaner to general cleaning positions.
-- ============================================================================
SET search_path TO 'public';

-- Map all active staff to "All Positions" (POS-014) as a baseline
INSERT INTO staff_eligible_positions (tenant_id, staff_id, position_code, archived_at)
SELECT
  s.tenant_id,
  s.id,
  'POS-014',
  NULL
FROM staff s
WHERE s.tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND s.status = 'ACTIVE'
  AND s.archived_at IS NULL
ON CONFLICT DO NOTHING;

-- Map all active staff to "Full Cleaning Specialist" (POS-015)
INSERT INTO staff_eligible_positions (tenant_id, staff_id, position_code, archived_at)
SELECT
  s.tenant_id,
  s.id,
  'POS-015',
  NULL
FROM staff s
WHERE s.tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND s.status = 'ACTIVE'
  AND s.archived_at IS NULL
ON CONFLICT DO NOTHING;
