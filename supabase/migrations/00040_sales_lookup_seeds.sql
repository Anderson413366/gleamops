-- 00040_sales_lookup_seeds.sql
-- Milestone 9: Sales Lookup Seeds
-- Seeds new lookup categories required by GleamBid

BEGIN;

-- =========================================================================
-- Building Types
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'building_type', 'OFFICE', 'Office', 1),
  (NULL, 'building_type', 'MEDICAL_HEALTHCARE', 'Medical / Healthcare', 2),
  (NULL, 'building_type', 'RETAIL', 'Retail', 3),
  (NULL, 'building_type', 'SCHOOL_EDUCATION', 'School / Education', 4),
  (NULL, 'building_type', 'INDUSTRIAL_MANUFACTURING', 'Industrial / Manufacturing', 5),
  (NULL, 'building_type', 'GOVERNMENT', 'Government', 6),
  (NULL, 'building_type', 'RESTAURANT_FOOD', 'Restaurant / Food Service', 7),
  (NULL, 'building_type', 'GYM_FITNESS', 'Gym / Fitness', 8)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Floor Types (expand existing)
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'floor_type', 'CARPET', 'Carpet', 1),
  (NULL, 'floor_type', 'VCT', 'VCT (Vinyl Composition Tile)', 2),
  (NULL, 'floor_type', 'CERAMIC', 'Ceramic Tile', 3),
  (NULL, 'floor_type', 'HARDWOOD', 'Hardwood', 4),
  (NULL, 'floor_type', 'CONCRETE', 'Concrete', 5),
  (NULL, 'floor_type', 'LVT', 'LVT (Luxury Vinyl Tile)', 6)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Area Types
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'area_type', 'OFFICE', 'Office', 1),
  (NULL, 'area_type', 'RESTROOM', 'Restroom', 2),
  (NULL, 'area_type', 'BREAK_ROOM', 'Break Room', 3),
  (NULL, 'area_type', 'CONFERENCE_ROOM', 'Conference Room', 4),
  (NULL, 'area_type', 'RECEPTION', 'Reception', 5),
  (NULL, 'area_type', 'HALLWAY', 'Hallway', 6),
  (NULL, 'area_type', 'LOBBY', 'Lobby', 7),
  (NULL, 'area_type', 'STAIRWELL', 'Stairwell', 8),
  (NULL, 'area_type', 'WAREHOUSE', 'Warehouse', 9),
  (NULL, 'area_type', 'CUSTOM', 'Custom', 99)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Traffic Levels
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'traffic', 'LOW', 'Low', 1),
  (NULL, 'traffic', 'MEDIUM', 'Medium', 2),
  (NULL, 'traffic', 'HIGH', 'High', 3)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Service Times
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'service_time', 'DAY', 'Day', 1),
  (NULL, 'service_time', 'EVENING', 'Evening', 2),
  (NULL, 'service_time', 'NIGHT', 'Night', 3)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- QC Frequencies
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'qc_frequency', 'WEEKLY', 'Weekly', 1),
  (NULL, 'qc_frequency', 'BIWEEKLY', 'Biweekly', 2),
  (NULL, 'qc_frequency', 'MONTHLY', 'Monthly', 3)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Pricing Methods
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'pricing_method', 'COST_PLUS', 'Cost Plus', 1),
  (NULL, 'pricing_method', 'TARGET_MARGIN', 'Target Margin', 2),
  (NULL, 'pricing_method', 'MARKET_RATE', 'Market Rate', 3),
  (NULL, 'pricing_method', 'HYBRID', 'Hybrid', 4)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Bid Types
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'bid_type', 'JANITORIAL', 'Janitorial', 1),
  (NULL, 'bid_type', 'DISINFECTING', 'Disinfecting', 2),
  (NULL, 'bid_type', 'CARPET', 'Carpet Cleaning', 3),
  (NULL, 'bid_type', 'WINDOW', 'Window Cleaning', 4),
  (NULL, 'bid_type', 'TILE', 'Tile & Grout', 5),
  (NULL, 'bid_type', 'MOVE_IN_OUT', 'Move In/Out', 6),
  (NULL, 'bid_type', 'POST_CONSTRUCTION', 'Post Construction', 7),
  (NULL, 'bid_type', 'MAID', 'Maid Service', 8)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- General Task Categories
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'general_task_category', 'QUALITY', 'Quality Inspection', 1),
  (NULL, 'general_task_category', 'CLOSING', 'Closing Duties', 2),
  (NULL, 'general_task_category', 'SETUP', 'Setup', 3),
  (NULL, 'general_task_category', 'TRAVEL', 'Travel', 4),
  (NULL, 'general_task_category', 'BREAK', 'Break', 5),
  (NULL, 'general_task_category', 'MANAGEMENT', 'Management', 6),
  (NULL, 'general_task_category', 'OTHER', 'Other', 99)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Signature Types
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'signature_type', 'DRAWN', 'Drawn', 1),
  (NULL, 'signature_type', 'TYPED', 'Typed', 2),
  (NULL, 'signature_type', 'UPLOADED', 'Uploaded', 3)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Email Event Types
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'email_event_type', 'PROCESSED', 'Processed', 1),
  (NULL, 'email_event_type', 'DELIVERED', 'Delivered', 2),
  (NULL, 'email_event_type', 'OPEN', 'Opened', 3),
  (NULL, 'email_event_type', 'CLICK', 'Clicked', 4),
  (NULL, 'email_event_type', 'BOUNCE', 'Bounced', 5),
  (NULL, 'email_event_type', 'BLOCK', 'Blocked', 6),
  (NULL, 'email_event_type', 'SPAMREPORT', 'Spam Report', 7),
  (NULL, 'email_event_type', 'UNSUBSCRIBE', 'Unsubscribed', 8)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Equipment Condition (Bid context)
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'equipment_condition_bid', 'NEW', 'New', 1),
  (NULL, 'equipment_condition_bid', 'GOOD', 'Good', 2),
  (NULL, 'equipment_condition_bid', 'FAIR', 'Fair', 3),
  (NULL, 'equipment_condition_bid', 'POOR', 'Poor', 4)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Price Elasticity
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'price_elasticity', 'LOW', 'Low', 1),
  (NULL, 'price_elasticity', 'MEDIUM', 'Medium', 2),
  (NULL, 'price_elasticity', 'HIGH', 'High', 3)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

-- =========================================================================
-- Ensure system sequences exist for sales entities
-- =========================================================================
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'entity_prefix', 'PRO', 'Prospect', 1),
  (NULL, 'entity_prefix', 'OPP', 'Opportunity', 2),
  (NULL, 'entity_prefix', 'BID', 'Bid', 3),
  (NULL, 'entity_prefix', 'PRP', 'Proposal', 4),
  (NULL, 'entity_prefix', 'SND', 'Send', 5)
ON CONFLICT (tenant_id, category, code) WHERE tenant_id IS NULL DO NOTHING;

COMMIT;
