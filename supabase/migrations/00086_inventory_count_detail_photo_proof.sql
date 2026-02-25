BEGIN;

ALTER TABLE public.inventory_count_details
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}'::TEXT[];

UPDATE public.inventory_count_details
SET photo_urls = '{}'::TEXT[]
WHERE photo_urls IS NULL;

ALTER TABLE public.inventory_count_details
  ALTER COLUMN photo_urls SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN photo_urls SET NOT NULL;

COMMIT;
