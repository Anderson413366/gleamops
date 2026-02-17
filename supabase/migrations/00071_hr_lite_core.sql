BEGIN;

CREATE TABLE IF NOT EXISTS public.hr_pto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC(8,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_hr_pto_requests_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_hr_pto_requests_hours CHECK (hours_requested >= 0),
  CONSTRAINT chk_hr_pto_requests_status CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELED'))
);
CREATE INDEX IF NOT EXISTS idx_hr_pto_requests_tenant_status ON public.hr_pto_requests(tenant_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hr_pto_requests_staff ON public.hr_pto_requests(staff_id, start_date DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  reviewer_staff_id UUID REFERENCES public.staff(id),
  review_period_start DATE,
  review_period_end DATE,
  overall_score NUMERIC(4,2),
  summary TEXT,
  strengths TEXT,
  development_areas TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  reviewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_hr_performance_reviews_score CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 5)),
  CONSTRAINT chk_hr_performance_reviews_status CHECK (status IN ('DRAFT','SUBMITTED','ACKNOWLEDGED','CLOSED'))
);
CREATE INDEX IF NOT EXISTS idx_hr_performance_reviews_tenant_status ON public.hr_performance_reviews(tenant_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hr_performance_reviews_staff ON public.hr_performance_reviews(staff_id, reviewed_at DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by_user_id UUID,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_hr_goals_status CHECK (status IN ('ACTIVE','ON_TRACK','AT_RISK','COMPLETED','CANCELED')),
  CONSTRAINT chk_hr_goals_progress CHECK (progress_pct >= 0 AND progress_pct <= 100)
);
CREATE INDEX IF NOT EXISTS idx_hr_goals_tenant_status ON public.hr_goals(tenant_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hr_goals_staff ON public.hr_goals(staff_id, target_date) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  badge_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_hr_badges_tenant_active ON public.hr_badges(tenant_id, is_active) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_staff_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  badge_id UUID NOT NULL REFERENCES public.hr_badges(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS idx_hr_staff_badges_staff ON public.hr_staff_badges(staff_id, awarded_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hr_staff_badges_badge ON public.hr_staff_badges(badge_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.hr_staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  file_id UUID NOT NULL REFERENCES public.files(id),
  document_type TEXT NOT NULL,
  expires_on DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_hr_staff_documents_status CHECK (status IN ('ACTIVE','EXPIRING','EXPIRED','REVOKED'))
);
CREATE INDEX IF NOT EXISTS idx_hr_staff_documents_staff ON public.hr_staff_documents(staff_id, expires_on) WHERE archived_at IS NULL;

ALTER TABLE public.hr_pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_pto_requests_select ON public.hr_pto_requests;
CREATE POLICY hr_pto_requests_select ON public.hr_pto_requests FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_pto_requests_insert ON public.hr_pto_requests;
CREATE POLICY hr_pto_requests_insert ON public.hr_pto_requests FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_pto_requests_update ON public.hr_pto_requests;
CREATE POLICY hr_pto_requests_update ON public.hr_pto_requests FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_performance_reviews_select ON public.hr_performance_reviews;
CREATE POLICY hr_performance_reviews_select ON public.hr_performance_reviews FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_performance_reviews_insert ON public.hr_performance_reviews;
CREATE POLICY hr_performance_reviews_insert ON public.hr_performance_reviews FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_performance_reviews_update ON public.hr_performance_reviews;
CREATE POLICY hr_performance_reviews_update ON public.hr_performance_reviews FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_goals_select ON public.hr_goals;
CREATE POLICY hr_goals_select ON public.hr_goals FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_goals_insert ON public.hr_goals;
CREATE POLICY hr_goals_insert ON public.hr_goals FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_goals_update ON public.hr_goals;
CREATE POLICY hr_goals_update ON public.hr_goals FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_badges_select ON public.hr_badges;
CREATE POLICY hr_badges_select ON public.hr_badges FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_badges_insert ON public.hr_badges;
CREATE POLICY hr_badges_insert ON public.hr_badges FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_badges_update ON public.hr_badges;
CREATE POLICY hr_badges_update ON public.hr_badges FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_staff_badges_select ON public.hr_staff_badges;
CREATE POLICY hr_staff_badges_select ON public.hr_staff_badges FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_staff_badges_insert ON public.hr_staff_badges;
CREATE POLICY hr_staff_badges_insert ON public.hr_staff_badges FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_staff_badges_update ON public.hr_staff_badges;
CREATE POLICY hr_staff_badges_update ON public.hr_staff_badges FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_staff_documents_select ON public.hr_staff_documents;
CREATE POLICY hr_staff_documents_select ON public.hr_staff_documents FOR SELECT USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_staff_documents_insert ON public.hr_staff_documents;
CREATE POLICY hr_staff_documents_insert ON public.hr_staff_documents FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hr_staff_documents_update ON public.hr_staff_documents;
CREATE POLICY hr_staff_documents_update ON public.hr_staff_documents FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_hr_pto_requests_updated_at ON public.hr_pto_requests;
CREATE TRIGGER trg_hr_pto_requests_updated_at BEFORE UPDATE ON public.hr_pto_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_pto_requests_etag ON public.hr_pto_requests;
CREATE TRIGGER trg_hr_pto_requests_etag BEFORE UPDATE ON public.hr_pto_requests FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_hr_performance_reviews_updated_at ON public.hr_performance_reviews;
CREATE TRIGGER trg_hr_performance_reviews_updated_at BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_performance_reviews_etag ON public.hr_performance_reviews;
CREATE TRIGGER trg_hr_performance_reviews_etag BEFORE UPDATE ON public.hr_performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_hr_goals_updated_at ON public.hr_goals;
CREATE TRIGGER trg_hr_goals_updated_at BEFORE UPDATE ON public.hr_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_goals_etag ON public.hr_goals;
CREATE TRIGGER trg_hr_goals_etag BEFORE UPDATE ON public.hr_goals FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_hr_badges_updated_at ON public.hr_badges;
CREATE TRIGGER trg_hr_badges_updated_at BEFORE UPDATE ON public.hr_badges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_badges_etag ON public.hr_badges;
CREATE TRIGGER trg_hr_badges_etag BEFORE UPDATE ON public.hr_badges FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_hr_staff_badges_updated_at ON public.hr_staff_badges;
CREATE TRIGGER trg_hr_staff_badges_updated_at BEFORE UPDATE ON public.hr_staff_badges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_staff_badges_etag ON public.hr_staff_badges;
CREATE TRIGGER trg_hr_staff_badges_etag BEFORE UPDATE ON public.hr_staff_badges FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_hr_staff_documents_updated_at ON public.hr_staff_documents;
CREATE TRIGGER trg_hr_staff_documents_updated_at BEFORE UPDATE ON public.hr_staff_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hr_staff_documents_etag ON public.hr_staff_documents;
CREATE TRIGGER trg_hr_staff_documents_etag BEFORE UPDATE ON public.hr_staff_documents FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMIT;
