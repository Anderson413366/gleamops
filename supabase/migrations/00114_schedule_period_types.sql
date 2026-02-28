-- ============================================================================
-- Migration 00114: Schedule Period Types + Payroll Anchor
-- Purpose: Add configurable period types (WEEKLY/BIWEEKLY/MONTHLY) and
-- payroll anchor date for biweekly alignment to schedule_periods.
-- ============================================================================

-- Add period_type and payroll_anchor_date to schedule_periods
ALTER TABLE public.schedule_periods
  ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS payroll_anchor_date DATE;

-- Add constraint for valid period types
ALTER TABLE public.schedule_periods
  ADD CONSTRAINT chk_schedule_periods_period_type
  CHECK (period_type IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY'));

COMMENT ON COLUMN public.schedule_periods.period_type IS
  'Period type: WEEKLY (7 days), BIWEEKLY (14 days), MONTHLY (calendar month)';
COMMENT ON COLUMN public.schedule_periods.payroll_anchor_date IS
  'Anchor date for BIWEEKLY periods to ensure alignment with payroll cycles';

-- ============================================================================
-- Tenant Schedule Settings — tenant-level schedule configuration defaults
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_schedule_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  default_period_type   TEXT NOT NULL DEFAULT 'WEEKLY',
  payroll_anchor_date   DATE,
  default_horizon       TEXT NOT NULL DEFAULT '2w',
  max_daily_hours       NUMERIC(5,2) DEFAULT 12,
  max_weekly_hours      NUMERIC(5,2) DEFAULT 40,
  max_monthly_hours     NUMERIC(6,2) DEFAULT 176,
  min_rest_hours        NUMERIC(4,2) DEFAULT 8,
  overtime_threshold    NUMERIC(5,2) DEFAULT 40,
  overtime_multiplier   NUMERIC(3,2) DEFAULT 1.5,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  version_etag          UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_tenant_schedule_default_period_type
    CHECK (default_period_type IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY')),
  CONSTRAINT chk_tenant_schedule_default_horizon
    CHECK (default_horizon IN ('1w', '2w', '4w', '1m'))
);

ALTER TABLE public.tenant_schedule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.tenant_schedule_settings
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_schedule_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.tenant_schedule_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMENT ON TABLE public.tenant_schedule_settings IS
  'Per-tenant schedule configuration: period type, hours limits, overtime rules.';
