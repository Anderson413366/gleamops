-- Add unit_cost to supply_catalog for cost tracking
ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS unit_cost NUMERIC;
