-- ============================================================================
-- Migration 00113: Staff Eligible Positions
-- Purpose: Join table tracking which position types each staff member is
-- qualified/eligible for. Used for DnD validation and auto-fill in scheduling.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_eligible_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  staff_id        UUID NOT NULL REFERENCES public.staff(id),
  position_code   TEXT NOT NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  certified_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  archived_by     UUID,
  archive_reason  TEXT,
  version_etag    UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, staff_id, position_code)
);

ALTER TABLE public.staff_eligible_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.staff_eligible_positions
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_eligible_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.staff_eligible_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_staff_eligible_positions_staff
  ON public.staff_eligible_positions(staff_id) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_eligible_positions_position
  ON public.staff_eligible_positions(position_code) WHERE archived_at IS NULL;

COMMENT ON TABLE public.staff_eligible_positions IS
  'Tracks position eligibility per staff member. Used for schedule DnD validation and auto-fill.';
