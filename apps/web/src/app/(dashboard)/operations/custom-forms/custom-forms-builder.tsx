'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileText, ListChecks } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

type ChecklistTemplate = {
  id: string;
  template_code: string;
  name: string | null;
  template_name: string | null;
  template_type: string | null;
  version: number | null;
  is_active: boolean | null;
  updated_at: string;
};

type ChecklistSection = {
  id: string;
  section_title: string;
  sort_order: number;
  is_active: boolean;
};

type ChecklistItem = {
  id: string;
  section: string | null;
  label: string;
  prompt: string | null;
  response_type: string | null;
  sort_order: number;
  is_required: boolean;
  is_active: boolean | null;
};

interface Props {
  search: string;
}

function asTemplateLabel(template: ChecklistTemplate): string {
  return template.template_name ?? template.name ?? template.template_code;
}

export default function CustomFormsBuilder({ search }: Props) {
  const { tenantId } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('Custom Form');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemSection, setNewItemSection] = useState('General');

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const label = asTemplateLabel(t).toLowerCase();
      return (
        label.includes(q)
        || t.template_code.toLowerCase().includes(q)
        || (t.template_type ?? '').toLowerCase().includes(q)
      );
    });
  }, [search, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('id, template_code, name, template_name, template_type, version, is_active, updated_at')
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as ChecklistTemplate[];
    setTemplates(rows);

    if (!selectedTemplateId && rows.length > 0) {
      setSelectedTemplateId(rows[0].id);
    } else if (selectedTemplateId && !rows.some((r) => r.id === selectedTemplateId)) {
      setSelectedTemplateId(rows[0]?.id ?? null);
    }

    setLoading(false);
  }, [selectedTemplateId, supabase]);

  const loadTemplateDetail = useCallback(async (templateId: string) => {
    const [sectionsRes, itemsRes] = await Promise.all([
      supabase
        .from('checklist_template_sections')
        .select('id, section_title, sort_order, is_active')
        .eq('checklist_template_id', templateId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('checklist_template_items')
        .select('id, section, label, prompt, response_type, sort_order, is_required, is_active')
        .eq('template_id', templateId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
    ]);

    if (sectionsRes.error) {
      toast.error(sectionsRes.error.message);
      return;
    }
    if (itemsRes.error) {
      toast.error(itemsRes.error.message);
      return;
    }

    setSections((sectionsRes.data ?? []) as ChecklistSection[]);
    setItems((itemsRes.data ?? []) as ChecklistItem[]);
  }, [supabase]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSections([]);
      setItems([]);
      return;
    }
    void loadTemplateDetail(selectedTemplateId);
  }, [loadTemplateDetail, selectedTemplateId]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();

    for (const section of sections) {
      groups.set(section.section_title, []);
    }

    for (const item of items) {
      const sectionName = item.section?.trim() || 'General';
      if (!groups.has(sectionName)) groups.set(sectionName, []);
      groups.get(sectionName)!.push(item);
    }

    return Array.from(groups.entries()).map(([sectionName, rows]) => ({
      sectionName,
      rows: rows.sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [items, sections]);

  const createTemplate = useCallback(async () => {
    if (!tenantId) {
      toast.error('Tenant context is required.');
      return;
    }
    if (!newTemplateName.trim()) {
      toast.error('Template name is required.');
      return;
    }

    setSaving(true);
    const templateCode = `CLT-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from('checklist_templates')
      .insert({
        tenant_id: tenantId,
        template_code: templateCode,
        name: newTemplateName.trim(),
        template_name: newTemplateName.trim(),
        template_type: newTemplateType,
        version: 1,
        is_active: true,
      })
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewTemplateName('');
    toast.success('Template created.');
    await loadTemplates();
    setSelectedTemplateId(data.id);
  }, [loadTemplates, newTemplateName, newTemplateType, supabase, tenantId]);

  const addSection = useCallback(async () => {
    if (!tenantId || !selectedTemplateId || !newSectionTitle.trim()) return;

    const nextSort = (sections[sections.length - 1]?.sort_order ?? -1) + 1;
    const { error } = await supabase
      .from('checklist_template_sections')
      .insert({
        tenant_id: tenantId,
        checklist_template_id: selectedTemplateId,
        section_title: newSectionTitle.trim(),
        sort_order: nextSort,
        is_active: true,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewSectionTitle('');
    toast.success('Section added.');
    await loadTemplateDetail(selectedTemplateId);
  }, [loadTemplateDetail, newSectionTitle, sections, selectedTemplateId, supabase, tenantId]);

  const addItem = useCallback(async () => {
    if (!tenantId || !selectedTemplateId || !newItemLabel.trim()) return;

    const nextSort = (items[items.length - 1]?.sort_order ?? -1) + 1;
    const sectionName = newItemSection.trim() || 'General';

    const { error } = await supabase
      .from('checklist_template_items')
      .insert({
        tenant_id: tenantId,
        template_id: selectedTemplateId,
        section: sectionName,
        label: newItemLabel.trim(),
        prompt: newItemLabel.trim(),
        response_type: 'PASS_FAIL',
        sort_order: nextSort,
        is_required: true,
        is_active: true,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewItemLabel('');
    toast.success('Item added.');
    await loadTemplateDetail(selectedTemplateId);
  }, [items, loadTemplateDetail, newItemLabel, newItemSection, selectedTemplateId, supabase, tenantId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading form templates...</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold text-foreground">Template Library</h3>
          <p className="text-xs text-muted-foreground">Build versioned operational forms and checklists.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 rounded-lg border border-border p-3">
            <label className="text-xs font-medium text-muted-foreground">New Template</label>
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g., Opening Restroom Check"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <select
              value={newTemplateType}
              onChange={(e) => setNewTemplateType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option>Custom Form</option>
              <option>Job Checklist</option>
              <option>Inspection</option>
              <option>Safety Audit</option>
            </select>
            <Button onClick={createTemplate} disabled={saving} className="w-full">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filteredTemplates.map((template) => {
              const active = template.id === selectedTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{asTemplateLabel(template)}</p>
                    <Badge color={template.is_active ? 'green' : 'gray'}>{template.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.template_code} · {template.template_type ?? 'Custom'} · v{template.version ?? 1}
                  </p>
                </button>
              );
            })}
            {filteredTemplates.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No templates found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {selectedTemplate ? asTemplateLabel(selectedTemplate) : 'Select a template'}
              </h3>
              {selectedTemplate ? (
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.template_code} · {selectedTemplate.template_type ?? 'Custom Form'} · v{selectedTemplate.version ?? 1}
                </p>
              ) : null}
            </div>
            <Badge color="blue">
              <FileText className="mr-1 h-3 w-3" />
              {items.length} Items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedTemplate ? (
            <p className="text-sm text-muted-foreground">Choose a template from the left panel to manage sections and items.</p>
          ) : (
            <>
              <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Add Section</label>
                  <input
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="e.g., Restrooms"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <Button variant="secondary" onClick={addSection} className="w-full">
                    <Plus className="h-4 w-4" />
                    Add Section
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Add Item</label>
                  <input
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder="e.g., Refill soap dispensers"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <input
                    value={newItemSection}
                    onChange={(e) => setNewItemSection(e.target.value)}
                    placeholder="Section name"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <Button variant="secondary" onClick={addItem} className="w-full">
                    <ListChecks className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {groupedItems.map(({ sectionName, rows }) => (
                  <div key={sectionName} className="rounded-lg border border-border">
                    <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{sectionName}</p>
                      <Badge color="gray">{rows.length} items</Badge>
                    </div>
                    <div className="divide-y divide-border">
                      {rows.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                          <div>
                            <p className="text-sm text-foreground">{item.prompt ?? item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.response_type ?? 'PASS_FAIL'} · {item.is_required ? 'Required' : 'Optional'}
                            </p>
                          </div>
                          <Badge color={item.is_active === false ? 'gray' : 'green'}>
                            {item.is_active === false ? 'Inactive' : 'Active'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {groupedItems.length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">No form items yet. Add sections and checklist items to publish this template.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
