-- =============================================================================
-- Task 4: Create feature_flags seed table
-- =============================================================================
-- DB-backed feature flags for tracking which empty-table domains are activated.
-- Separate from the existing env-var-based FeatureDomain system in
-- packages/shared/src/constants/feature-flags.ts (which controls UI features).
-- This table tracks database domain readiness.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create the table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- 2. Enable RLS with tenant isolation
-- ---------------------------------------------------------------------------
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON feature_flags
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_insert ON feature_flags FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_update ON feature_flags FOR UPDATE
  USING (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- 3. Standard triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- ---------------------------------------------------------------------------
-- 4. Seed with 18 feature domains (all disabled)
-- Uses the first tenant from the tenants table.
-- ---------------------------------------------------------------------------
INSERT INTO feature_flags (tenant_id, feature_key, is_enabled, notes)
SELECT t.id, v.feature_key, false, v.notes
FROM (SELECT id FROM tenants LIMIT 1) t
CROSS JOIN (VALUES
  ('contacts',                'contacts table — 1 table, 28 cols. Blocks: clients + sites contact FKs'),
  ('scheduling',              'schedule_periods, schedule_conflicts, shift_trade_requests, callout_events, coverage_offers, on_call_pool, recurrence_rules, job_schedule_rules, job_staff_assignments — 9 tables'),
  ('site_management_extended','site_areas, site_books, site_pin_codes, geofences, nfc_tags, area_fixtures, etc — 12 tables'),
  ('inspections',             'inspections, inspection_items, inspection_templates, checklist_templates, etc — 8 tables'),
  ('billing_contracts',       'contracts, invoices, payments, contract_slas, etc — 8 tables'),
  ('hr_training',             'hr_badges, hr_goals, hr_pto_requests, training_courses, staff_certifications, etc — 13 tables'),
  ('payroll_extended',        'pay_periods, payroll_runs, timesheets, time_policies, etc — 12 tables'),
  ('supply_chain',            'items, inventory_locations, purchase_orders, stock_levels, vendors, etc — 18 tables'),
  ('sales_bidding',           'sales_bids, sales_proposals, sales_opportunities, etc — 35 tables (largest domain)'),
  ('fleet_vehicles',          'vehicles, vehicle_checkouts, vehicle_dvir_logs, etc — 5 tables'),
  ('routing_extended',        'route_stops, route_stop_tasks — 2 tables'),
  ('user_access',             'user_roles, user_sessions, user_site_assignments, etc — 8 tables'),
  ('messaging',               'conversations, messages, message_threads, notification_preferences — 6 tables'),
  ('integrations',            'integration_connections, webhooks, external_id_map — 4 tables'),
  ('customer_relations',      'complaint_records, customer_feedback, customer_portal_sessions — 3 tables'),
  ('custom_fields',           'custom_fields, custom_field_options, custom_field_values — 3 tables'),
  ('files',                   'files, file_links — 2 tables, 10 inbound FKs — cross-cutting dependency'),
  ('audit_logging',           'audit_events, timeline_events, job_logs, job_status_events, key_event_log — 5 tables')
) AS v(feature_key, notes)
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

COMMIT;
