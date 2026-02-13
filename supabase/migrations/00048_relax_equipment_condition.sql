-- ============================================================================
-- Migration 00048: Relax equipment condition constraint + notify PostgREST
-- Real data uses IN_SERVICE, SPARE, etc. not just GOOD/FAIR/POOR/OUT_OF_SERVICE
-- Also notify PostgREST to reload schema cache after column type changes
-- ============================================================================

-- Drop restrictive equipment condition constraint
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_condition_check;

-- Notify PostgREST to reload its schema cache (picks up qc_weight NUMERIC change)
NOTIFY pgrst, 'reload schema';
