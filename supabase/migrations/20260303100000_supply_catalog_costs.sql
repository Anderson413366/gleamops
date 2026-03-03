-- ============================================================================
-- Populate unit_cost for supply_catalog items
-- All 64 items currently have NULL unit_cost, making the Supply Calculator
-- catalog import feature produce $0 estimates.
-- Costs are based on typical B2B janitorial supply pricing.
-- ============================================================================
SET search_path TO 'public';

-- Update all supply_catalog items with reasonable unit costs by category
-- Paper products
UPDATE supply_catalog SET unit_cost = 58.50 WHERE name ILIKE '%toilet paper%' OR name ILIKE '%tissue%bath%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 42.00 WHERE name ILIKE '%paper towel%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 28.50 WHERE name ILIKE '%facial tissue%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 35.00 WHERE name ILIKE '%napkin%' AND unit_cost IS NULL;

-- Trash bags / liners
UPDATE supply_catalog SET unit_cost = 32.00 WHERE name ILIKE '%trash bag%' OR name ILIKE '%liner%' OR name ILIKE '%garbage%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 28.00 WHERE name ILIKE '%can liner%' AND unit_cost IS NULL;

-- Cleaning chemicals
UPDATE supply_catalog SET unit_cost = 18.50 WHERE name ILIKE '%disinfect%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 14.75 WHERE name ILIKE '%all purpose%' OR name ILIKE '%apc%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 12.50 WHERE name ILIKE '%glass cleaner%' OR name ILIKE '%window cleaner%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 16.00 WHERE name ILIKE '%degreaser%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 22.00 WHERE name ILIKE '%floor cleaner%' OR name ILIKE '%floor finish%' OR name ILIKE '%stripper%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 15.00 WHERE name ILIKE '%sanitizer%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 11.00 WHERE name ILIKE '%soap%' OR name ILIKE '%hand wash%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 9.50 WHERE name ILIKE '%air freshener%' OR name ILIKE '%deodor%' AND unit_cost IS NULL;

-- Cleaning tools & equipment consumables
UPDATE supply_catalog SET unit_cost = 8.50 WHERE name ILIKE '%mop%head%' OR name ILIKE '%mop pad%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 6.75 WHERE name ILIKE '%microfiber%' OR name ILIKE '%cloth%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 4.50 WHERE name ILIKE '%sponge%' OR name ILIKE '%scrub pad%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 12.00 WHERE name ILIKE '%broom%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 15.00 WHERE name ILIKE '%vacuum bag%' OR name ILIKE '%filter%bag%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 18.00 WHERE name ILIKE '%burnish%pad%' OR name ILIKE '%floor pad%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 7.50 WHERE name ILIKE '%glove%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 5.00 WHERE name ILIKE '%dust%' AND unit_cost IS NULL;

-- Safety / PPE
UPDATE supply_catalog SET unit_cost = 24.00 WHERE name ILIKE '%mask%' OR name ILIKE '%respirator%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 8.00 WHERE name ILIKE '%goggles%' OR name ILIKE '%safety glass%' AND unit_cost IS NULL;
UPDATE supply_catalog SET unit_cost = 15.00 WHERE name ILIKE '%first aid%' AND unit_cost IS NULL;

-- Batteries and misc
UPDATE supply_catalog SET unit_cost = 12.00 WHERE name ILIKE '%batter%' AND unit_cost IS NULL;

-- Catch-all: any remaining items with NULL unit_cost get a default $10.00
UPDATE supply_catalog SET unit_cost = 10.00 WHERE unit_cost IS NULL;
