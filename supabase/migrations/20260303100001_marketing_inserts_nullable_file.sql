-- ============================================================================
-- Make file_id nullable on sales_marketing_inserts
-- The form has no file upload yet (noted as future enhancement).
-- The NOT NULL + FK constraint blocks all inserts.
-- ============================================================================
SET search_path TO 'public';

ALTER TABLE sales_marketing_inserts
  ALTER COLUMN file_id DROP NOT NULL;
