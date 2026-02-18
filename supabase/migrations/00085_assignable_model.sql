BEGIN;

ALTER TABLE public.ticket_assignments
  ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES public.subcontractors(id);

ALTER TABLE public.ticket_assignments
  ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE public.ticket_assignments
  DROP CONSTRAINT IF EXISTS chk_ticket_assignments_assignee_xor;

ALTER TABLE public.ticket_assignments
  ADD CONSTRAINT chk_ticket_assignments_assignee_xor
  CHECK (
    (staff_id IS NOT NULL AND subcontractor_id IS NULL)
    OR
    (staff_id IS NULL AND subcontractor_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_subcontractor
  ON public.ticket_assignments(subcontractor_id)
  WHERE archived_at IS NULL AND subcontractor_id IS NOT NULL;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS default_capacity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.subcontractors
  DROP CONSTRAINT IF EXISTS chk_subcontractors_default_capacity;

ALTER TABLE public.subcontractors
  ADD CONSTRAINT chk_subcontractors_default_capacity
  CHECK (default_capacity >= 1);

CREATE OR REPLACE VIEW public.v_assignables AS
SELECT
  s.tenant_id,
  'staff'::TEXT AS assignable_type,
  s.id AS assignable_id,
  COALESCE(s.full_name, s.staff_code) AS display_name,
  s.staff_code AS reference_code
FROM public.staff s
WHERE s.archived_at IS NULL

UNION ALL

SELECT
  sub.tenant_id,
  'subcontractor'::TEXT AS assignable_type,
  sub.id AS assignable_id,
  sub.company_name AS display_name,
  sub.subcontractor_code AS reference_code
FROM public.subcontractors sub
WHERE sub.archived_at IS NULL;

GRANT SELECT ON public.v_assignables TO authenticated;

COMMIT;
