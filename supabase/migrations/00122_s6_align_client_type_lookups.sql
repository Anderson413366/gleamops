-- =============================================================================
-- Migration 00122: Sprint 6 — Align Client Type Lookups
-- =============================================================================
-- S6-T6: Delete old Client Type lookups with inconsistent values,
-- insert 15 standardized values matching the site_types categories.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- Remove old Client Type lookups that may have inconsistent values
DELETE FROM lookups
WHERE category IN ('Client Type', 'CLIENT_TYPE', 'client_type')
  AND tenant_id = 'a0000000-0000-0000-0000-000000000001';

-- Insert 15 standardized Client Type values
INSERT INTO lookups (tenant_id, category, code, label, sort_order)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'COMMERCIAL_OFFICE', 'Commercial Office', 1),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'MEDICAL', 'Medical / Healthcare', 2),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'DENTAL', 'Dental Office', 3),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'RETAIL', 'Retail Store', 4),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'INDUSTRIAL', 'Industrial / Warehouse', 5),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'EDUCATIONAL', 'School / University', 6),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'RESTAURANT', 'Restaurant / Food Service', 7),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'RELIGIOUS', 'Church / Religious', 8),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'RESIDENTIAL', 'Residential', 9),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'GOVERNMENT', 'Government', 10),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'FITNESS', 'Gym / Fitness Center', 11),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'HOSPITALITY', 'Hotel / Hospitality', 12),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'FINANCIAL', 'Bank / Financial', 13),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'PROPERTY_MGMT', 'Property Management', 14),
  ('a0000000-0000-0000-0000-000000000001', 'Client Type', 'OTHER', 'Other', 99)
ON CONFLICT (tenant_id, category, code) DO UPDATE
  SET label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order;

COMMIT;
