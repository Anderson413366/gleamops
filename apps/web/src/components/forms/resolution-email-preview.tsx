'use client';

import { useMemo, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SlideOver, Textarea, Input, Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ResolutionEmailPreviewProps {
  open: boolean;
  onClose: () => void;
  complaintCode: string;
  siteName: string;
  resolutionDescription: string;
  onSent?: () => void;
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function ResolutionEmailPreview({
  open,
  onClose,
  complaintCode,
  siteName,
  resolutionDescription,
  onSent,
}: ResolutionEmailPreviewProps) {
  const today = useMemo(() => new Date().toLocaleDateString('en-US'), []);
  const [subject, setSubject] = useState(`Cleaning Service Update - ${siteName} - ${today}`);
  const [message, setMessage] = useState(
    [
      'Dear Customer,',
      '',
      `Thank you for your feedback about ${siteName}.`,
      '',
      `We took the following action on ${today}:`,
      resolutionDescription || '(resolution pending)',
      '',
      'Please see the attached photos showing the before and after results.',
      '',
      'If you have any further concerns, please reach out.',
      '',
      'Best regards,',
      'Anderson Cleaning',
    ].join('\n'),
  );
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/operations/complaints/${encodeURIComponent(complaintCode)}/send-resolution`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          subject: subject.trim() || null,
          message: message.trim() || null,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to send resolution email.');
      }

      toast.success('Resolution email sent to customer.');
      onSent?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send resolution email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Resolution Email Preview"
      subtitle={complaintCode}
      wide
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <p>This email will send through SendGrid and include complaint before/after photo links.</p>
        </div>

        <Input
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <Textarea
          label="Message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={12}
        />

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending}>
            <MailCheck className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
