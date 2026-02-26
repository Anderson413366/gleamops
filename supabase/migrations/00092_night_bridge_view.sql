BEGIN;

CREATE OR REPLACE VIEW public.v_night_bridge AS
SELECT
  r.id AS route_id,
  r.tenant_id,
  r.route_date,
  r.status AS route_status,
  r.shift_started_at,
  r.shift_ended_at,
  r.mileage_start,
  r.mileage_end,
  r.shift_summary,
  r.shift_review_status,
  r.reviewed_by,
  r.reviewed_at,
  r.reviewer_notes,
  s.full_name AS floater_name,
  s.staff_code AS floater_code,
  v.name AS vehicle_name,
  v.vehicle_code,
  (
    SELECT count(*)
    FROM public.route_stops rs
    WHERE rs.route_id = r.id
      AND rs.stop_status = 'COMPLETED'
      AND rs.archived_at IS NULL
  ) AS stops_completed,
  (
    SELECT count(*)
    FROM public.route_stops rs
    WHERE rs.route_id = r.id
      AND rs.stop_status = 'SKIPPED'
      AND rs.archived_at IS NULL
  ) AS stops_skipped,
  (
    SELECT count(*)
    FROM public.route_stops rs
    WHERE rs.route_id = r.id
      AND rs.archived_at IS NULL
  ) AS stops_total,
  (
    SELECT count(*)
    FROM public.route_stop_tasks rst
    JOIN public.route_stops rs2 ON rs2.id = rst.route_stop_id
    WHERE rs2.route_id = r.id
      AND rst.archived_at IS NULL
      AND rst.evidence_photos IS NOT NULL
      AND jsonb_array_length(rst.evidence_photos) > 0
  ) AS photos_uploaded
FROM public.routes r
LEFT JOIN public.staff s ON s.id = r.route_owner_staff_id
LEFT JOIN public.vehicle_checkouts vc
  ON vc.route_id = r.id
  AND vc.returned_at IS NOT NULL
LEFT JOIN public.vehicles v ON v.id = vc.vehicle_id
WHERE r.status = 'COMPLETED'
  AND r.archived_at IS NULL
ORDER BY r.route_date DESC, r.shift_ended_at DESC;

NOTIFY pgrst, 'reload schema';

COMMIT;
