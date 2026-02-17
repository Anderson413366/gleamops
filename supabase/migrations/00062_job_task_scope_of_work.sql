BEGIN;

-- ---------------------------------------------------------------------------
-- Job task scope-of-work alignment for detail page and task management UI
-- ---------------------------------------------------------------------------

ALTER TABLE public.job_tasks
  ADD COLUMN IF NOT EXISTS sequence_order INTEGER,
  ADD COLUMN IF NOT EXISTS wait_after BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_minutes NUMERIC(8,2);

-- Backfill sequence ordering within each job.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY job_id
    ORDER BY COALESCE(sequence_order, 2147483647), created_at, id
  ) AS seq
  FROM public.job_tasks
)
UPDATE public.job_tasks jt
SET sequence_order = ordered.seq
FROM ordered
WHERE ordered.id = jt.id
  AND (jt.sequence_order IS NULL OR jt.sequence_order < 1);

UPDATE public.job_tasks
SET estimated_minutes = COALESCE(estimated_minutes, planned_minutes::NUMERIC)
WHERE estimated_minutes IS NULL;

UPDATE public.job_tasks
SET planned_minutes = COALESCE(planned_minutes, ROUND(estimated_minutes)::INTEGER)
WHERE planned_minutes IS NULL
  AND estimated_minutes IS NOT NULL;

UPDATE public.job_tasks
SET wait_after = false
WHERE wait_after IS NULL;

ALTER TABLE public.job_tasks
  ALTER COLUMN sequence_order SET DEFAULT 1,
  ALTER COLUMN sequence_order SET NOT NULL,
  ALTER COLUMN wait_after SET DEFAULT false,
  ALTER COLUMN wait_after SET NOT NULL;

ALTER TABLE public.job_tasks DROP CONSTRAINT IF EXISTS chk_job_tasks_minutes_nonnegative;
ALTER TABLE public.job_tasks
  ADD CONSTRAINT chk_job_tasks_minutes_nonnegative
  CHECK (
    (estimated_minutes IS NULL OR estimated_minutes >= 0)
    AND (planned_minutes IS NULL OR planned_minutes >= 0)
  );

CREATE INDEX IF NOT EXISTS idx_job_tasks_job_sequence
  ON public.job_tasks(job_id, sequence_order)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Task catalog compatibility fields for legacy scope-of-work patterns
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS production_rate TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.tasks
SET status = CASE
  WHEN COALESCE(is_active, true) THEN 'ACTIVE'
  ELSE 'INACTIVE'
END
WHERE status IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_status;
ALTER TABLE public.tasks
  ADD CONSTRAINT chk_tasks_status
  CHECK (status IN ('ACTIVE', 'INACTIVE'));

COMMIT;
