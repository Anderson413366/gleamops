'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import { SlideOver, Textarea, Button, FormSection } from '@gleamops/ui';
import { AssignablePicker, type AssignableValue } from '@/components/assignable-picker';
import type { PlanningBoardItem } from '@gleamops/shared';

interface ProposalFormProps {
  open: boolean;
  onClose: () => void;
  item: PlanningBoardItem;
  onSuccess: () => void;
}

export function ProposalForm({ open, onClose, item, onSuccess }: ProposalFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [assignee, setAssignee] = useState<AssignableValue | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAssignee(null);
    setReason('');
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignee) {
      toast.error('Select a proposed assignee.');
      return;
    }
    setSaving(true);
    try {
      await fetchJsonWithSupabaseAuth(supabase, '/api/planning/proposals', {
        method: 'POST',
        body: JSON.stringify({
          item_id: item.id,
          proposed_staff_id: assignee.type === 'staff' ? assignee.id : null,
          proposed_subcontractor_id: assignee.type === 'subcontractor' ? assignee.id : null,
          note: reason.trim() || undefined,
        }),
      });
      toast.success('Proposal created.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Propose Assignment" subtitle={item.title}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Proposal" icon={<UserPlus className="h-4 w-4" />} description="Propose a new assignee for this item.">
          <AssignablePicker value={assignee} onChange={setAssignee} label="Proposed Assignee" />
          <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!assignee}>Create Proposal</Button>
        </div>
      </form>
    </SlideOver>
  );
}
