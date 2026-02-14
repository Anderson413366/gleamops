-- ==========================================================================
-- Post-Migration Smoke Test SQL
-- ==========================================================================
-- Run after applying migrations to verify data integrity.
-- Usage:  psql $DATABASE_URL < scripts/post-migration-smoke.sql
--
-- Expected: all queries return 0 rows (no issues found).
-- Any rows returned indicate a data integrity problem.
-- ==========================================================================

\echo '--- 1. Per-tenant row counts for core business tables ---'
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  (SELECT count(*) FROM clients c WHERE c.tenant_id = t.id) AS clients,
  (SELECT count(*) FROM sites s WHERE s.tenant_id = t.id) AS sites,
  (SELECT count(*) FROM site_jobs sj WHERE sj.tenant_id = t.id) AS site_jobs,
  (SELECT count(*) FROM staff st WHERE st.tenant_id = t.id) AS staff,
  (SELECT count(*) FROM work_tickets wt WHERE wt.tenant_id = t.id) AS tickets,
  (SELECT count(*) FROM sales_bids sb WHERE sb.tenant_id = t.id) AS bids,
  (SELECT count(*) FROM sales_proposals sp WHERE sp.tenant_id = t.id) AS proposals
FROM tenants t
ORDER BY t.name;

\echo ''
\echo '--- 2. Orphan FK checks: sites without valid client ---'
SELECT s.id, s.site_code, s.client_id
FROM sites s
LEFT JOIN clients c ON c.id = s.client_id
WHERE c.id IS NULL
  AND s.archived_at IS NULL;

\echo ''
\echo '--- 3. Orphan FK checks: site_jobs without valid site ---'
SELECT sj.id, sj.job_code, sj.site_id
FROM site_jobs sj
LEFT JOIN sites s ON s.id = sj.site_id
WHERE s.id IS NULL
  AND sj.archived_at IS NULL;

\echo ''
\echo '--- 4. Orphan FK checks: work_tickets without valid site_job ---'
SELECT wt.id, wt.ticket_code, wt.site_job_id
FROM work_tickets wt
LEFT JOIN site_jobs sj ON sj.id = wt.site_job_id
WHERE sj.id IS NULL
  AND wt.archived_at IS NULL;

\echo ''
\echo '--- 5. Duplicate entity codes per tenant ---'
SELECT tenant_id, client_code, count(*) AS cnt
FROM clients
WHERE archived_at IS NULL
GROUP BY tenant_id, client_code
HAVING count(*) > 1;

SELECT tenant_id, site_code, count(*) AS cnt
FROM sites
WHERE archived_at IS NULL
GROUP BY tenant_id, site_code
HAVING count(*) > 1;

SELECT tenant_id, staff_code, count(*) AS cnt
FROM staff
WHERE archived_at IS NULL
GROUP BY tenant_id, staff_code
HAVING count(*) > 1;

SELECT tenant_id, job_code, count(*) AS cnt
FROM site_jobs
WHERE archived_at IS NULL
GROUP BY tenant_id, job_code
HAVING count(*) > 1;

\echo ''
\echo '--- 6. NULL tenant_id in business tables ---'
SELECT 'clients' AS table_name, count(*) AS null_tenant
FROM clients WHERE tenant_id IS NULL
UNION ALL
SELECT 'sites', count(*) FROM sites WHERE tenant_id IS NULL
UNION ALL
SELECT 'site_jobs', count(*) FROM site_jobs WHERE tenant_id IS NULL
UNION ALL
SELECT 'staff', count(*) FROM staff WHERE tenant_id IS NULL
UNION ALL
SELECT 'work_tickets', count(*) FROM work_tickets WHERE tenant_id IS NULL
UNION ALL
SELECT 'sales_bids', count(*) FROM sales_bids WHERE tenant_id IS NULL
UNION ALL
SELECT 'sales_proposals', count(*) FROM sales_proposals WHERE tenant_id IS NULL
HAVING count(*) > 0;

\echo ''
\echo '--- 7. Materialized view population check ---'
SELECT 'mv_job_financials' AS view_name, count(*) AS row_count
FROM mv_job_financials
UNION ALL
SELECT 'mv_client_summary', count(*) FROM mv_client_summary
UNION ALL
SELECT 'mv_staff_performance', count(*) FROM mv_staff_performance;

\echo ''
\echo '--- 8. RLS sanity check: ensure all business tables have RLS enabled ---'
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'clients', 'sites', 'site_jobs', 'staff', 'work_tickets',
    'sales_bids', 'sales_proposals', 'equipment', 'vehicles',
    'supply_catalog', 'supply_orders', 'inventory_counts',
    'time_entries', 'timesheets', 'inspections'
  )
  AND rowsecurity = false;

\echo ''
\echo '--- Smoke test complete ---'
