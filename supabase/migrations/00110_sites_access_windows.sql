BEGIN;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS access_window_start TIME,
  ADD COLUMN IF NOT EXISTS access_window_end TIME;

ALTER TABLE public.sites
  DROP CONSTRAINT IF EXISTS chk_sites_access_window;

ALTER TABLE public.sites
  ADD CONSTRAINT chk_sites_access_window
  CHECK (
    access_window_start IS NULL
    OR access_window_end IS NULL
    OR access_window_start <= access_window_end
  );

CREATE INDEX IF NOT EXISTS idx_sites_tenant_access_window
  ON public.sites (tenant_id, access_window_start, access_window_end)
  WHERE archived_at IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
