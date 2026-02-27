BEGIN;

-- ============================================================================
-- 00092_shifts_time_site_books.sql
-- Site-specific instructions and multilingual checklist templates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  site_id UUID NOT NULL REFERENCES public.sites(id),
  instructions_en TEXT,
  instructions_es TEXT,
  instructions_pt_br TEXT,
  access_notes_en TEXT,
  access_notes_es TEXT,
  access_notes_pt_br TEXT,
  sensitive_site BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive_site_type TEXT,
  hipaa_awareness_required BOOLEAN NOT NULL DEFAULT FALSE,
  hipaa_acknowledgment_required BOOLEAN NOT NULL DEFAULT FALSE,
  vault_ref TEXT,
  client_contact_name TEXT,
  client_contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_site_books_sensitive_type CHECK (
    sensitive_site_type IS NULL
    OR sensitive_site_type IN ('HEALTHCARE','GOVERNMENT','LEGAL','RESIDENTIAL','OTHER')
  ),
  UNIQUE (tenant_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_site_books_tenant_site
  ON public.site_books(tenant_id, site_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_books_tenant_sensitive
  ON public.site_books(tenant_id, sensitive_site)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.site_book_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  site_book_id UUID NOT NULL REFERENCES public.site_books(id),
  sort_order INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_es TEXT,
  label_pt_br TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT chk_site_book_checklist_items_sort CHECK (sort_order >= 1),
  UNIQUE (site_book_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_site_book_checklist_items_tenant_book_order
  ON public.site_book_checklist_items(tenant_id, site_book_id, sort_order)
  WHERE archived_at IS NULL;

ALTER TABLE public.site_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_book_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_books_tenant_select ON public.site_books;
CREATE POLICY site_books_tenant_select
  ON public.site_books
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS site_books_tenant_insert ON public.site_books;
CREATE POLICY site_books_tenant_insert
  ON public.site_books
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS site_books_tenant_update ON public.site_books;
CREATE POLICY site_books_tenant_update
  ON public.site_books
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS site_book_checklist_items_tenant_select ON public.site_book_checklist_items;
CREATE POLICY site_book_checklist_items_tenant_select
  ON public.site_book_checklist_items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS site_book_checklist_items_tenant_insert ON public.site_book_checklist_items;
CREATE POLICY site_book_checklist_items_tenant_insert
  ON public.site_book_checklist_items
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS site_book_checklist_items_tenant_update ON public.site_book_checklist_items;
CREATE POLICY site_book_checklist_items_tenant_update
  ON public.site_book_checklist_items
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_site_books_updated_at ON public.site_books;
CREATE TRIGGER trg_site_books_updated_at
  BEFORE UPDATE ON public.site_books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_site_books_etag ON public.site_books;
CREATE TRIGGER trg_site_books_etag
  BEFORE UPDATE ON public.site_books
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DROP TRIGGER IF EXISTS trg_site_book_checklist_items_updated_at ON public.site_book_checklist_items;
CREATE TRIGGER trg_site_book_checklist_items_updated_at
  BEFORE UPDATE ON public.site_book_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_site_book_checklist_items_etag ON public.site_book_checklist_items;
CREATE TRIGGER trg_site_book_checklist_items_etag
  BEFORE UPDATE ON public.site_book_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'prevent_hard_delete'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS no_hard_delete ON public.site_books;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.site_books
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

    DROP TRIGGER IF EXISTS no_hard_delete ON public.site_book_checklist_items;
    CREATE TRIGGER no_hard_delete
      BEFORE DELETE ON public.site_book_checklist_items
      FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
