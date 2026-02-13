-- =================================================================
-- Migration 00043: Search Indexes
--
-- C1. Trigram (pg_trgm) GIN indexes for fuzzy/typeahead matching
-- C2. Full-text search GIN indexes (to_tsvector)
-- C3. Missing FK indexes
--
-- Note: pg_trgm extension is already loaded.
-- Using CREATE INDEX IF NOT EXISTS for idempotency.
-- =================================================================

BEGIN;

-- =====================================================================
-- C1. Trigram indexes for fuzzy/typeahead matching
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON clients USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sites_name_trgm
  ON sites USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm
  ON contacts USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_staff_full_name_trgm
  ON staff USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_name_trgm
  ON tasks USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_prospects_company_name_trgm
  ON sales_prospects USING GIN (company_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subcontractors_company_name_trgm
  ON subcontractors USING GIN (company_name gin_trgm_ops);


-- =====================================================================
-- C2. Full-text search GIN indexes
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_staff_full_name_fts
  ON staff USING GIN (to_tsvector('english', full_name));

CREATE INDEX IF NOT EXISTS idx_services_name_fts
  ON services USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_supply_catalog_name_fts
  ON supply_catalog USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_equipment_name_fts
  ON equipment USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_vehicles_name_fts
  ON vehicles USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_prospects_company_name_fts
  ON sales_prospects USING GIN (to_tsvector('english', company_name));

CREATE INDEX IF NOT EXISTS idx_subcontractors_company_name_fts
  ON subcontractors USING GIN (to_tsvector('english', company_name));


-- =====================================================================
-- C3. Missing FK indexes
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_sales_bids_opportunity_id
  ON sales_bids(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_sales_bids_service_id
  ON sales_bids(service_id);


COMMIT;
