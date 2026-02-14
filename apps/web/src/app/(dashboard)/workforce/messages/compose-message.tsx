'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface StaffOption {
  value: string; // user_id
  label: string;
}

interface ComposeMessageProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (threadId: string) => void;
  presetRecipientId?: string;
  presetSubject?: string;
  presetTicketId?: string;
}

export function ComposeMessage({
  open,
  onClose,
  onCreated,
  presetRecipientId,
  presetSubject,
  presetTicketId,
}: ComposeMessageProps) {
  const { user } = useAuth();
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [recipientId, setRecipientId] = useState(presetRecipientId ?? '');
  const [subject, setSubject] = useState(presetSubject ?? '');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  // Load staff options
  useEffect(() => {
    if (!open) return;

    async function loadStaff() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('staff')
        .select('user_id, full_name, staff_code')
        .not('user_id', 'is', null)
        .is('archived_at', null)
        .order('full_name');

      if (data) {
        setStaffOptions(
          data
            .filter((s: { user_id: string | null }) => s.user_id && s.user_id !== user?.id)
            .map((s: { user_id: string; full_name: string; staff_code: string }) => ({
              value: s.user_id,
              label: `${s.full_name} (${s.staff_code})`,
            }))
        );
      }
    }

    loadStaff();
  }, [open, user]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setRecipientId(presetRecipientId ?? '');
      setSubject(presetSubject ?? '');
      setBody('');
    }
  }, [open, presetRecipientId, presetSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !subject.trim() || !body.trim() || !user) return;

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const tenantId = authUser?.app_metadata?.tenant_id;

      const threadType = presetTicketId ? 'TICKET_CONTEXT' : 'DIRECT';

      // Create thread
      const { data: thread, error: threadErr } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: tenantId,
          subject: subject.trim(),
          thread_type: threadType,
          ticket_id: presetTicketId ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (threadErr || !thread) throw threadErr ?? new Error('Failed to create thread');

      // Add members (sender + recipient)
      const { error: memberErr } = await supabase
        .from('message_thread_members')
        .insert([
          { tenant_id: tenantId, thread_id: thread.id, user_id: user.id, role: 'ADMIN' },
          { tenant_id: tenantId, thread_id: thread.id, user_id: recipientId, role: 'MEMBER' },
        ]);

      if (memberErr) throw memberErr;

      // Send first message
      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          thread_id: thread.id,
          sender_id: user.id,
          body: body.trim(),
        });

      if (msgErr) throw msgErr;

      toast.success('Message sent');
      onCreated?.(thread.id);
    } catch (err) {
      console.error('ComposeMessage error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send message', { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="New Message"
      subtitle={presetTicketId ? 'Ticket Context' : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Select
            label="To"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="Select recipient..."
            options={staffOptions}
            disabled={!!presetRecipientId}
            required
          />
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject..."
            required
          />
          <Textarea
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={6}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!recipientId || !subject.trim() || !body.trim()}>
            Send Message
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
