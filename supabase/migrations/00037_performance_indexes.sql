-- ============================================================================
-- Migration 00037: Performance Indexes
-- Targeted indexes on frequently filtered/sorted columns.
-- ============================================================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name) WHERE archived_at IS NULL;

-- Sites
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name) WHERE archived_at IS NULL;

-- Site Jobs
CREATE INDEX IF NOT EXISTS idx_site_jobs_site_id ON site_jobs(site_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_jobs_service_id ON site_jobs(service_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_jobs_status ON site_jobs(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_jobs_frequency ON site_jobs(frequency) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_jobs_billing ON site_jobs(billing_amount DESC NULLS LAST) WHERE archived_at IS NULL;

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(staff_status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_full_name ON staff(full_name) WHERE archived_at IS NULL;

-- Job Tasks
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_tasks_task_id ON job_tasks(task_id) WHERE archived_at IS NULL;

-- Job Logs
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_site_id ON job_logs(site_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_log_date ON job_logs(log_date DESC) WHERE archived_at IS NULL;

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_site_id ON contacts(site_id) WHERE archived_at IS NULL;

-- Supply Catalog
CREATE INDEX IF NOT EXISTS idx_supply_catalog_category ON supply_catalog(category) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supply_catalog_name ON supply_catalog(name) WHERE archived_at IS NULL;

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_site_id ON equipment(site_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_condition ON equipment(condition) WHERE archived_at IS NULL;

-- Time Entries (for materialized views)
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_job ON time_entries(staff_id, job_id) WHERE clock_in >= NOW() - INTERVAL '90 days';
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in DESC);

-- Job Staff Assignments
CREATE INDEX IF NOT EXISTS idx_job_staff_asgn_staff ON job_staff_assignments(staff_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_staff_asgn_job ON job_staff_assignments(job_id) WHERE archived_at IS NULL;
