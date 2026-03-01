'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface ChecklistAdminProps {
  search?: string;
}

interface TemplateRow {
  id: string;
  template_code: string;
  name: string | null;
  template_name: string | null;
  template_type: string | null;
  version: number | null;
  is_active: boolean | null;
  updated_at: string;
}

interface SectionRow {
  id: string;
  section_title: string;
  sort_order: number;
}

interface TemplateItemRow {
  id: string;
  section: string | null;
  label: string;
  sort_order: number;
  is_required: boolean;
  requires_photo: boolean;
}

interface TicketOption {
  id: string;
  label: string;
}

const STARTER_SECTIONS = ['Opening', 'Cleaning', 'Closing', 'Special'];

function localDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function templateLabel(template: TemplateRow): string {
  return template.template_name ?? template.name ?? template.template_code;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function ChecklistAdmin({ search = '' }: ChecklistAdminProps) {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [items, setItems] = useState<TemplateItemRow[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [targetTicketIds, setTargetTicketIds] = useState<Set<string>>(new Set());

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemSection, setNewItemSection] = useState('Opening');
  const [newItemRequiresPhoto, setNewItemRequiresPhoto] = useState(false);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) => (
      templateLabel(template).toLowerCase().includes(query)
      || template.template_code.toLowerCase().includes(query)
      || (template.template_type ?? '').toLowerCase().includes(query)
    ));
  }, [search, templates]);

  const groupedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visibleItems = query
      ? items.filter((item) => item.label.toLowerCase().includes(query) || (item.section ?? '').toLowerCase().includes(query))
      : items;

    const groups = new Map<string, TemplateItemRow[]>();
    for (const section of sections) {
      groups.set(section.section_title, []);
    }

    for (const item of visibleItems) {
      const section = item.section?.trim() || 'General';
      const existing = groups.get(section) ?? [];
      existing.push(item);
      groups.set(section, existing);
    }

    return Array.from(groups.entries())
      .map(([sectionTitle, rows]) => ({
        sectionTitle,
        rows: rows.sort((a, b) => a.sort_order - b.sort_order),
      }))
      .filter((group) => group.rows.length > 0 || sections.some((section) => section.section_title === group.sectionTitle));
  }, [items, search, sections]);

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('id, template_code, name, template_name, template_type, version, is_active, updated_at')
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const rows = (data ?? []) as TemplateRow[];
    setTemplates(rows);

    const nextSelectedId = selectedTemplateId && rows.some((row) => row.id === selectedTemplateId)
      ? selectedTemplateId
      : rows[0]?.id ?? '';

    setSelectedTemplateId(nextSelectedId);
  }, [selectedTemplateId, supabase]);

  const loadTemplateDetail = useCallback(async (templateId: string) => {
    const [sectionsRes, itemsRes] = await Promise.all([
      supabase
        .from('checklist_template_sections')
        .select('id, section_title, sort_order')
        .eq('checklist_template_id', templateId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('checklist_template_items')
        .select('id, section, label, sort_order, is_required, requires_photo')
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

    setSections((sectionsRes.data ?? []) as SectionRow[]);
    setItems((itemsRes.data ?? []) as TemplateItemRow[]);

    const firstSection = (sectionsRes.data as SectionRow[] | null)?.[0]?.section_title ?? 'Opening';
    setNewItemSection(firstSection);
  }, [supabase]);

  const loadTargetShifts = useCallback(async () => {
    const today = localDateKey(new Date());
    const endDate = addDays(today, 7);

    const { data, error } = await supabase
      .from('work_tickets')
      .select('id, ticket_code, scheduled_date, site:sites!work_tickets_site_id_fkey(name, site_code)')
      .gte('scheduled_date', today)
      .lte('scheduled_date', endDate)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(120);

    if (error) {
      toast.error(error.message);
      return;
    }

    const options = ((data ?? []) as Array<{
      id: string;
      ticket_code: string;
      scheduled_date: string;
      site:
        | { name: string; site_code: string | null }
        | Array<{ name: string; site_code: string | null }>
        | null;
    }>).map((row) => {
      const site = relationOne(row.site);
      return {
        id: row.id,
        label: `${row.ticket_code} · ${site?.site_code ? `${site.site_code} - ` : ''}${site?.name ?? 'Unknown Site'} · ${row.scheduled_date}`,
      };
    });

    setTicketOptions(options);
    if (targetTicketIds.size === 0 && options.length > 0) {
      setTargetTicketIds(new Set([options[0].id]));
    }
  }, [supabase, targetTicketIds.size]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      await Promise.all([loadTemplates(), loadTargetShifts()]);
      setLoading(false);
    }
    void bootstrap();
  }, [loadTargetShifts, loadTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSections([]);
      setItems([]);
      return;
    }
    void loadTemplateDetail(selectedTemplateId);
  }, [loadTemplateDetail, selectedTemplateId]);

  const createStarterTemplate = useCallback(async () => {
    if (!tenantId) {
      toast.error('Tenant context is required.');
      return;
    }

    const name = newTemplateName.trim();
    if (!name) {
      toast.error('Template name is required.');
      return;
    }

    setSaving(true);
    const templateCode = `SCL-${Date.now().toString().slice(-6)}`;

    const { data: templateInsert, error: templateError } = await supabase
      .from('checklist_templates')
      .insert({
        tenant_id: tenantId,
        template_code: templateCode,
        name,
        template_name: name,
        template_type: 'Shift Checklist',
        version: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (templateError || !templateInsert) {
      setSaving(false);
      toast.error(templateError?.message ?? 'Failed to create template.');
      return;
    }

    const sectionPayload = STARTER_SECTIONS.map((sectionTitle, index) => ({
      tenant_id: tenantId,
      checklist_template_id: templateInsert.id,
      section_title: sectionTitle,
      sort_order: index,
      is_active: true,
    }));

    const { error: sectionError } = await supabase
      .from('checklist_template_sections')
      .insert(sectionPayload);

    if (sectionError) {
      setSaving(false);
      toast.error(sectionError.message);
      return;
    }

    setSaving(false);
    setNewTemplateName('');
    toast.success('Starter shift checklist template created.');
    await loadTemplates();
    setSelectedTemplateId(templateInsert.id);
  }, [loadTemplates, newTemplateName, supabase, tenantId]);

  const addChecklistItem = useCallback(async () => {
    if (!tenantId || !selectedTemplateId) {
      toast.error('Select a template first.');
      return;
    }

    const label = newItemLabel.trim();
    if (!label) {
      toast.error('Checklist item label is required.');
      return;
    }

    const nextSort = (items[items.length - 1]?.sort_order ?? -1) + 1;

    const { error } = await supabase
      .from('checklist_template_items')
      .insert({
        tenant_id: tenantId,
        template_id: selectedTemplateId,
        section: newItemSection || 'General',
        label,
        prompt: label,
        response_type: 'PASS_FAIL',
        sort_order: nextSort,
        is_required: true,
        requires_photo: newItemRequiresPhoto,
        is_active: true,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewItemLabel('');
    setNewItemRequiresPhoto(false);
    toast.success('Checklist item added.');
    await loadTemplateDetail(selectedTemplateId);
  }, [items, loadTemplateDetail, newItemLabel, newItemRequiresPhoto, newItemSection, selectedTemplateId, supabase, tenantId]);

  const applyTemplateToShifts = useCallback(async () => {
    if (!tenantId) {
      toast.error('Tenant context is required.');
      return;
    }
    if (!selectedTemplateId) {
      toast.error('Choose a checklist template first.');
      return;
    }
    if (targetTicketIds.size === 0) {
      toast.error('Choose at least one shift to apply this checklist.');
      return;
    }

    setSaving(true);

    const { data: templateItems, error: templateItemsError } = await supabase
      .from('checklist_template_items')
      .select('id, section, label, sort_order, is_required, requires_photo')
      .eq('template_id', selectedTemplateId)
      .is('archived_at', null)
      .order('sort_order', { ascending: true });

    if (templateItemsError) {
      setSaving(false);
      toast.error(templateItemsError.message);
      return;
    }

    const normalizedTemplateItems = (templateItems ?? []) as TemplateItemRow[];
    if (normalizedTemplateItems.length === 0) {
      setSaving(false);
      toast.error('Add checklist items before applying the template.');
      return;
    }

    let applied = 0;
    for (const ticketId of targetTicketIds) {
      const { data: existingChecklist } = await supabase
        .from('ticket_checklists')
        .select('id')
        .eq('ticket_id', ticketId)
        .is('archived_at', null)
        .maybeSingle();

      let ticketChecklistId = existingChecklist?.id ?? null;

      if (!ticketChecklistId) {
        const { data: createdChecklist, error: createChecklistError } = await supabase
          .from('ticket_checklists')
          .insert({
            tenant_id: tenantId,
            ticket_id: ticketId,
            template_id: selectedTemplateId,
            status: 'PENDING',
          })
          .select('id')
          .single();

        if (createChecklistError || !createdChecklist) {
          toast.error(createChecklistError?.message ?? `Could not create checklist for shift.`);
          continue;
        }

        ticketChecklistId = createdChecklist.id;
      } else {
        await supabase
          .from('ticket_checklists')
          .update({
            template_id: selectedTemplateId,
            status: 'PENDING',
            completed_at: null,
            completed_by: null,
          })
          .eq('id', ticketChecklistId);
      }

      await supabase
        .from('ticket_checklist_items')
        .delete()
        .eq('checklist_id', ticketChecklistId);

      const itemPayload = normalizedTemplateItems.map((item, index) => ({
        tenant_id: tenantId,
        checklist_id: ticketChecklistId,
        template_item_id: item.id,
        section: item.section,
        label: item.label,
        sort_order: index,
        is_required: item.is_required,
        requires_photo: item.requires_photo,
        is_checked: false,
        checked_at: null,
        checked_by: null,
        notes: null,
      }));

      const { error: insertItemsError } = await supabase
        .from('ticket_checklist_items')
        .insert(itemPayload);

      if (!insertItemsError) applied++;
    }

    setSaving(false);

    if (applied > 0) {
      toast.success(`Checklist applied to ${applied} shift${applied > 1 ? 's' : ''}.`);
    } else {
      toast.error('Failed to apply checklist to any shifts.');
    }
  }, [selectedTemplateId, supabase, targetTicketIds, tenantId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading checklist admin...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Checklist Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Create Shift Template</p>
            <Input
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="Nightly Retail Shift"
            />
            <Button type="button" onClick={createStarterTemplate} loading={saving}>
              <Sparkles className="h-4 w-4" />
              Create Starter (Opening/Cleaning/Closing/Special)
            </Button>
          </div>

          <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {filteredTemplates.map((template) => {
              const isActive = template.id === selectedTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{templateLabel(template)}</p>
                    <Badge color={template.is_active ? 'green' : 'gray'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.template_code} · {template.template_type ?? 'Checklist'} · v{template.version ?? 1}
                  </p>
                </button>
              );
            })}
            {filteredTemplates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No checklist templates found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {selectedTemplate ? templateLabel(selectedTemplate) : 'Select a checklist template'}
              </CardTitle>
              {selectedTemplate ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Configure items by section, then apply to a shift.
                </p>
              ) : null}
            </div>
            <Badge color="blue">
              <ClipboardList className="h-3.5 w-3.5" />
              {items.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTemplate ? (
            <>
              <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_220px_auto] md:items-end">
                <Input
                  label="New checklist item"
                  value={newItemLabel}
                  onChange={(event) => setNewItemLabel(event.target.value)}
                  placeholder="Restrooms stocked and disinfected"
                />
                <Select
                  label="Section"
                  value={newItemSection}
                  onChange={(event) => setNewItemSection(event.target.value)}
                  options={Array.from(new Set([
                    ...STARTER_SECTIONS,
                    ...sections.map((section) => section.section_title),
                  ])).map((section) => ({ value: section, label: section }))}
                />
                <Button type="button" variant="secondary" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground md:col-span-3">
                  <input
                    type="checkbox"
                    checked={newItemRequiresPhoto}
                    onChange={(event) => setNewItemRequiresPhoto(event.target.checked)}
                    className="h-4 w-4 rounded border border-border"
                  />
                  Require photo proof for this item
                </label>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Apply template to shifts ({targetTicketIds.size} selected)
                </p>
                <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                  {ticketOptions.map((ticket) => (
                    <label key={ticket.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={targetTicketIds.has(ticket.id)}
                        onChange={() => {
                          setTargetTicketIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(ticket.id)) next.delete(ticket.id);
                            else next.add(ticket.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border border-border"
                      />
                      <span className="truncate">{ticket.label}</span>
                    </label>
                  ))}
                  {ticketOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No shifts in the next 7 days.</p>
                  )}
                </div>
                <Button type="button" onClick={applyTemplateToShifts} loading={saving} disabled={targetTicketIds.size === 0}>
                  Apply to {targetTicketIds.size} Shift{targetTicketIds.size !== 1 ? 's' : ''}
                </Button>
              </div>

              <div className="space-y-3">
                {groupedItems.map((group) => (
                  <div key={group.sectionTitle} className="rounded-lg border border-border/70 bg-muted/15 p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{group.sectionTitle}</h4>
                      <Badge color="gray">{group.rows.length} item{group.rows.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {group.rows.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>{item.label}</span>
                          <div className="flex items-center gap-1">
                            {item.is_required ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
                            {item.requires_photo ? <Badge color="yellow">Photo</Badge> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {groupedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No checklist items yet. Add items to publish this template.</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a template to manage shift checklist sections and items.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
