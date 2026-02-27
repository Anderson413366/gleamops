BEGIN;

ALTER TABLE public.sites
  DROP CONSTRAINT IF EXISTS chk_sites_access_window;

-- Allow overnight windows (for example 22:00 -> 02:00).
-- Enforce that values are provided as a pair or both null.
ALTER TABLE public.sites
  ADD CONSTRAINT chk_sites_access_window
  CHECK (
    (access_window_start IS NULL AND access_window_end IS NULL)
    OR (access_window_start IS NOT NULL AND access_window_end IS NOT NULL)
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
