-- ============================================================================
-- Migration 00036: Materialized Views
-- Pre-computed views for dashboard and reporting performance.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. mv_job_financials
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_job_financials AS
SELECT
  sj.id AS job_id,
  sj.tenant_id,
  sj.job_code,
  sj.job_name,
  sj.status,
  sj.frequency,
  sj.billing_amount,
  sj.billing_uom,
  s.id AS site_id,
  s.site_code,
  s.name AS site_name,
  c.id AS client_id,
  c.client_code,
  c.name AS client_name,
  COALESCE(te.total_hours, 0) AS actual_hours_30d,
  COALESCE(te.entry_count, 0) AS time_entries_30d
FROM site_jobs sj
JOIN sites s ON sj.site_id = s.id
JOIN clients c ON s.client_id = c.id
LEFT JOIN LATERAL (
  SELECT
    ROUND(EXTRACT(EPOCH FROM SUM(te.clock_out - te.clock_in)) / 3600.0, 2) AS total_hours,
    COUNT(*) AS entry_count
  FROM time_entries te
  WHERE te.job_id = sj.id
    AND te.clock_in >= NOW() - INTERVAL '30 days'
) te ON true
WHERE sj.archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mv_job_financials_job_id
  ON mv_job_financials(job_id);

-- ---------------------------------------------------------------------------
-- B. mv_client_summary
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_summary AS
SELECT
  c.id AS client_id,
  c.tenant_id,
  c.client_code,
  c.name AS client_name,
  c.status,
  COUNT(DISTINCT s.id) AS site_count,
  COUNT(DISTINCT sj.id) AS job_count,
  COALESCE(SUM(sj.billing_amount) FILTER (WHERE sj.status = 'ACTIVE'), 0) AS total_monthly_revenue
FROM clients c
LEFT JOIN sites s ON s.client_id = c.id AND s.archived_at IS NULL
LEFT JOIN site_jobs sj ON sj.site_id = s.id AND sj.archived_at IS NULL
WHERE c.archived_at IS NULL
GROUP BY c.id, c.tenant_id, c.client_code, c.name, c.status;

CREATE UNIQUE INDEX IF NOT EXISTS mv_client_summary_client_id
  ON mv_client_summary(client_id);

-- ---------------------------------------------------------------------------
-- C. mv_staff_performance
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_staff_performance AS
SELECT
  st.id AS staff_id,
  st.tenant_id,
  st.staff_code,
  st.full_name,
  st.role,
  st.staff_status,
  COALESCE(te.total_hours, 0) AS hours_last_30d,
  COALESCE(te.entry_count, 0) AS entries_last_30d,
  COALESCE(ex.exception_count, 0) AS exceptions_last_30d
FROM staff st
LEFT JOIN LATERAL (
  SELECT
    ROUND(EXTRACT(EPOCH FROM SUM(te.clock_out - te.clock_in)) / 3600.0, 2) AS total_hours,
    COUNT(*) AS entry_count
  FROM time_entries te
  WHERE te.staff_id = st.id
    AND te.clock_in >= NOW() - INTERVAL '30 days'
) te ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS exception_count
  FROM time_exceptions tex
  WHERE tex.staff_id = st.id
    AND tex.exception_date >= (NOW() - INTERVAL '30 days')::date
) ex ON true
WHERE st.archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mv_staff_performance_staff_id
  ON mv_staff_performance(staff_id);

-- ---------------------------------------------------------------------------
-- D. Refresh function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_job_financials;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_performance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
