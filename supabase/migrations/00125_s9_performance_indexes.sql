-- =============================================================================
-- Migration 00125: Sprint 9 — Performance Indexes
-- =============================================================================
-- 10 composite indexes on hot tables.
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- Each statement runs independently.
-- =============================================================================

SET search_path TO 'public';

-- 1. Work tickets: tenant + status + scheduled_date (hot query for dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_tenant_status_date
  ON work_tickets (tenant_id, status, scheduled_date)
  WHERE archived_at IS NULL;

-- 2. Work tickets: site + scheduled_date (site detail page ticket list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_site_date
  ON work_tickets (site_id, scheduled_date DESC)
  WHERE archived_at IS NULL;

-- 3. Time entries: tenant + staff + date range (timesheet queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_tenant_staff_date
  ON time_entries (tenant_id, staff_id, start_at DESC)
  WHERE archived_at IS NULL;

-- 4. Site jobs: tenant + status + site (job listing with site filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_site_jobs_tenant_status_site
  ON site_jobs (tenant_id, status, site_id)
  WHERE archived_at IS NULL;

-- 5. Ticket assignments: ticket + staff (join performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_assignments_ticket_staff
  ON ticket_assignments (ticket_id, staff_id)
  WHERE archived_at IS NULL;

-- 6. Staff: tenant + status + role (filtered staff lists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tenant_status_role
  ON staff (tenant_id, status, role)
  WHERE archived_at IS NULL;

-- 7. Sites: tenant + client + status (client detail site list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_tenant_client_status
  ON sites (tenant_id, client_id, status)
  WHERE archived_at IS NULL;

-- 8. Lookups: tenant + category (lookup fetches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lookups_tenant_category
  ON lookups (tenant_id, category)
  WHERE is_active = true;

-- 9. Contacts: tenant + client (client contacts query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tenant_client
  ON contacts (tenant_id, client_id)
  WHERE archived_at IS NULL;

-- 10. Schedule periods: tenant + status + date range (schedule views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_periods_tenant_status_range
  ON schedule_periods (tenant_id, status, period_start, period_end)
  WHERE archived_at IS NULL;
