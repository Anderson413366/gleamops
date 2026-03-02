-- =============================================================================
-- Task 1: Run ANALYZE to fix stale planner stats
-- =============================================================================
-- 14 tables had stale pg_class.reltuples (-1 or 0) despite having actual data:
--   tenants (2), supply_catalog (64), site_types (21), task_categories (18),
--   permissions (10), route_templates (6), work_tickets (5), roles (4),
--   tenant_memberships (3), ticket_assignments (2), payroll_export_mappings (1),
--   payroll_export_mapping_fields (1), routes (1), subcontractors (1)
--
-- ANALYZE updates row estimates for ALL 220 tables so the query planner
-- generates optimal execution plans.
-- =============================================================================

ANALYZE;
