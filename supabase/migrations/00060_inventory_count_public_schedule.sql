BEGIN;

-- ---------------------------------------------------------------------------
-- Inventory count public form + scheduling support
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_counts
  ADD COLUMN IF NOT EXISTS public_token TEXT,
  ADD COLUMN IF NOT EXISTS counted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_inventory_counts_public_token'
  ) THEN
    CREATE UNIQUE INDEX idx_inventory_counts_public_token
      ON public.inventory_counts(public_token)
      WHERE public_token IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.inventory_counts DROP CONSTRAINT IF EXISTS chk_inventory_counts_status;
ALTER TABLE public.inventory_counts
  ADD CONSTRAINT chk_inventory_counts_status
  CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE public.inventory_count_details
  ALTER COLUMN actual_qty DROP NOT NULL,
  ALTER COLUMN actual_qty DROP DEFAULT;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS inventory_frequency TEXT DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS last_count_date DATE,
  ADD COLUMN IF NOT EXISTS next_count_due DATE,
  ADD COLUMN IF NOT EXISTS count_status_alert TEXT;

UPDATE public.sites
SET inventory_frequency = 'MONTHLY'
WHERE inventory_frequency IS NULL;

WITH latest_counts AS (
  SELECT
    site_id,
    MAX(count_date) AS latest_count_date
  FROM public.inventory_counts
  WHERE archived_at IS NULL
    AND status IN ('SUBMITTED', 'COMPLETED')
    AND site_id IS NOT NULL
  GROUP BY site_id
)
UPDATE public.sites s
SET last_count_date = lc.latest_count_date
FROM latest_counts lc
WHERE s.id = lc.site_id
  AND s.last_count_date IS NULL;

UPDATE public.sites
SET next_count_due = CASE inventory_frequency
  WHEN 'WEEKLY' THEN last_count_date + INTERVAL '7 days'
  WHEN 'BIWEEKLY' THEN last_count_date + INTERVAL '14 days'
  WHEN 'QUARTERLY' THEN last_count_date + INTERVAL '3 months'
  ELSE last_count_date + INTERVAL '1 month'
END
WHERE last_count_date IS NOT NULL
  AND next_count_due IS NULL;

ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS chk_sites_inventory_frequency;
ALTER TABLE public.sites
  ADD CONSTRAINT chk_sites_inventory_frequency
  CHECK (inventory_frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'));

CREATE INDEX IF NOT EXISTS idx_sites_next_count_due
  ON public.sites(next_count_due)
  WHERE archived_at IS NULL;

COMMIT;
