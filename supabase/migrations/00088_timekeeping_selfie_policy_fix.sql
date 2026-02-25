-- 00088_timekeeping_selfie_policy_fix.sql
-- Fix selfie storage RLS by resolving tenant via linked staff.user_id instead of JWT tenant claim.

BEGIN;

DROP POLICY IF EXISTS "tenant_upload_time_verification_selfies" ON storage.objects;
DROP POLICY IF EXISTS "tenant_read_time_verification_selfies" ON storage.objects;
DROP POLICY IF EXISTS "tenant_delete_time_verification_selfies" ON storage.objects;

CREATE POLICY "tenant_upload_time_verification_selfies"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'time-verification-selfies'
    AND (storage.foldername(name))[1] = 'timekeeping'
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.user_id = auth.uid()
        AND s.archived_at IS NULL
        AND s.tenant_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "tenant_read_time_verification_selfies"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'time-verification-selfies'
    AND (storage.foldername(name))[1] = 'timekeeping'
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.user_id = auth.uid()
        AND s.archived_at IS NULL
        AND s.tenant_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "tenant_delete_time_verification_selfies"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'time-verification-selfies'
    AND (storage.foldername(name))[1] = 'timekeeping'
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.user_id = auth.uid()
        AND s.archived_at IS NULL
        AND s.tenant_id::text = (storage.foldername(name))[2]
    )
  );

COMMIT;
