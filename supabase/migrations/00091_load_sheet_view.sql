BEGIN;

CREATE OR REPLACE VIEW public.v_load_sheet AS
SELECT
  rst.tenant_id,
  r.id AS route_id,
  r.route_date,
  r.route_owner_staff_id,
  di.supply_id,
  sc.name AS supply_name,
  sc.unit,
  di.direction,
  SUM(di.quantity) AS total_quantity,
  json_agg(json_build_object(
    'stop_order', rs.stop_order,
    'site_name', s.name,
    'quantity', di.quantity
  ) ORDER BY rs.stop_order ASC) AS site_breakdown
FROM public.route_stop_tasks rst
  JOIN public.route_stops rs ON rs.id = rst.route_stop_id
  JOIN public.routes r ON r.id = rs.route_id
  JOIN public.site_jobs sj ON sj.id = rs.site_job_id
  JOIN public.sites s ON s.id = sj.site_id
  CROSS JOIN LATERAL jsonb_to_recordset(rst.delivery_items)
    AS di(supply_id UUID, quantity INT, direction TEXT)
  LEFT JOIN public.supply_catalog sc ON sc.id = di.supply_id
WHERE rst.task_type = 'DELIVER_PICKUP'
  AND rst.archived_at IS NULL
  AND rs.archived_at IS NULL
  AND r.archived_at IS NULL
GROUP BY rst.tenant_id, r.id, r.route_date, r.route_owner_staff_id,
         di.supply_id, sc.name, sc.unit, di.direction;

NOTIFY pgrst, 'reload schema';

COMMIT;
