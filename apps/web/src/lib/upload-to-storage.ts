import type { SupabaseClient } from '@supabase/supabase-js';

function generateFileCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FIL-${ts}${rand}`;
}

/**
 * Upload a file to Supabase Storage and create a `files` metadata record.
 */
export async function uploadToStorage(params: {
  supabase: SupabaseClient;
  bucket: string;
  path: string;
  file: File;
  tenantId: string;
  entityType: string;
  entityId: string;
}): Promise<{ fileId: string; fileCode: string; storagePath: string }> {
  const { supabase, bucket, path, file, tenantId, entityType, entityId } = params;

  // Upload to storage
  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // Create file metadata record
  const fileCode = generateFileCode();
  const { data: fileRecord, error: fileErr } = await supabase
    .from('files')
    .insert({
      tenant_id: tenantId,
      file_code: fileCode,
      entity_type: entityType,
      entity_id: entityId,
      bucket,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id, file_code')
    .single();

  if (fileErr || !fileRecord) {
    // Clean up storage on metadata failure
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(`File record creation failed: ${fileErr?.message ?? 'Unknown error'}`);
  }

  return {
    fileId: fileRecord.id,
    fileCode: fileRecord.file_code,
    storagePath: path,
  };
}
