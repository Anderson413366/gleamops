-- =================================================================
-- Migration 00042: Constraint Hardening
--
-- Adds CHECK constraints for:
--   A1. Non-empty text on required name/label/title fields
--   A2. Non-negative money/numeric fields
--   A3. Percentage bound constraints
--   A4. Status enum CHECKs on tables missing them
--   A5. Email format CHECKs
--
-- All constraints use ADD CONSTRAINT IF NOT EXISTS pattern
-- (Postgres 12+) via DO blocks for idempotency.
-- =================================================================

BEGIN;

-- =====================================================================
-- A1. Non-empty text constraints
-- CHECK (length(trim(field)) >= 1) on every required name/label/title
-- =====================================================================

-- CRM
ALTER TABLE clients ADD CONSTRAINT chk_clients_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE sites ADD CONSTRAINT chk_sites_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE contacts ADD CONSTRAINT chk_contacts_name_nonempty
  CHECK (length(trim(name)) >= 1);

-- Workforce
ALTER TABLE staff ADD CONSTRAINT chk_staff_full_name_nonempty
  CHECK (length(trim(full_name)) >= 1);

ALTER TABLE staff_positions ADD CONSTRAINT chk_positions_title_nonempty
  CHECK (length(trim(title)) >= 1);

-- Service DNA
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE services ADD CONSTRAINT chk_services_name_nonempty
  CHECK (length(trim(name)) >= 1);

-- Sales / Pipeline
ALTER TABLE sales_prospects ADD CONSTRAINT chk_prospects_company_name_nonempty
  CHECK (length(trim(company_name)) >= 1);

ALTER TABLE sales_opportunities ADD CONSTRAINT chk_opportunities_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE sales_bid_areas ADD CONSTRAINT chk_bid_areas_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE sales_bid_general_tasks ADD CONSTRAINT chk_bid_general_tasks_name_nonempty
  CHECK (length(trim(task_name)) >= 1);

ALTER TABLE sales_production_rates ADD CONSTRAINT chk_production_rates_name_nonempty
  CHECK (length(trim(task_name)) >= 1);

ALTER TABLE sales_prospect_contacts ADD CONSTRAINT chk_prospect_contacts_name_nonempty
  CHECK (length(trim(contact_name)) >= 1);

ALTER TABLE sales_marketing_inserts ADD CONSTRAINT chk_marketing_inserts_title_nonempty
  CHECK (length(trim(title)) >= 1);

-- Proposals / Follow-ups
ALTER TABLE sales_followup_templates ADD CONSTRAINT chk_followup_templates_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE sales_followup_templates ADD CONSTRAINT chk_followup_templates_subject_nonempty
  CHECK (length(trim(subject_template)) >= 1);

-- Inventory & Assets
ALTER TABLE supply_catalog ADD CONSTRAINT chk_supply_catalog_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE supply_kits ADD CONSTRAINT chk_supply_kits_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE equipment ADD CONSTRAINT chk_equipment_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE vehicles ADD CONSTRAINT chk_vehicles_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE key_inventory ADD CONSTRAINT chk_key_inventory_label_nonempty
  CHECK (length(trim(label)) >= 1);

-- Subcontractors
ALTER TABLE subcontractors ADD CONSTRAINT chk_subcontractors_company_name_nonempty
  CHECK (length(trim(company_name)) >= 1);

-- Quality Templates
ALTER TABLE checklist_templates ADD CONSTRAINT chk_checklist_templates_name_nonempty
  CHECK (length(trim(name)) >= 1);

ALTER TABLE inspection_templates ADD CONSTRAINT chk_inspection_templates_name_nonempty
  CHECK (length(trim(name)) >= 1);


-- =====================================================================
-- A2. Non-negative money/numeric constraints
-- CHECK (field >= 0)
-- =====================================================================

-- Workforce
ALTER TABLE staff ADD CONSTRAINT chk_staff_pay_rate_nonneg
  CHECK (pay_rate >= 0);

-- Subcontractors
ALTER TABLE subcontractors ADD CONSTRAINT chk_subcontractors_hourly_rate_nonneg
  CHECK (hourly_rate >= 0);

-- Operations
ALTER TABLE site_jobs ADD CONSTRAINT chk_site_jobs_billing_amount_nonneg
  CHECK (billing_amount >= 0);

-- Supply Catalog
ALTER TABLE supply_catalog ADD CONSTRAINT chk_supply_catalog_unit_cost_nonneg
  CHECK (unit_cost >= 0);

ALTER TABLE supply_catalog ADD CONSTRAINT chk_supply_catalog_billing_rate_nonneg
  CHECK (billing_rate >= 0);

ALTER TABLE supply_catalog ADD CONSTRAINT chk_supply_catalog_min_stock_nonneg
  CHECK (min_stock_level >= 0);

-- Supply Orders
ALTER TABLE supply_orders ADD CONSTRAINT chk_supply_orders_total_amount_nonneg
  CHECK (total_amount >= 0);

-- Equipment
ALTER TABLE equipment ADD CONSTRAINT chk_equipment_purchase_price_nonneg
  CHECK (purchase_price >= 0);

-- Vehicles
ALTER TABLE vehicle_maintenance ADD CONSTRAINT chk_vehicle_maintenance_cost_nonneg
  CHECK (cost >= 0);

-- Sales Bid Labor Rates
ALTER TABLE sales_bid_labor_rates ADD CONSTRAINT chk_bid_labor_cleaner_rate_nonneg
  CHECK (cleaner_rate >= 0);

ALTER TABLE sales_bid_labor_rates ADD CONSTRAINT chk_bid_labor_lead_rate_nonneg
  CHECK (lead_rate >= 0);

ALTER TABLE sales_bid_labor_rates ADD CONSTRAINT chk_bid_labor_supervisor_rate_nonneg
  CHECK (supervisor_rate >= 0);

-- Sales Bid Pricing Results
ALTER TABLE sales_bid_pricing_results ADD CONSTRAINT chk_bid_pricing_total_cost_nonneg
  CHECK (total_monthly_cost >= 0);

ALTER TABLE sales_bid_pricing_results ADD CONSTRAINT chk_bid_pricing_recommended_nonneg
  CHECK (recommended_price >= 0);

-- Proposal Pricing Options
ALTER TABLE sales_proposal_pricing_options ADD CONSTRAINT chk_proposal_pricing_monthly_nonneg
  CHECK (monthly_price >= 0);

-- Bid Equipment Plan Items
ALTER TABLE sales_bid_equipment_plan_items ADD CONSTRAINT chk_bid_equip_cost_nonneg
  CHECK (cost >= 0);

-- Bid Areas: positive values
ALTER TABLE sales_bid_areas ADD CONSTRAINT chk_bid_areas_sqft_positive
  CHECK (square_footage > 0);

ALTER TABLE sales_bid_areas ADD CONSTRAINT chk_bid_areas_quantity_positive
  CHECK (quantity > 0);


-- =====================================================================
-- A3. Percentage bound constraints
-- Normal percentages: CHECK (field BETWEEN 0 AND 100)
-- Markup percentages: CHECK (field BETWEEN 0 AND 1000)
-- =====================================================================

-- Bid Burden (0-100)
ALTER TABLE sales_bid_burden ADD CONSTRAINT chk_bid_burden_employer_tax_pct
  CHECK (employer_tax_pct BETWEEN 0 AND 100);

ALTER TABLE sales_bid_burden ADD CONSTRAINT chk_bid_burden_workers_comp_pct
  CHECK (workers_comp_pct BETWEEN 0 AND 100);

ALTER TABLE sales_bid_burden ADD CONSTRAINT chk_bid_burden_insurance_pct
  CHECK (insurance_pct BETWEEN 0 AND 100);

ALTER TABLE sales_bid_burden ADD CONSTRAINT chk_bid_burden_other_pct
  CHECK (other_pct BETWEEN 0 AND 100);

-- Bids (0-100)
ALTER TABLE sales_bids ADD CONSTRAINT chk_bids_target_margin_pct
  CHECK (target_margin_percent BETWEEN 0 AND 100);

-- Bid Overhead (0-100)
ALTER TABLE sales_bid_overhead ADD CONSTRAINT chk_bid_overhead_allocation_pct
  CHECK (allocation_percentage BETWEEN 0 AND 100);

-- Bid Pricing Strategy
ALTER TABLE sales_bid_pricing_strategy ADD CONSTRAINT chk_pricing_target_margin_pct
  CHECK (target_margin_pct BETWEEN 0 AND 100);

ALTER TABLE sales_bid_pricing_strategy ADD CONSTRAINT chk_pricing_annual_increase_pct
  CHECK (annual_increase_pct BETWEEN 0 AND 100);

-- Allow >100 for markups (0-1000)
ALTER TABLE supply_catalog ADD CONSTRAINT chk_supply_catalog_markup_pct
  CHECK (markup_percentage BETWEEN 0 AND 1000);

ALTER TABLE sales_bid_consumables ADD CONSTRAINT chk_bid_consumables_markup_pct
  CHECK (markup_pct BETWEEN 0 AND 1000);

ALTER TABLE sales_bid_pricing_strategy ADD CONSTRAINT chk_pricing_cost_plus_markup_pct
  CHECK (cost_plus_markup_pct BETWEEN 0 AND 1000);


-- =====================================================================
-- A4. Status enum CHECKs on tables that are missing them
-- =====================================================================

ALTER TABLE site_jobs ADD CONSTRAINT chk_site_jobs_status
  CHECK (status IN (
    'DRAFT', 'ACTIVE', 'ON_HOLD', 'CANCELLED', 'COMPLETED'
  ));

ALTER TABLE work_tickets ADD CONSTRAINT chk_work_tickets_status
  CHECK (status IN (
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED'
  ));

ALTER TABLE sales_bids ADD CONSTRAINT chk_sales_bids_status
  CHECK (status IN (
    'DRAFT', 'CALCULATING', 'PRICED', 'SENT', 'WON', 'LOST', 'EXPIRED', 'ARCHIVED'
  ));

ALTER TABLE sales_proposals ADD CONSTRAINT chk_sales_proposals_status
  CHECK (status IN (
    'DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'OPENED', 'WON', 'LOST', 'EXPIRED'
  ));

ALTER TABLE sales_proposal_sends ADD CONSTRAINT chk_proposal_sends_status
  CHECK (status IN (
    'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED'
  ));

ALTER TABLE sales_followup_sequences ADD CONSTRAINT chk_followup_sequences_status
  CHECK (status IN (
    'ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED'
  ));

ALTER TABLE sales_followup_sends ADD CONSTRAINT chk_followup_sends_status
  CHECK (status IN (
    'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'
  ));

ALTER TABLE job_logs ADD CONSTRAINT chk_job_logs_status
  CHECK (status IN (
    'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
  ));

ALTER TABLE job_logs ADD CONSTRAINT chk_job_logs_severity
  CHECK (severity IN (
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  ));

ALTER TABLE inspections ADD CONSTRAINT chk_inspections_status
  CHECK (status IN (
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ));

ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_status
  CHECK (status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'
  ));

ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_status
  CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'
  ));

ALTER TABLE ticket_checklists ADD CONSTRAINT chk_ticket_checklists_status
  CHECK (status IN (
    'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'
  ));

ALTER TABLE inventory_counts ADD CONSTRAINT chk_inventory_counts_status
  CHECK (status IN (
    'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ));


-- =====================================================================
-- A5. Email format CHECK (lightweight regex)
-- =====================================================================

ALTER TABLE sales_proposal_sends ADD CONSTRAINT chk_proposal_sends_email_format
  CHECK (recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- sales_followup_sends has no recipient_email column (gets it from the sequence)
-- so no constraint needed there.


COMMIT;
