'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/upload-to-storage';
import {
  Card, CardHeader, CardTitle, CardContent, Button, Badge, FileDropzone,
} from '@gleamops/ui';
import type { SalesProposalAttachment, FileRecord } from '@gleamops/shared';

interface AttachmentRow extends SalesProposalAttachment {
  file?: Pick<FileRecord, 'original_filename' | 'size_bytes' | 'mime_type'> | null;
}

interface AttachmentPanelProps {
  proposalId: string;
  tenantId: string;
  proposalCode: string;
  readOnly?: boolean;
}

const MAX_ATTACHMENTS = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({ proposalId, tenantId, proposalCode, readOnly }: AttachmentPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_proposal_attachments')
      .select('*, file:file_id(original_filename, size_bytes, mime_type)')
      .eq('proposal_id', proposalId)
      .order('sort_order');

    if (!error && data) {
      setAttachments(data as unknown as AttachmentRow[]);
    }
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = useCallback(async (file: File) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const uuid = crypto.randomUUID();
      const storagePath = `${tenantId}/proposals/${proposalCode}/attachments/${uuid}-${file.name}`;

      const { fileId } = await uploadToStorage({
        supabase,
        bucket: 'documents',
        path: storagePath,
        file,
        tenantId,
        entityType: 'PROPOSAL_ATTACHMENT',
        entityId: proposalId,
      });

      // Create attachment record
      const nextOrder = attachments.length;
      const { error: attErr } = await supabase
        .from('sales_proposal_attachments')
        .insert({
          tenant_id: tenantId,
          proposal_id: proposalId,
          file_id: fileId,
          sort_order: nextOrder,
          one_page_confirmed: false,
        });

      if (attErr) throw new Error(attErr.message);

      toast.success(`Attached: ${file.name}`);
      await fetchAttachments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [attachments.length, tenantId, proposalCode, proposalId, fetchAttachments]);

  const handleDelete = useCallback(async (attachment: AttachmentRow) => {
    const supabase = getSupabaseBrowserClient();

    // Delete attachment record
    const { error } = await supabase
      .from('sales_proposal_attachments')
      .delete()
      .eq('id', attachment.id);

    if (error) {
      toast.error('Failed to remove attachment');
      return;
    }

    // Delete storage object via the file's storage_path
    if (attachment.file_id) {
      const { data: fileRec } = await supabase
        .from('files')
        .select('storage_path, bucket')
        .eq('id', attachment.file_id)
        .single();

      if (fileRec) {
        await supabase.storage.from(fileRec.bucket).remove([fileRec.storage_path]);
        await supabase.from('files').delete().eq('id', attachment.file_id);
      }
    }

    toast.success('Attachment removed');
    await fetchAttachments();
  }, [fetchAttachments]);

  const handleReorder = useCallback(async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= attachments.length) return;

    const supabase = getSupabaseBrowserClient();
    const a = attachments[index];
    const b = attachments[swapIndex];

    await Promise.all([
      supabase.from('sales_proposal_attachments').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('sales_proposal_attachments').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);

    await fetchAttachments();
  }, [attachments, fetchAttachments]);

  const toggleOnePageConfirmed = useCallback(async (attachment: AttachmentRow) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('sales_proposal_attachments')
      .update({ one_page_confirmed: !attachment.one_page_confirmed })
      .eq('id', attachment.id);

    await fetchAttachments();
  }, [fetchAttachments]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Attachments
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Attachments
              {attachments.length > 0 && (
                <Badge color="gray">{attachments.length}</Badge>
              )}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {attachments.map((att, i) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {att.file?.original_filename ?? `Attachment #${i + 1}`}
                </p>
                {att.file?.size_bytes != null && (
                  <p className="text-xs text-muted-foreground">
                    {formatSize(att.file.size_bytes)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1-page checkbox */}
                {!readOnly && (
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={att.one_page_confirmed}
                      onChange={() => toggleOnePageConfirmed(att)}
                      className="rounded border-border"
                    />
                    1-page
                  </label>
                )}
                {readOnly && att.one_page_confirmed && (
                  <Badge color="green">1-page</Badge>
                )}

                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReorder(i, 'up')}
                      disabled={i === 0}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(i, 'down')}
                      disabled={i === attachments.length - 1}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(att)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {attachments.length === 0 && !readOnly && (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          )}

          {!readOnly && attachments.length < MAX_ATTACHMENTS && (
            <FileDropzone
              onFileSelect={handleUpload}
              accept="application/pdf,image/*"
              maxSizeMB={10}
              label="Drop attachment here or click to browse"
              uploading={uploading}
              disabled={uploading}
              className="mt-2"
            />
          )}

          {!readOnly && attachments.length >= MAX_ATTACHMENTS && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum {MAX_ATTACHMENTS} attachments reached
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
