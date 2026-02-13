'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, GripVertical, Save, Settings,
  ClipboardCheck, Camera, AlertCircle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver, Button, Card, CardContent, CardHeader, CardTitle,
  Input, Textarea, Select, Badge, Skeleton,
} from '@gleamops/ui';
import type { InspectionTemplate, InspectionTemplateItem } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TemplateItemDraft extends Partial<InspectionTemplateItem> {
  _tempId?: string; // For new items not yet saved
  _deleted?: boolean;
}

interface TemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  templateId?: string | null; // null = create new
  onSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Template Builder Component
// ---------------------------------------------------------------------------
export function TemplateBuilder({ open, onClose, templateId, onSaved }: TemplateBuilderProps) {
  const isEdit = !!templateId;

  // Template fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scoringScale, setScoringScale] = useState(5);
  const [passThreshold, setPassThreshold] = useState(80);
  const [serviceId, setServiceId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Items
  const [items, setItems] = useState<TemplateItemDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Services for dropdown
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  // Track next temp ID counter
  const [tempIdCounter, setTempIdCounter] = useState(0);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchTemplate = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();

    // Fetch services
    const { data: svcData } = await supabase
      .from('services')
      .select('id, name')
      .is('archived_at', null)
      .order('name');
    if (svcData) setServices(svcData as { id: string; name: string }[]);

    if (isEdit && templateId) {
      const [tmplRes, itemsRes] = await Promise.all([
        supabase
          .from('inspection_templates')
          .select('*')
          .eq('id', templateId)
          .single(),
        supabase
          .from('inspection_template_items')
          .select('*')
          .eq('template_id', templateId)
          .is('archived_at', null)
          .order('sort_order'),
      ]);

      if (tmplRes.data) {
        const t = tmplRes.data as unknown as InspectionTemplate;
        setName(t.name);
        setDescription(t.description ?? '');
        setScoringScale(t.scoring_scale);
        setPassThreshold(t.pass_threshold);
        setServiceId(t.service_id ?? '');
        setIsActive(t.is_active);
      }

      if (itemsRes.data) {
        setItems(itemsRes.data as unknown as TemplateItemDraft[]);
      }
    } else {
      // Reset for new template
      setName('');
      setDescription('');
      setScoringScale(5);
      setPassThreshold(80);
      setServiceId('');
      setIsActive(true);
      setItems([]);
    }
    setLoading(false);
  }, [open, isEdit, templateId]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  // ---------------------------------------------------------------------------
  // Item management
  // ---------------------------------------------------------------------------
  const addItem = (section?: string) => {
    const newTempId = `temp-${tempIdCounter}`;
    setTempIdCounter((c) => c + 1);
    const maxSort = items.filter((i) => !i._deleted).length;
    setItems((prev) => [
      ...prev,
      {
        _tempId: newTempId,
        section: section || null,
        label: '',
        sort_order: maxSort,
        requires_photo: false,
        weight: 1,
      },
    ]);
  };

  const updateItem = (index: number, updates: Partial<TemplateItemDraft>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        // If it has an ID, mark as deleted; otherwise remove entirely
        if (item.id) return { ...item, _deleted: true };
        return item;
      }).filter((item) => item.id || !item._deleted)
    );
  };

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const activeItems = items.filter((i) => !i._deleted);
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= activeItems.length) return;

    const newItems = [...items];
    // Find the actual indices in the full array
    const activeIndices = items.reduce<number[]>((acc, item, i) => {
      if (!item._deleted) acc.push(i);
      return acc;
    }, []);
    const from = activeIndices[fromIndex];
    const to = activeIndices[toIndex];
    [newItems[from], newItems[to]] = [newItems[to], newItems[from]];
    // Update sort_order
    let sortIdx = 0;
    for (const item of newItems) {
      if (!item._deleted) {
        item.sort_order = sortIdx++;
      }
    }
    setItems(newItems);
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    const activeItems = items.filter((i) => !i._deleted);
    const emptyLabels = activeItems.filter((i) => !i.label?.trim());
    if (emptyLabels.length > 0) {
      setError('All items must have a label.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();

    // Get tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); setError('Authentication error'); return; }

    let tmplId = templateId;

    if (isEdit && tmplId) {
      // Update existing template
      await supabase
        .from('inspection_templates')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          scoring_scale: scoringScale,
          pass_threshold: passThreshold,
          service_id: serviceId || null,
          is_active: isActive,
        })
        .eq('id', tmplId);
    } else {
      // Generate template code
      const { data: seqData } = await supabase
        .rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'INS' });
      const templateCode = seqData || `INS-${Date.now()}`;

      // Create new template
      const { data: newTmpl, error: tmplErr } = await supabase
        .from('inspection_templates')
        .insert({
          tenant_id: tenantId,
          template_code: templateCode,
          name: name.trim(),
          description: description.trim() || null,
          scoring_scale: scoringScale,
          pass_threshold: passThreshold,
          service_id: serviceId || null,
          is_active: isActive,
        })
        .select()
        .single();

      if (tmplErr || !newTmpl) {
        setSaving(false);
        setError(tmplErr?.message ?? 'Failed to create template');
        return;
      }
      tmplId = newTmpl.id;
    }

    // Handle items: insert new, update existing, soft-delete removed
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; data: Record<string, unknown> }[] = [];
    const toDelete: string[] = [];

    for (const item of items) {
      if (item._deleted && item.id) {
        toDelete.push(item.id);
      } else if (!item._deleted && !item.id) {
        // New item
        toInsert.push({
          tenant_id: tenantId,
          template_id: tmplId,
          section: item.section || null,
          label: item.label?.trim() ?? '',
          sort_order: item.sort_order ?? 0,
          requires_photo: item.requires_photo ?? false,
          weight: item.weight ?? 1,
        });
      } else if (!item._deleted && item.id) {
        // Existing item, update
        toUpdate.push({
          id: item.id,
          data: {
            section: item.section || null,
            label: item.label?.trim() ?? '',
            sort_order: item.sort_order ?? 0,
            requires_photo: item.requires_photo ?? false,
            weight: item.weight ?? 1,
          },
        });
      }
    }

    // Execute all operations
    const ops = [];
    if (toInsert.length > 0) {
      ops.push(supabase.from('inspection_template_items').insert(toInsert));
    }
    for (const u of toUpdate) {
      ops.push(supabase.from('inspection_template_items').update(u.data).eq('id', u.id));
    }
    for (const delId of toDelete) {
      ops.push(
        supabase.from('inspection_template_items')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', delId)
      );
    }
    await Promise.all(ops);

    setSaving(false);
    onSaved?.();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Section helpers
  // ---------------------------------------------------------------------------
  const activeItems = items.filter((i) => !i._deleted);
  const sectionNames = [...new Set(activeItems.map((i) => i.section || 'General'))];

  // Group items by section for display
  const itemsBySection = new Map<string, { item: TemplateItemDraft; globalIndex: number }[]>();
  items.forEach((item, idx) => {
    if (item._deleted) return;
    const sec = item.section || 'General';
    const existing = itemsBySection.get(sec) || [];
    existing.push({ item, globalIndex: idx });
    itemsBySection.set(sec, existing);
  });

  // Active item index for move operations
  const activeItemIndices = items.reduce<number[]>((acc, item, i) => {
    if (!item._deleted) acc.push(i);
    return acc;
  }, []);

  if (!open) return null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Template' : 'New Inspection Template'}
      subtitle="Configure scoring items and sections"
      wide
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Error banner */}
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Template Settings */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted" />
                  Template Settings
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Template Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Nightly Office Cleaning Inspection"
                />
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this template is used for..."
                  rows={2}
                />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Scoring Scale (0–N)
                    </label>
                    <Select
                      value={String(scoringScale)}
                      onChange={(e) => setScoringScale(Number(e.target.value))}
                      options={[
                        { value: '3', label: '0–3' },
                        { value: '5', label: '0–5' },
                        { value: '10', label: '0–10' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Pass Threshold (%)
                    </label>
                    <Input
                      type="number"
                      value={String(passThreshold)}
                      onChange={(e) => setPassThreshold(Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Service (optional)
                    </label>
                    <Select
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      placeholder="Any service..."
                      options={services.map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Active (available for new inspections)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Items Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted" />
                    Inspection Items ({activeItems.length})
                  </span>
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => addItem()}>
                    <Plus className="h-3 w-3" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">
                  No items yet. Click "Add Item" to start building your inspection checklist.
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(itemsBySection.entries()).map(([sectionName, sectionItems]) => (
                    <div key={sectionName}>
                      {/* Section header */}
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {sectionName}
                        </p>
                        <Badge color="gray">{sectionItems.length}</Badge>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {sectionItems.map(({ item, globalIndex }, localIdx) => {
                          const activeIdx = activeItemIndices.indexOf(globalIndex);
                          return (
                            <div
                              key={item.id || item._tempId}
                              className="flex items-start gap-2 p-3 rounded-lg border border-border bg-white hover:border-gray-300 transition-colors"
                            >
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                                <button
                                  onClick={() => moveItem(activeIdx, 'up')}
                                  disabled={activeIdx === 0}
                                  className="p-0.5 rounded hover:bg-gray-100 text-muted disabled:opacity-30"
                                >
                                  <GripVertical className="h-3 w-3 rotate-180" />
                                </button>
                                <button
                                  onClick={() => moveItem(activeIdx, 'down')}
                                  disabled={activeIdx === activeItems.length - 1}
                                  className="p-0.5 rounded hover:bg-gray-100 text-muted disabled:opacity-30"
                                >
                                  <GripVertical className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Item fields */}
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    value={item.label ?? ''}
                                    onChange={(e) => updateItem(globalIndex, { label: e.target.value })}
                                    placeholder="Item label..."
                                    className="flex-1 text-sm border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <input
                                    value={item.section ?? ''}
                                    onChange={(e) => updateItem(globalIndex, { section: e.target.value || null })}
                                    placeholder="Section..."
                                    className="w-32 text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-muted"
                                  />
                                </div>

                                {/* Item options */}
                                <div className="flex items-center gap-4 text-xs">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.requires_photo ?? false}
                                      onChange={(e) => updateItem(globalIndex, { requires_photo: e.target.checked })}
                                      className="rounded border-gray-300"
                                    />
                                    <Camera className="h-3 w-3 text-blue-500" />
                                    Photo
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted">Weight:</span>
                                    <input
                                      type="number"
                                      value={item.weight ?? 1}
                                      onChange={(e) => updateItem(globalIndex, { weight: Number(e.target.value) || 1 })}
                                      min={1}
                                      max={10}
                                      className="w-14 text-xs border border-border rounded px-1.5 py-0.5 text-center"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Delete */}
                              <button
                                onClick={() => removeItem(globalIndex)}
                                className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add to section */}
                      <button
                        onClick={() => addItem(sectionName === 'General' ? undefined : sectionName)}
                        className="mt-2 text-xs text-muted hover:text-foreground flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add to {sectionName}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Actions */}
          <div className="flex gap-3 pt-4 border-t border-border sticky bottom-0 bg-white pb-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Template'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {isEdit && (
              <span className="ml-auto text-xs text-muted self-center">
                {activeItems.length} items across {sectionNames.length} section{sectionNames.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}
