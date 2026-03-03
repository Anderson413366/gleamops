-- ============================================================================
-- QA Backend Fixes Migration
-- Addresses: daily_routes 404, checklist_instances/items 404,
--            checklist_templates schema gaps, inspection template seeds,
--            unnamed staff records (STF-1048–1059)
-- ============================================================================
SET search_path TO 'public';

-- ============================================================================
-- 1. daily_routes VIEW — alias for routes table
--    Frontend queries daily_routes with columns: id, route_code, route_date,
--    status, assigned_to. The actual table is 'routes' with route_owner_staff_id.
-- ============================================================================
CREATE OR REPLACE VIEW daily_routes AS
SELECT
  r.id,
  r.tenant_id,
  COALESCE(
    'RT-' || TO_CHAR(r.route_date, 'YYMMDD') || '-' || LEFT(r.id::TEXT, 4),
    r.id::TEXT
  ) AS route_code,
  r.route_date,
  r.route_type,
  r.status,
  r.route_owner_staff_id AS assigned_to,
  r.created_at,
  r.updated_at,
  r.archived_at,
  r.version_etag
FROM routes r;

-- Allow authenticated users to read
GRANT SELECT ON daily_routes TO authenticated;

-- ============================================================================
-- 2. checklist_instances VIEW — alias for ticket_checklists
--    Frontend queries checklist_instances(id, status, archived_at)
-- ============================================================================
CREATE OR REPLACE VIEW checklist_instances AS
SELECT
  tc.id,
  tc.tenant_id,
  tc.ticket_id,
  tc.template_id,
  tc.status,
  tc.completed_at,
  tc.created_at,
  tc.updated_at,
  tc.archived_at,
  tc.version_etag
FROM ticket_checklists tc;

GRANT SELECT ON checklist_instances TO authenticated;

-- ============================================================================
-- 3. checklist_items VIEW — alias for ticket_checklist_items
--    Frontend queries checklist_items(id, is_completed, archived_at)
-- ============================================================================
CREATE OR REPLACE VIEW checklist_items AS
SELECT
  tci.id,
  tci.tenant_id,
  tci.checklist_id,
  tci.template_item_id,
  tci.is_checked AS is_completed,
  tci.checked_at AS completed_at,
  tci.notes,
  tci.created_at,
  tci.updated_at,
  tci.archived_at,
  tci.version_etag
FROM ticket_checklist_items tci;

GRANT SELECT ON checklist_items TO authenticated;

-- ============================================================================
-- 4. checklist_templates schema additions
--    Frontend inserts template_name, template_type, version columns
--    that don't exist yet on the table.
-- ============================================================================
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'Shift Checklist',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Relax the template_code CHECK to allow both CLT- and SCL- prefixes
ALTER TABLE checklist_templates DROP CONSTRAINT IF EXISTS checklist_templates_template_code_check;
ALTER TABLE checklist_templates ADD CONSTRAINT checklist_templates_template_code_check
  CHECK (template_code ~ '^(CLT|SCL)-[A-Za-z0-9_-]+$');

-- ============================================================================
-- 5. Inspection template seeds
--    Creates 3 starter inspection templates for healthcare janitorial.
--    template_code must match ^INS-[0-9]{4,}$
-- ============================================================================
INSERT INTO inspection_templates (tenant_id, template_code, name, description, scoring_scale, pass_threshold, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'INS-1001', 'Nightly Cleaning Inspection', 'Standard nightly cleaning quality audit for all site types. Covers floors, restrooms, trash, and general appearance.', 5, 80.0, true),
  ('a0000000-0000-0000-0000-000000000001', 'INS-1002', 'Healthcare Facility Compliance', 'Healthcare-specific compliance inspection covering sanitization, waste disposal, infection control, and OSHA requirements.', 5, 90.0, true),
  ('a0000000-0000-0000-0000-000000000001', 'INS-1003', 'Kitchen & Break Room Audit', 'Kitchen and break room cleaning quality check for food-service areas. Covers surfaces, appliances, floors, and waste.', 5, 85.0, true)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================================
-- 6. Fix unnamed staff records (STF-1048 through STF-1059)
--    These have full_name = staff_code (e.g., 'STF-1048').
--    full_name is NOT NULL with nonempty constraint, so set to a placeholder.
-- ============================================================================
UPDATE staff
SET full_name = '[Name Required - ' || staff_code || ']', updated_at = NOW()
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'
  AND full_name = staff_code
  AND staff_code LIKE 'STF-%'
  AND archived_at IS NULL;
