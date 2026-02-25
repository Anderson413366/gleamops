'use client';

import { useState } from 'react';
import { CheckSquare, PlusSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, SlideOver, Textarea } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface CompletionTemplateOption {
  value: string;
  label: string;
}

interface CompletionTemplateFormProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (template: CompletionTemplateOption) => void;
}

export function CompletionTemplateForm({ open, onClose, onCreated }: CompletionTemplateFormProps) {
  const { tenantId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requireBeforeAfterPhotos, setRequireBeforeAfterPhotos] = useState(true);
  const [requireSupervisorSignoff, setRequireSupervisorSignoff] = useState(true);
  const [requireClientSignoff, setRequireClientSignoff] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setRequireBeforeAfterPhotos(true);
    setRequireSupervisorSignoff(true);
    setRequireClientSignoff(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Tenant context is required.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Template name is required.');
      return;
    }

    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const templateCode = `WOC-${Date.now().toString().slice(-6)}`;

    const { data: templateRow, error: templateError } = await supabase
      .from('checklist_templates')
      .insert({
        tenant_id: tenantId,
        template_code: templateCode,
        name: trimmedName,
        description: description.trim() || null,
        template_name: trimmedName,
        template_type: 'Work Order Completion',
        version: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (templateError || !templateRow) {
      setSaving(false);
      toast.error(templateError?.message ?? 'Unable to create completion template.');
      return;
    }

    const items: Array<{
      section: string;
      label: string;
      requiresPhoto: boolean;
    }> = [];

    if (requireBeforeAfterPhotos) {
      items.push({ section: 'Completion', label: 'Before photos uploaded', requiresPhoto: true });
      items.push({ section: 'Completion', label: 'After photos uploaded', requiresPhoto: true });
    }
    if (requireSupervisorSignoff) {
      items.push({ section: 'Sign-off', label: 'Supervisor sign-off captured', requiresPhoto: false });
    }
    if (requireClientSignoff) {
      items.push({ section: 'Sign-off', label: 'Client sign-off captured', requiresPhoto: false });
    }
    if (items.length === 0) {
      items.push({ section: 'Completion', label: 'Completion verified', requiresPhoto: false });
    }

    const { error: itemError } = await supabase
      .from('checklist_template_items')
      .insert(
        items.map((item, index) => ({
          tenant_id: tenantId,
          template_id: templateRow.id,
          section: item.section,
          label: item.label,
          prompt: item.label,
          response_type: 'PASS_FAIL',
          sort_order: index,
          is_required: true,
          requires_photo: item.requiresPhoto,
          is_active: true,
        })),
      );

    setSaving(false);

    if (itemError) {
      toast.error(itemError.message);
      return;
    }

    toast.success('Completion template created.');
    onCreated?.({ value: templateRow.id, label: trimmedName });
    handleClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title="Completion Template" wide>
      <div className="space-y-4 p-1">
        <Input
          label="Template Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Standard Subcontractor Completion"
          required
        />

        <Textarea
          label="Template Notes"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what this template verifies before marking work complete."
          rows={3}
        />

        <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={requireBeforeAfterPhotos}
              onChange={(event) => setRequireBeforeAfterPhotos(event.target.checked)}
              className="h-4 w-4 rounded border border-border"
            />
            Require before/after photos
          </label>
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={requireSupervisorSignoff}
              onChange={(event) => setRequireSupervisorSignoff(event.target.checked)}
              className="h-4 w-4 rounded border border-border"
            />
            Require supervisor sign-off
          </label>
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={requireClientSignoff}
              onChange={(event) => setRequireClientSignoff(event.target.checked)}
              className="h-4 w-4 rounded border border-border"
            />
            Require client sign-off
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={saving}>
            {saving ? <CheckSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
            Create Template
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
