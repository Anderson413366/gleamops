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


-- D2. Storage RLS policies on storage.objects
-- NOTE: These must be applied via the Supabase Dashboard or supabase CLI
-- because the migration role cannot ALTER storage.objects directly.
-- Storage bucket policies can be configured in the Supabase Dashboard
-- under Storage → Policies.


COMMIT;
