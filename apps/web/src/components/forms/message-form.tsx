'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from '@/hooks/use-form';
import { messageThreadSchema, type MessageThreadFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';

const THREAD_TYPE_OPTIONS = [
  { value: 'DIRECT', label: 'Direct Message' },
  { value: 'GROUP', label: 'Group' },
  { value: 'TICKET_CONTEXT', label: 'Ticket Context' },
];

interface MessageFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MessageForm({ open, onClose, onSuccess }: MessageFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [ticketOptions, setTicketOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<MessageThreadFormData>({
    schema: messageThreadSchema,
    initialValues: {
      subject: '',
      thread_type: 'DIRECT',
      member_ids: [],
      ticket_id: null,
      initial_message: '',
    },
    onSubmit: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const tenantId = user.app_metadata?.tenant_id;

      // Create thread
      const { data: thread, error: threadErr } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: tenantId,
          subject: data.subject,
          thread_type: data.thread_type,
          ticket_id: data.ticket_id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (threadErr || !thread) {
        throw new Error(threadErr?.message ?? 'Failed to create thread');
      }

      // Add members (include the creator as ADMIN)
      const memberRows = [
        {
          tenant_id: tenantId,
          thread_id: thread.id,
          user_id: user.id,
          role: 'ADMIN',
          joined_at: new Date().toISOString(),
        },
        ...data.member_ids
          .filter((mid) => mid !== user.id)
          .map((userId) => ({
            tenant_id: tenantId,
            thread_id: thread.id,
            user_id: userId,
            role: 'MEMBER',
            joined_at: new Date().toISOString(),
          })),
      ];

      const { error: membersErr } = await supabase
        .from('message_thread_members')
        .insert(memberRows);

      if (membersErr) {
        throw new Error(membersErr.message);
      }

      // Insert initial message
      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          thread_id: thread.id,
          sender_id: user.id,
          body: data.initial_message,
        });

      if (msgErr) {
        throw new Error(msgErr.message);
      }

      toast.success('Thread created successfully', { duration: 3000 });
      onSuccess?.();
      handleClose();
    },
  });

  // Load staff (as potential members) and tickets
  useEffect(() => {
    if (open) {
      supabase
        .from('staff')
        .select('user_id, full_name, staff_code')
        .is('archived_at', null)
        .not('user_id', 'is', null)
        .order('full_name')
        .then(({ data }) => {
          if (data) {
            setStaffOptions(
              data
                .filter((s) => s.user_id)
                .map((s) => ({
                  value: s.user_id!,
                  label: `${s.full_name} (${s.staff_code})`,
                }))
            );
          }
        });

      supabase
        .from('work_tickets')
        .select('id, ticket_code')
        .is('archived_at', null)
        .order('ticket_code', { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) {
            setTicketOptions(
              data.map((t) => ({
                value: t.id,
                label: t.ticket_code,
              }))
            );
          }
        });
    }
  }, [open, supabase]);

  const handleClose = () => {
    reset();
    setSelectedMembers([]);
    onClose();
  };

  const handleMemberToggle = (userId: string) => {
    const updated = selectedMembers.includes(userId)
      ? selectedMembers.filter((id) => id !== userId)
      : [...selectedMembers, userId];
    setSelectedMembers(updated);
    setValue('member_ids', updated);
  };

  return (
    <SlideOver open={open} onClose={handleClose} title="New Message Thread" wide>
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Thread Details" icon={<MessageCircle className="h-4 w-4" />} description="Set context and optionally link to a work ticket.">
          <Input
            label="Subject"
            value={values.subject}
            onChange={(e) => setValue('subject', e.target.value)}
            onBlur={() => onBlur('subject')}
            error={errors.subject}
            placeholder="Thread subject..."
            required
          />
          <Select
            label="Type"
            value={values.thread_type}
            onChange={(e) => setValue('thread_type', e.target.value as 'DIRECT' | 'GROUP' | 'TICKET_CONTEXT')}
            onBlur={() => onBlur('thread_type')}
            error={errors.thread_type}
            options={THREAD_TYPE_OPTIONS}
            required
          />
          {values.thread_type === 'TICKET_CONTEXT' && (
            <Select
              label="Work Ticket"
              value={values.ticket_id ?? ''}
              onChange={(e) => setValue('ticket_id', e.target.value || null)}
              options={[{ value: '', label: 'Select a ticket...' }, ...ticketOptions]}
            />
          )}
        </FormSection>

        <FormSection
          title={`Members${selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}`}
          icon={<Users className="h-4 w-4" />}
          description="Choose who’s included in this thread."
        >
          {errors.member_ids && (
            <p className="text-xs text-destructive">{errors.member_ids}</p>
          )}
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {staffOptions.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No staff with user accounts found.</p>
            ) : (
              staffOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(opt.value)}
                    onChange={() => handleMemberToggle(opt.value)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </FormSection>

        <FormSection title="Initial Message" icon={<Send className="h-4 w-4" />} description="Write the first message to start the conversation.">
          <Textarea
            label="Message"
            value={values.initial_message}
            onChange={(e) => setValue('initial_message', e.target.value)}
            onBlur={() => onBlur('initial_message')}
            error={errors.initial_message}
            rows={4}
            placeholder="Write the first message..."
            required
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Thread</Button>
        </div>
      </form>
    </SlideOver>
  );
}
