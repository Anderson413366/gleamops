-- Migration 00074: Add barcode column to supply_catalog for UPC/EAN scanning.

ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_supply_catalog_barcode
  ON supply_catalog(barcode) WHERE barcode IS NOT NULL;
