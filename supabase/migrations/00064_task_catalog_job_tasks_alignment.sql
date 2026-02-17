BEGIN;

-- ---------------------------------------------------------------------------
-- Task catalog compatibility columns (code/priority/instructions)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT;

UPDATE public.tasks
SET
  code = COALESCE(code, task_code),
  priority = COALESCE(
    priority,
    CASE UPPER(COALESCE(priority_level, 'MEDIUM'))
      WHEN 'CRITICAL' THEN 'high'
      WHEN 'HIGH' THEN 'high'
      WHEN 'LOW' THEN 'low'
      ELSE 'medium'
    END
  ),
  instructions = COALESCE(instructions, work_description, description)
WHERE code IS NULL
   OR priority IS NULL
   OR instructions IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN priority SET DEFAULT 'medium';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_tasks_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_tasks_code_unique ON public.tasks(code);
  END IF;
END$$;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_priority_compat;
ALTER TABLE public.tasks
  ADD CONSTRAINT chk_tasks_priority_compat
  CHECK (priority IN ('high', 'medium', 'low'));

CREATE OR REPLACE FUNCTION public.sync_tasks_compat_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.code := COALESCE(NEW.code, NEW.task_code);
  NEW.task_code := COALESCE(NEW.task_code, NEW.code);

  IF NEW.priority IS NULL THEN
    NEW.priority := CASE UPPER(COALESCE(NEW.priority_level, 'MEDIUM'))
      WHEN 'CRITICAL' THEN 'high'
      WHEN 'HIGH' THEN 'high'
      WHEN 'LOW' THEN 'low'
      ELSE 'medium'
    END;
  END IF;

  IF NEW.priority_level IS NULL THEN
    NEW.priority_level := UPPER(NEW.priority);
  END IF;

  IF NEW.instructions IS NULL THEN
    NEW.instructions := COALESCE(NEW.work_description, NEW.description);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_sync_compat_fields ON public.tasks;
CREATE TRIGGER trg_tasks_sync_compat_fields
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_tasks_compat_fields();

-- ---------------------------------------------------------------------------
-- job_tasks scope-of-work alignment: custom minutes + ordering guarantees
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_tasks
  ADD COLUMN IF NOT EXISTS custom_minutes NUMERIC(8,2);

UPDATE public.job_tasks
SET custom_minutes = COALESCE(custom_minutes, estimated_minutes, planned_minutes::NUMERIC)
WHERE custom_minutes IS NULL;

ALTER TABLE public.job_tasks DROP CONSTRAINT IF EXISTS chk_job_tasks_minutes_nonnegative;
ALTER TABLE public.job_tasks
  ADD CONSTRAINT chk_job_tasks_minutes_nonnegative
  CHECK (
    (custom_minutes IS NULL OR custom_minutes >= 0)
    AND (estimated_minutes IS NULL OR estimated_minutes >= 0)
    AND (planned_minutes IS NULL OR planned_minutes >= 0)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_job_tasks_job_sequence_active_uniq'
  ) THEN
    CREATE UNIQUE INDEX idx_job_tasks_job_sequence_active_uniq
      ON public.job_tasks(job_id, sequence_order)
      WHERE archived_at IS NULL;
  END IF;
END$$;

COMMIT;
