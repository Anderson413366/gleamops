'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver, Button, Select, Input, Textarea, Skeleton,
} from '@gleamops/ui';
import type { InspectionTemplate, Staff } from '@gleamops/shared';

interface SiteOption { id: string; name: string; site_code: string }

interface CreateInspectionFormProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateInspectionForm({ open, onClose, onCreated }: CreateInspectionFormProps) {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [inspectors, setInspectors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [templateId, setTemplateId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [inspectorId, setInspectorId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchOptions = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [tmplRes, siteRes, staffRes] = await Promise.all([
      supabase
        .from('inspection_templates')
        .select('*')
        .eq('is_active', true)
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('staff')
        .select('*')
        .is('archived_at', null)
        .order('full_name'),
    ]);

    if (tmplRes.data) setTemplates(tmplRes.data as unknown as InspectionTemplate[]);
    if (siteRes.data) setSites(siteRes.data as unknown as SiteOption[]);
    if (staffRes.data) setInspectors(staffRes.data as unknown as Staff[]);
    setLoading(false);
  }, [open]);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const handleCreate = async () => {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    // Get tenant_id from current user
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); return; }

    // Generate next inspection code
    const { data: seqData } = await supabase
      .rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'QAI' });
    const inspectionCode = seqData || `QAI-${Date.now()}`;

    // Create inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        tenant_id: tenantId,
        inspection_code: inspectionCode,
        template_id: templateId || null,
        site_id: siteId || null,
        inspector_id: inspectorId || null,
        status: 'DRAFT',
        notes: notes || null,
      })
      .select()
      .single();

    if (error || !inspection) {
      console.error('Failed to create inspection:', error);
      setSaving(false);
      return;
    }

    // If template selected, copy template items into inspection_items
    if (templateId) {
      const { data: tmplItems } = await supabase
        .from('inspection_template_items')
        .select('*')
        .eq('template_id', templateId)
        .is('archived_at', null)
        .order('sort_order');

      if (tmplItems && tmplItems.length > 0) {
        const inspItems = tmplItems.map((ti: Record<string, unknown>) => ({
          tenant_id: tenantId,
          inspection_id: inspection.id,
          template_item_id: ti.id,
          section: ti.section,
          label: ti.label,
          sort_order: ti.sort_order,
          requires_photo: ti.requires_photo,
          score: null,
          photo_taken: false,
          notes: null,
        }));

        await supabase.from('inspection_items').insert(inspItems);
      }
    }

    // Reset form
    setTemplateId('');
    setSiteId('');
    setInspectorId('');
    setNotes('');
    setSaving(false);
    onCreated?.();
  };

  const handleClose = () => {
    setTemplateId('');
    setSiteId('');
    setInspectorId('');
    setNotes('');
    onClose();
  };

  return (
    <SlideOver open={open} onClose={handleClose} title="New Inspection" subtitle="Create a quality inspection">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Inspection Template
            </label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Select a template..."
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.name} (Scale: 0-${t.scoring_scale}, Pass: ${t.pass_threshold}%)`,
              }))}
            />
            <p className="text-xs text-muted mt-1">
              Template items will be copied as inspection checklist items.
            </p>
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Site *
            </label>
            <Select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              placeholder="Select a site..."
              options={sites.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.site_code})`,
              }))}
            />
          </div>

          {/* Inspector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Inspector
            </label>
            <Select
              value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)}
              placeholder="Select an inspector..."
              options={inspectors.map((s) => ({
                value: s.id,
                label: `${s.full_name} (${s.staff_code})`,
              }))}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this inspection..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleCreate} disabled={saving || !siteId}>
              {saving ? 'Creating...' : 'Create Inspection'}
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
