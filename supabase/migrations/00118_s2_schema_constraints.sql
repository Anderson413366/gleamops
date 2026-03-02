-- =============================================================================
-- Migration 00118: Sprint 2 — Schema Constraints & Defaults
-- =============================================================================
-- Adds NOT NULL constraints, defaults, CHECK constraints, and unique indexes.
-- All data was backfilled in Sprint 1 (00117).
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S2-T1: lookups.tenant_id NOT NULL
-- All NULL tenant_id rows were assigned in S1-T1.
-- ---------------------------------------------------------------------------
ALTER TABLE lookups ALTER COLUMN tenant_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- S2-T2: site_jobs.start_date NOT NULL + DEFAULT
-- All NULL start_date rows were backfilled in S1-T4.
-- ---------------------------------------------------------------------------
ALTER TABLE site_jobs ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE site_jobs ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;

-- ---------------------------------------------------------------------------
-- S2-T3: work_tickets defaults + CHECK on type
-- All NULL priority/type rows were backfilled in S1-T6.
-- ---------------------------------------------------------------------------
ALTER TABLE work_tickets ALTER COLUMN priority SET DEFAULT 'NORMAL';

ALTER TABLE work_tickets
  ADD CONSTRAINT chk_work_tickets_type
  CHECK (type IN ('RECURRING', 'ONE_TIME', 'EMERGENCY', 'INSPECTION'));

-- ---------------------------------------------------------------------------
-- S2-T4: staff defaults for pay_type and schedule_type
-- All NULL rows were backfilled in S1-T3.
-- ---------------------------------------------------------------------------
ALTER TABLE staff ALTER COLUMN pay_type SET DEFAULT 'HOURLY';
ALTER TABLE staff ALTER COLUMN schedule_type SET DEFAULT 'VARIABLE';

-- ---------------------------------------------------------------------------
-- S2-T5: CHECK constraints on site_jobs time/date ranges
-- ---------------------------------------------------------------------------
ALTER TABLE site_jobs
  ADD CONSTRAINT chk_site_jobs_date_range
  CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE site_jobs
  ADD CONSTRAINT chk_site_jobs_time_range
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

-- ---------------------------------------------------------------------------
-- S2-T6: CHECK constraint on work_tickets time range
-- ---------------------------------------------------------------------------
ALTER TABLE work_tickets
  ADD CONSTRAINT chk_work_tickets_time_range
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

-- ---------------------------------------------------------------------------
-- S2-T7: UNIQUE partial index on sites(tenant_id, lower(trim(name)))
-- Prevents duplicate site names per tenant (case-insensitive) for active sites.
-- Duplicates were tagged in S1-T5.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_unique_name_per_tenant
  ON sites (tenant_id, lower(trim(name)))
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- S2-T8: UNIQUE partial index on clients(tenant_id, lower(trim(name)))
-- Prevents duplicate client names per tenant (case-insensitive) for active clients.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_name_per_tenant
  ON clients (tenant_id, lower(trim(name)))
  WHERE archived_at IS NULL;

COMMIT;
