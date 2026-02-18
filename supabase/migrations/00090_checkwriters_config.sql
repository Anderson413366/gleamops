BEGIN;

CREATE TABLE IF NOT EXISTS public.checkwriters_import_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  integration_connection_id UUID NOT NULL REFERENCES public.integration_connections(id),
  profile_name TEXT NOT NULL,
  column_schema_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, integration_connection_id, profile_name)
);

CREATE TABLE IF NOT EXISTS public.checkwriters_code_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  integration_connection_id UUID NOT NULL REFERENCES public.integration_connections(id),
  internal_pay_code TEXT NOT NULL,
  det TEXT NOT NULL,
  det_code TEXT NOT NULL,
  default_rate NUMERIC(12,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, integration_connection_id, internal_pay_code),
  CONSTRAINT chk_checkwriters_code_map_det CHECK (det IN ('E','D','T'))
);

CREATE TABLE IF NOT EXISTS public.payroll_employee_external_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  integration_connection_id UUID NOT NULL REFERENCES public.integration_connections(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  external_employee_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, integration_connection_id, staff_id),
  UNIQUE (tenant_id, integration_connection_id, external_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_checkwriters_profiles_tenant_active
  ON public.checkwriters_import_profiles(tenant_id, integration_connection_id, is_active)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_checkwriters_code_map_tenant
  ON public.checkwriters_code_map(tenant_id, integration_connection_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_employee_external_ids_tenant
  ON public.payroll_employee_external_ids(tenant_id, integration_connection_id)
  WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_checkwriters_import_profiles_updated_at ON public.checkwriters_import_profiles;
CREATE TRIGGER trg_checkwriters_import_profiles_updated_at
  BEFORE UPDATE ON public.checkwriters_import_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_checkwriters_import_profiles_etag ON public.checkwriters_import_profiles;
CREATE TRIGGER trg_checkwriters_import_profiles_etag
  BEFORE UPDATE ON public.checkwriters_import_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_checkwriters_code_map_updated_at ON public.checkwriters_code_map;
CREATE TRIGGER trg_checkwriters_code_map_updated_at
  BEFORE UPDATE ON public.checkwriters_code_map
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_checkwriters_code_map_etag ON public.checkwriters_code_map;
CREATE TRIGGER trg_checkwriters_code_map_etag
  BEFORE UPDATE ON public.checkwriters_code_map
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_payroll_employee_external_ids_updated_at ON public.payroll_employee_external_ids;
CREATE TRIGGER trg_payroll_employee_external_ids_updated_at
  BEFORE UPDATE ON public.payroll_employee_external_ids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_employee_external_ids_etag ON public.payroll_employee_external_ids;
CREATE TRIGGER trg_payroll_employee_external_ids_etag
  BEFORE UPDATE ON public.payroll_employee_external_ids
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

ALTER TABLE public.checkwriters_import_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkwriters_code_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_employee_external_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkwriters_import_profiles_select ON public.checkwriters_import_profiles;
CREATE POLICY checkwriters_import_profiles_select ON public.checkwriters_import_profiles
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS checkwriters_import_profiles_write ON public.checkwriters_import_profiles;
CREATE POLICY checkwriters_import_profiles_write ON public.checkwriters_import_profiles
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS checkwriters_code_map_select ON public.checkwriters_code_map;
CREATE POLICY checkwriters_code_map_select ON public.checkwriters_code_map
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS checkwriters_code_map_write ON public.checkwriters_code_map;
CREATE POLICY checkwriters_code_map_write ON public.checkwriters_code_map
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS payroll_employee_external_ids_select ON public.payroll_employee_external_ids;
CREATE POLICY payroll_employee_external_ids_select ON public.payroll_employee_external_ids
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS payroll_employee_external_ids_write ON public.payroll_employee_external_ids;
CREATE POLICY payroll_employee_external_ids_write ON public.payroll_employee_external_ids
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

COMMIT;
