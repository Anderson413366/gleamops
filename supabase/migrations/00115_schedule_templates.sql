-- ============================================================================
-- Migration 00115: Schedule Templates
-- Purpose: Store reusable schedule patterns that can be applied to date ranges.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  template_name   TEXT NOT NULL,
  site_id         UUID REFERENCES public.sites(id),
  template_data   JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  archived_by     UUID,
  archive_reason  TEXT,
  version_etag    UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.schedule_templates
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.schedule_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_version_etag BEFORE UPDATE ON public.schedule_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMENT ON TABLE public.schedule_templates IS
  'Reusable schedule templates. template_data is a JSONB array of { position_code, weekday, start_time, end_time, required_staff }.';
COMMENT ON COLUMN public.schedule_templates.template_data IS
  'Array of shift patterns: [{ "position_code": "FLOOR_SPECIALIST", "weekday": 1, "start_time": "18:00", "end_time": "22:00", "required_staff": 1 }]';
