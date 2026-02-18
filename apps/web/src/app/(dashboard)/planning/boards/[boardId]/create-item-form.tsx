'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import { SlideOver, Input, Select, Button, FormSection } from '@gleamops/ui';
import { AssignablePicker, type AssignableValue } from '@/components/assignable-picker';

const KIND_OPTIONS = [
  { value: 'TICKET', label: 'Ticket' },
  { value: 'NOTE', label: 'Note' },
  { value: 'TASK', label: 'Task' },
];

interface CreateItemFormProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  onSuccess: () => void;
}

export function CreateItemForm({ open, onClose, boardId, onSuccess }: CreateItemFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('TICKET');
  const [ticketId, setTicketId] = useState('');
  const [assignee, setAssignee] = useState<AssignableValue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setKind('TICKET');
    setTicketId('');
    setAssignee(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    setSaving(true);
    try {
      await fetchJsonWithSupabaseAuth(supabase, `/api/planning/boards/${boardId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          item_kind: kind,
          ticket_id: kind === 'TICKET' && ticketId.trim() ? ticketId.trim() : null,
          current_assignee_staff_id: assignee?.type === 'staff' ? assignee.id : null,
          current_assignee_subcontractor_id: assignee?.type === 'subcontractor' ? assignee.id : null,
        }),
      });
      toast.success('Item added.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Add Planning Item">
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Item Details" icon={<ClipboardList className="h-4 w-4" />} description="Configure the planning board item.">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} options={KIND_OPTIONS} />
          {kind === 'TICKET' && (
            <Input
              label="Ticket ID"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="UUID of the work ticket"
            />
          )}
          <AssignablePicker value={assignee} onChange={setAssignee} label="Assignee (optional)" />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add Item</Button>
        </div>
      </form>
    </SlideOver>
  );
}
