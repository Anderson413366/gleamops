BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  rule_type TEXT NOT NULL,
  availability_type TEXT NOT NULL,
  weekday INTEGER,
  start_time TIME,
  end_time TIME,
  one_off_start TIMESTAMPTZ,
  one_off_end TIMESTAMPTZ,
  valid_from DATE,
  valid_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_staff_availability_rule_type CHECK (rule_type IN ('WEEKLY_RECURRING','ONE_OFF')),
  CONSTRAINT chk_staff_availability_type CHECK (availability_type IN ('AVAILABLE','UNAVAILABLE','PREFERRED')),
  CONSTRAINT chk_staff_availability_weekday CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6),
  CONSTRAINT chk_staff_availability_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_staff_availability_rules_tenant_staff
  ON public.staff_availability_rules(tenant_id, staff_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_availability_rules_type
  ON public.staff_availability_rules(tenant_id, rule_type, availability_type)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_staff_availability_rules_updated_at ON public.staff_availability_rules;
CREATE TRIGGER trg_staff_availability_rules_updated_at
  BEFORE UPDATE ON public.staff_availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_availability_rules_etag ON public.staff_availability_rules;
CREATE TRIGGER trg_staff_availability_rules_etag
  BEFORE UPDATE ON public.staff_availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS no_hard_delete ON public.staff_availability_rules;
CREATE TRIGGER no_hard_delete
  BEFORE DELETE ON public.staff_availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

COMMIT;
