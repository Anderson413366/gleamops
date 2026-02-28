'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, SlideOver, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { WorkOrderTableRow } from './work-order-table';

interface WorkOrderCompletionProps {
  open: boolean;
  row: WorkOrderTableRow | null;
  onClose: () => void;
  onCompleted: () => void;
}

export function WorkOrderCompletion({ open, row, onClose, onCompleted }: WorkOrderCompletionProps) {
  const [saving, setSaving] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [supervisorSignOff, setSupervisorSignOff] = useState(true);
  const [clientSignOff, setClientSignOff] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSignerName('');
    setSignerEmail('');
    setNotes('');
    setBeforePhotoUrl('');
    setAfterPhotoUrl('');
    setSupervisorSignOff(true);
    setClientSignOff(false);
  }, [open, row?.id]);

  const handleSubmit = async () => {
    if (!row) return;
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Signer name and email are required.');
      return;
    }

    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();

    const { data: checklistRow, error: checklistError } = await supabase
      .from('ticket_checklists')
      .select('id')
      .eq('ticket_id', row.id)
      .is('archived_at', null)
      .maybeSingle();

    if (checklistError) {
      setSaving(false);
      toast.error(checklistError.message);
      return;
    }

    let checklistId = (checklistRow as { id: string } | null)?.id ?? null;

    if (!checklistId) {
      const { data: createdChecklist, error: createChecklistError } = await supabase
        .from('ticket_checklists')
        .insert({
          tenant_id: row.tenant_id,
          ticket_id: row.id,
          status: 'COMPLETED',
          completed_at: now,
          completed_by: null,
        })
        .select('id')
        .single();

      if (createChecklistError || !createdChecklist) {
        setSaving(false);
        toast.error(createChecklistError?.message ?? 'Unable to create checklist record.');
        return;
      }

      checklistId = (createdChecklist as { id: string }).id;
    } else {
      await supabase
        .from('ticket_checklists')
        .update({
          status: 'COMPLETED',
          completed_at: now,
          completed_by: null,
        })
        .eq('id', checklistId);
    }

    const payload = {
      signer_name: signerName.trim(),
      signer_email: signerEmail.trim(),
      notes: notes.trim() || null,
      before_photo_url: beforePhotoUrl.trim() || null,
      after_photo_url: afterPhotoUrl.trim() || null,
      supervisor_sign_off: supervisorSignOff,
      client_sign_off: clientSignOff,
      completed_at: now,
      source: 'internal_work_order_completion',
    };

    const { data: signoffItem } = await supabase
      .from('ticket_checklist_items')
      .select('id')
      .eq('checklist_id', checklistId)
      .eq('section', 'Completion')
      .eq('label', 'Completion sign-off')
      .is('archived_at', null)
      .maybeSingle();

    const signoffItemId = (signoffItem as { id: string } | null)?.id ?? null;

    // Build a human-readable notes string instead of raw JSON
    const signoffNotes = [
      `Signed by: ${payload.signer_name} (${payload.signer_email})`,
      payload.supervisor_sign_off ? 'Supervisor sign-off: Yes' : null,
      payload.client_sign_off ? 'Client sign-off: Yes' : null,
      payload.notes ? `Notes: ${payload.notes}` : null,
    ].filter(Boolean).join('\n');

    if (signoffItemId) {
      const { error: signoffUpdateError } = await supabase
        .from('ticket_checklist_items')
        .update({
          notes: signoffNotes,
          is_checked: true,
          checked_at: now,
          checked_by: null,
        })
        .eq('id', signoffItemId);

      if (signoffUpdateError) {
        setSaving(false);
        toast.error(signoffUpdateError.message);
        return;
      }
    } else {
      const { error: signoffInsertError } = await supabase
        .from('ticket_checklist_items')
        .insert({
          tenant_id: row.tenant_id,
          checklist_id: checklistId,
          section: 'Completion',
          label: 'Completion sign-off',
          sort_order: 999,
          template_item_id: null,
          is_required: true,
          requires_photo: false,
          is_checked: true,
          checked_at: now,
          checked_by: null,
          notes: signoffNotes,
        });

      if (signoffInsertError) {
        setSaving(false);
        toast.error(signoffInsertError.message);
        return;
      }
    }

    const { error: ticketError } = await supabase
      .from('work_tickets')
      .update({ status: 'COMPLETED' })
      .eq('id', row.id);

    setSaving(false);

    if (ticketError) {
      toast.error(ticketError.message);
      return;
    }

    toast.success('Work order marked completed.');
    onCompleted();
    onClose();
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Complete Work Order" wide>
      <div className="space-y-4 p-1">
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{row?.ticket_code}</p>
          <p className="text-xs text-muted-foreground">{row?.site_name || 'Unknown Site'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Signer Name"
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            placeholder="Full name"
            required
          />
          <Input
            label="Signer Email"
            type="email"
            value={signerEmail}
            onChange={(event) => setSignerEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>

        <Textarea
          label="Completion Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Document outcomes, exceptions, and follow-up needs."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Before Photo URL"
            type="url"
            value={beforePhotoUrl}
            onChange={(event) => setBeforePhotoUrl(event.target.value)}
            placeholder="https://..."
          />
          <Input
            label="After Photo URL"
            type="url"
            value={afterPhotoUrl}
            onChange={(event) => setAfterPhotoUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={supervisorSignOff}
            onChange={(event) => setSupervisorSignOff(event.target.checked)}
            className="h-4 w-4 rounded border border-border"
          />
          Supervisor sign-off completed
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={clientSignOff}
            onChange={(event) => setClientSignOff(event.target.checked)}
            className="h-4 w-4 rounded border border-border"
          />
          Client sign-off completed
        </label>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} loading={saving}>
            <CheckCircle2 className="h-4 w-4" />
            Mark Complete
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
