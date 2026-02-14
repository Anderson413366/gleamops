'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Mail, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver,
  Input, Select, Textarea, Button,
} from '@gleamops/ui';
import type { SalesFollowupTemplate } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STEP_OPTIONS = [
  { value: '1', label: 'Step 1' },
  { value: '2', label: 'Step 2' },
  { value: '3', label: 'Step 3' },
  { value: '4', label: 'Step 4' },
  { value: '5', label: 'Step 5' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  search: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FollowupTemplatesTable({ search }: Props) {
  const [rows, setRows] = useState<SalesFollowupTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver state
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SalesFollowupTemplate | null>(null);

  // Form fields
  const [templateCode, setTemplateCode] = useState('');
  const [name, setName] = useState('');
  const [stepNumber, setStepNumber] = useState('1');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplateMarkdown, setBodyTemplateMarkdown] = useState('');
  const [delayDays, setDelayDays] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: fetchErr } = await supabase
      .from('sales_followup_templates')
      .select('*')
      .is('archived_at', null)
      .order('template_code')
      .order('step_number');
    if (!fetchErr && data) setRows(data as unknown as SalesFollowupTemplate[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Filter + Sort + Paginate
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.template_code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'template_code', 'asc'
  );
  const sortedRows = sorted as unknown as SalesFollowupTemplate[];
  const pag = usePagination(sortedRows, 25);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setTemplateCode('');
    setName('');
    setStepNumber('1');
    setSubjectTemplate('');
    setBodyTemplateMarkdown('');
    setDelayDays('');
    setIsActive(true);
    setError(null);
  };

  const handleAdd = async () => {
    resetForm();
    setEditItem(null);

    // Auto-generate code
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'FUT' });
    setTemplateCode(codeData || `FUT-${Date.now()}`);

    setFormOpen(true);
  };

  const handleEdit = (item: SalesFollowupTemplate) => {
    setEditItem(item);
    setTemplateCode(item.template_code);
    setName(item.name);
    setStepNumber(String(item.step_number));
    setSubjectTemplate(item.subject_template);
    setBodyTemplateMarkdown(item.body_template_markdown);
    setDelayDays(String(item.delay_days));
    setIsActive(item.is_active);
    setError(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditItem(null);
    resetForm();
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!subjectTemplate.trim()) {
      setError('Subject template is required.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); setError('Authentication error'); return; }

    const payload = {
      name: name.trim(),
      step_number: Number(stepNumber),
      subject_template: subjectTemplate.trim(),
      body_template_markdown: bodyTemplateMarkdown.trim(),
      delay_days: delayDays ? Number(delayDays) : 0,
      is_active: isActive,
    };

    if (editItem) {
      const { data: updated, error: updateErr } = await supabase
        .from('sales_followup_templates')
        .update(payload)
        .eq('id', editItem.id)
        .eq('version_etag', editItem.version_etag)
        .select();
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
      if (!updated || updated.length === 0) {
        setError('This template was modified by another user. Please refresh and try again.');
        setSaving(false);
        return;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('sales_followup_templates')
        .insert({
          ...payload,
          tenant_id: tenantId,
          template_code: templateCode,
        });
      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    handleClose();
    fetchData();
    toast.success(editItem ? 'Template updated' : 'Template created');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={handleAdd}>
            <Mail className="h-3 w-3" />
            Add Template
          </Button>
        </div>
        <EmptyState
          icon={<Mail className="h-12 w-12" />}
          title="No follow-up templates"
          description={search ? 'Try a different search term.' : 'Create your first follow-up email template.'}
        />
        {/* Form SlideOver still rendered so it can open */}
        <SlideOver
          open={formOpen}
          onClose={handleClose}
          title={editItem ? 'Edit Template' : 'New Follow-up Template'}
          subtitle="Configure an automated follow-up email step"
        >
          {renderForm()}
        </SlideOver>
      </>
    );
  }

  function renderForm() {
    return (
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Input
          label="Template Code"
          value={templateCode}
          disabled
          hint="Auto-generated"
        />
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., 3-Day Check-in"
          required
        />
        <Select
          label="Step Number"
          value={stepNumber}
          onChange={(e) => setStepNumber(e.target.value)}
          options={STEP_OPTIONS}
          required
        />
        <Input
          label="Subject Template"
          value={subjectTemplate}
          onChange={(e) => setSubjectTemplate(e.target.value)}
          placeholder="e.g., Following up on your proposal {{proposal_code}}"
          required
        />
        <Textarea
          label="Body Template (Markdown)"
          value={bodyTemplateMarkdown}
          onChange={(e) => setBodyTemplateMarkdown(e.target.value)}
          placeholder="Write the email body using markdown. Use {{variable}} for placeholders."
          rows={8}
        />
        <Input
          label="Delay Days"
          type="number"
          value={delayDays}
          onChange={(e) => setDelayDays(e.target.value)}
          placeholder="e.g., 3"
          min={0}
          hint="Number of days after the previous step before sending"
        />
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="is-active" className="text-sm font-medium text-foreground">
            Active
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            {editItem ? 'Save Changes' : 'Create Template'}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={handleAdd}>
          <Mail className="h-3 w-3" />
          Add Template
        </Button>
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'template_code' && sortDir} onSort={() => onSort('template_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead sortable sorted={sortKey === 'step_number' && sortDir} onSort={() => onSort('step_number')}>Step</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead sortable sorted={sortKey === 'delay_days' && sortDir} onSort={() => onSort('delay_days')}>Delay</TableHead>
            <TableHead>Active</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.template_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <Badge color="blue">Step {row.step_number}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                {row.subject_template}
              </TableCell>
              <TableCell className="text-sm">
                {row.delay_days} {row.delay_days === 1 ? 'day' : 'days'}
              </TableCell>
              <TableCell>
                <Badge color={row.is_active ? 'green' : 'gray'}>
                  {row.is_active ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />

      {/* Template Form SlideOver */}
      <SlideOver
        open={formOpen}
        onClose={handleClose}
        title={editItem ? 'Edit Template' : 'New Follow-up Template'}
        subtitle="Configure an automated follow-up email step"
      >
        {renderForm()}
      </SlideOver>
    </div>
  );
}
