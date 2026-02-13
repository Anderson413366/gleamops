-- ============================================================================
-- Migration 00047: Relax code constraints for real-world data
-- The original constraints enforced PREFIX-NNNN patterns but real data uses
-- different formats (e.g. SERV-NIGHTLY, DS01R, JOB-1005-NIGHTLY, STF-1002-A)
-- ============================================================================

-- Drop restrictive code check constraints
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_service_code_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_code_check;
ALTER TABLE site_jobs DROP CONSTRAINT IF EXISTS site_jobs_job_code_check;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_staff_code_check;
ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_site_code_check;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_code_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_contact_code_check;
ALTER TABLE sales_prospects DROP CONSTRAINT IF EXISTS sales_prospects_prospect_code_check;
ALTER TABLE sales_opportunities DROP CONSTRAINT IF EXISTS sales_opportunities_opportunity_code_check;
ALTER TABLE sales_bids DROP CONSTRAINT IF EXISTS sales_bids_bid_code_check;
ALTER TABLE sales_proposals DROP CONSTRAINT IF EXISTS sales_proposals_proposal_code_check;
ALTER TABLE supply_catalog DROP CONSTRAINT IF EXISTS supply_catalog_code_check;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_equipment_code_check;
ALTER TABLE subcontractors DROP CONSTRAINT IF EXISTS subcontractors_subcontractor_code_check;
ALTER TABLE staff_positions DROP CONSTRAINT IF EXISTS staff_positions_position_code_check;
ALTER TABLE key_inventory DROP CONSTRAINT IF EXISTS key_inventory_key_code_check;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_code_check;
ALTER TABLE supply_orders DROP CONSTRAINT IF EXISTS supply_orders_order_code_check;
ALTER TABLE inventory_counts DROP CONSTRAINT IF EXISTS inventory_counts_count_code_check;

-- Also relax the job_name to allow longer names
-- And make qc_weight on job_tasks NUMERIC instead of INT
ALTER TABLE job_tasks ALTER COLUMN qc_weight TYPE NUMERIC USING qc_weight::NUMERIC;

-- Relax staff role constraint to accept longer role values
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
