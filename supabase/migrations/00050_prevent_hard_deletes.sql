-- Migration 00050: Prevent hard deletes on business tables
--
-- Creates a trigger function that blocks DELETE operations on protected tables.
-- Business data must be soft-deleted (archived_at / archived_by / archive_reason).
-- System/event tables are excluded to allow normal cleanup operations.
--
-- To perform an emergency delete, use the service_role key and drop the trigger
-- on the specific table temporarily (with documented reason in audit_events).

-- ============================================================================
-- 1. Trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on table %. Use soft delete (UPDATE archived_at) instead.', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Apply trigger to all protected business tables
-- ============================================================================

-- CRM (3 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON clients FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sites FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Sales — Core (12 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_prospects FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_prospect_contacts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_opportunities FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bids FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_versions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_areas FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_area_tasks FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_schedule FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_labor_rates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_burden FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_workload_results FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_pricing_results FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Sales — Proposals & Follow-up (6 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposals FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposal_pricing_options FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposal_sends FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_followup_sequences FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_followup_sends FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_followup_templates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Sales — Conversion (2 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_conversions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_conversion_events FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Sales — Expansion (12 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_sites FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_general_tasks FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_production_rates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_consumables FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_supply_allowances FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_supply_kits FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_equipment_plan_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_overhead FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_bid_pricing_strategy FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposal_attachments FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_marketing_inserts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposal_marketing_inserts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON sales_proposal_signatures FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Service DNA (4 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON task_production_rates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON services FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON service_tasks FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Operations (14 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_jobs FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON work_tickets FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON ticket_assignments FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON checklist_template_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON ticket_checklists FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON ticket_checklist_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON ticket_photos FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inspection_templates FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inspection_template_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inspections FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inspection_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inspection_issues FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Workforce (7 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON staff FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON staff_positions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON geofences FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON time_entries FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON time_exceptions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON timesheets FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON timesheet_approvals FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Inventory & Assets (11 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON supply_catalog FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON supply_kits FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON supply_kit_items FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON key_inventory FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON equipment FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON equipment_assignments FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON vehicle_maintenance FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON supply_orders FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inventory_counts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON inventory_count_details FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Vendors (1 table)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON subcontractors FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Safety (4 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON staff_certifications FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON safety_documents FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON training_courses FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON training_completions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Site-level (3 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_supplies FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON site_asset_requirements FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON ticket_asset_checkouts FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Job-level (3 tables)
CREATE TRIGGER no_hard_delete BEFORE DELETE ON job_logs FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON job_tasks FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON job_staff_assignments FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- ============================================================================
-- EXCLUDED (system/event tables — deletes allowed):
--   tenants, tenant_memberships, lookups, status_transitions, system_sequences,
--   audit_events, notifications, files, user_site_assignments, user_profiles,
--   user_client_access, user_team_memberships, user_access_grants,
--   sales_email_events, time_events, pay_rate_history, vehicle_checkouts,
--   key_event_log, timeline_events, alerts
-- ============================================================================
