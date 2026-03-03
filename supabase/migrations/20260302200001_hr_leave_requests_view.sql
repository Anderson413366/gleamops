-- ============================================================================
-- hr_leave_requests VIEW
-- Frontend queries this table for leave KPIs but actual leave data is stored
-- in staff_availability_rules with rule_type = 'ONE_OFF'.
-- ============================================================================
SET search_path TO 'public';

CREATE OR REPLACE VIEW hr_leave_requests AS
SELECT
  sar.id,
  sar.tenant_id,
  sar.staff_id,
  sar.one_off_start AS start_date,
  sar.one_off_end AS end_date,
  CASE
    WHEN sar.notes LIKE '[%' THEN SPLIT_PART(SUBSTRING(sar.notes FROM 2), ']', 1)
    ELSE 'Time Off'
  END AS leave_type,
  CASE
    WHEN sar.notes LIKE '%[PAID]%' THEN true
    ELSE false
  END AS is_paid,
  'APPROVED' AS status,
  sar.notes,
  sar.created_at,
  sar.updated_at,
  sar.archived_at
FROM staff_availability_rules sar
WHERE sar.rule_type = 'ONE_OFF'
  AND sar.availability_type = 'UNAVAILABLE';

GRANT SELECT ON hr_leave_requests TO authenticated;
