-- =================================================================
-- Migration 00044: File Storage Hardening
--
-- D1. Create/harden storage buckets with size + MIME limits
-- D2. Add RLS policies on storage.objects for tenant isolation
--
-- Note: Bucket creation uses Supabase storage admin API.
-- These SQL statements work with Supabase's storage schema.
-- =================================================================

BEGIN;

-- =====================================================================
-- D1. Create storage buckets with restrictions
-- =====================================================================

-- Create 'documents' bucket (private, 10MB, PDF/image types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Harden 'staff-photos' bucket (5MB, image types only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-photos',
  'staff-photos',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =====================================================================
-- D2. RLS policies on storage.objects
-- Tenant members can read/write their own bucket paths
-- =====================================================================

-- Enable RLS on storage.objects (may already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Documents bucket: tenant members can read
CREATE POLICY storage_documents_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Documents bucket: tenant members can insert
CREATE POLICY storage_documents_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Documents bucket: tenant members can update their files
CREATE POLICY storage_documents_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Documents bucket: tenant members can delete their files
CREATE POLICY storage_documents_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Staff photos bucket: anyone can read (public bucket)
CREATE POLICY storage_staff_photos_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'staff-photos');

-- Staff photos bucket: tenant members can upload
CREATE POLICY storage_staff_photos_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'staff-photos'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Staff photos bucket: tenant members can update
CREATE POLICY storage_staff_photos_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'staff-photos'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );

-- Staff photos bucket: tenant members can delete
CREATE POLICY storage_staff_photos_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'staff-photos'
    AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')
  );


COMMIT;
