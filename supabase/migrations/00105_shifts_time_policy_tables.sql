BEGIN;

-- ============================================================================
-- 00094_shifts_time_policy_tables.sql
-- Attendance/call-out policy controls and holiday multiplier calendar.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  policy_name TEXT NOT NULL,
  rolling_window_days INTEGER NOT NULL DEFAULT 30,
  first_callout_action TEXT NOT NULL DEFAULT 'DOCUMENT_ONLY',
  second_callout_action TEXT NOT NULL DEFAULT 'VERBAL_WARNING',
  third_callout_action TEXT NOT NULL DEFAULT 'WRITTEN_WARNING',
  no_show_action TEXT NOT NULL DEFAULT 'WRITTEN_WARNING',
  no_show_cutoff_minutes INTEGER NOT NULL DEFAULT 0,
  auto_enforce BOOLEAN NOT NULL DEFAULT TRUE,
  on_call_standby_fee NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  coverage_response_minutes INTEGER NOT NULL DEFAULT 30,
  escalation_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_attendance_policies_window CHECK (rolling_window_days BETWEEN 1 AND 365),
  CONSTRAINT chk_attendance_policies_action_1 CHECK (
    first_callout_action IN ('NONE','DOCUMENT_ONLY','VERBAL_WARNING','WRITTEN_WARNING')
  ),
  CONSTRAINT chk_attendance_policies_action_2 CHECK (
    second_callout_action IN ('NONE','DOCUMENT_ONLY','VERBAL_WARNING','WRITTEN_WARNING')
  ),
  CONSTRAINT chk_attendance_policies_action_3 CHECK (
    third_callout_action IN ('NONE','DOCUMENT_ONLY','VERBAL_WARNING','WRITTEN_WARNING')
  ),
  CONSTRAINT chk_attendance_policies_action_no_show CHECK (
    no_show_action IN ('NONE','DOCUMENT_ONLY','VERBAL_WARNING','WRITTEN_WARNING')
  ),
  CONSTRAINT chk_attendance_policies_no_show_cutoff CHECK (no_show_cutoff_minutes >= 0),
  CONSTRAINT chk_attendance_policies_fees CHECK (on_call_standby_fee >= 0),
  CONSTRAINT chk_attendance_policies_response_minutes CHECK (coverage_response_minutes BETWEEN 1 AND 360),
  CONSTRAINT chk_attendance_policies_escalation_minutes CHECK (escalation_minutes BETWEEN 1 AND 1440),
  UNIQUE (tenant_id, policy_name)
);

CREATE INDEX IF NOT EXISTS idx_attendance_policies_tenant_active
  ON public.attendance_policies(tenant_id, is_active)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.holiday_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  holiday_date DATE NOT NULL,
  observed_date DATE,
  holiday_name TEXT NOT NULL,
  holiday_scope TEXT NOT NULL DEFAULT 'FEDERAL_MAJOR',
  pay_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.500,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_holiday_calendar_scope CHECK (
    holiday_scope IN ('FEDERAL_MAJOR','COMPANY_OBSERVED','TENANT_CUSTOM')
  ),
  CONSTRAINT chk_holiday_calendar_multiplier CHECK (pay_multiplier >= 1.000),
  UNIQUE (tenant_id, holiday_date, holiday_name)
);

CREATE INDEX IF NOT EXISTS idx_holiday_calendar_tenant_date
  ON public.holiday_calendar(tenant_id, holiday_date)
  WHERE archived_at IS NULL;

ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_policies_tenant_select ON public.attendance_policies;
CREATE POLICY attendance_policies_tenant_select
  ON public.attendance_policies
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS attendance_policies_tenant_insert ON public.attendance_policies;
CREATE POLICY attendance_policies_tenant_insert
  ON public.attendance_policies
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS attendance_policies_tenant_update ON public.attendance_policies;
CREATE POLICY attendance_policies_tenant_update
  ON public.attendance_policies
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS holiday_calendar_tenant_select ON public.holiday_calendar;
CREATE POLICY holiday_calendar_tenant_select
  ON public.holiday_calendar
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS holiday_calendar_tenant_insert ON public.holiday_calendar;
CREATE POLICY holiday_calendar_tenant_insert
  ON public.holiday_calendar
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS holiday_calendar_tenant_update ON public.holiday_calendar;
CREATE POLICY holiday_calendar_tenant_update
  ON public.holiday_calendar
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_attendance_policies_updated_at ON public.attendance_policies;
CREATE TRIGGER trg_attendance_policies_updated_at
  BEFORE UPDATE ON public.attendance_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_policies_etag ON public.attendance_policies;
CREATE TRIGGER trg_attendance_policies_etag
  BEFORE UPDATE ON public.attendance_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_holiday_calendar_updated_at ON public.holiday_calendar;
CREATE TRIGGER trg_holiday_calendar_updated_at
  BEFORE UPDATE ON public.holiday_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_holiday_calendar_etag ON public.holiday_calendar;
CREATE TRIGGER trg_holiday_calendar_etag
  BEFORE UPDATE ON public.holiday_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'prevent_hard_delete'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS no_hard_delete ON public.attendance_policies;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.attendance_policies
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.holiday_calendar;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.holiday_calendar
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
