-- 00087_timekeeping_selfie_storage.sql
-- Ensure selfie evidence storage exists for timekeeping check-in/out verification.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-verification-selfies',
  'time-verification-selfies',
  false,
  8388608, -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'tenant_upload_time_verification_selfies'
  ) THEN
    CREATE POLICY "tenant_upload_time_verification_selfies"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'time-verification-selfies'
        AND (storage.foldername(name))[1] = 'timekeeping'
        AND (storage.foldername(name))[2] = (auth.jwt() ->> 'tenant_id')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'tenant_read_time_verification_selfies'
  ) THEN
    CREATE POLICY "tenant_read_time_verification_selfies"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'time-verification-selfies'
        AND (storage.foldername(name))[1] = 'timekeeping'
        AND (storage.foldername(name))[2] = (auth.jwt() ->> 'tenant_id')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'tenant_delete_time_verification_selfies'
  ) THEN
    CREATE POLICY "tenant_delete_time_verification_selfies"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'time-verification-selfies'
        AND (storage.foldername(name))[1] = 'timekeeping'
        AND (storage.foldername(name))[2] = (auth.jwt() ->> 'tenant_id')
      );
  END IF;
END;
$$;

COMMIT;
