-- 00056_proposal_studio_v2.sql
-- Adds layout_config JSONB column to sales_proposals for per-proposal PDF layout customization.
-- Storage RLS policies for the documents bucket are tenant-scoped.

-- ---------------------------------------------------------------------------
-- 1. Add layout_config column
-- ---------------------------------------------------------------------------
ALTER TABLE sales_proposals
  ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT NULL;

COMMENT ON COLUMN sales_proposals.layout_config IS
  'Per-proposal PDF layout configuration: section ordering, visibility, page breaks, signature placement, attachment mode.';

-- ---------------------------------------------------------------------------
-- 2. Storage RLS policies for "documents" bucket (tenant-scoped)
--    NOTE: If the migration role does not have permission to alter
--    storage.objects policies, configure these via Supabase Dashboard:
--      Storage → documents → Policies
-- ---------------------------------------------------------------------------

-- Allow authenticated users to upload files scoped to their tenant
CREATE POLICY IF NOT EXISTS "tenant_upload_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

-- Allow authenticated users to read their tenant's files
CREATE POLICY IF NOT EXISTS "tenant_read_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

-- Allow authenticated users to delete their tenant's files
CREATE POLICY IF NOT EXISTS "tenant_delete_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );
