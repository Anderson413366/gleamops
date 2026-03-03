'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge, Button, ConfirmDialog, EmptyState, Input, Pagination, Select,
  SlideOver, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface BreakRule {
  id: string;
  tenant_id: string;
  name: string;
  duration_minutes: number;
  is_paid: boolean;
  applies_to: string;
  min_shift_hours: number;
  is_active: boolean;
  version_etag: string;
}

const PAID_OPTIONS = [
  { value: 'true', label: 'Paid' },
  { value: 'false', label: 'Unpaid' },
];

const EMPTY_FORM = { name: '', duration_minutes: 15, is_paid: false, applies_to: 'All Positions', min_shift_hours: 4 };

export default function BreakRulesTable({ search }: { search: string }) {
  const [rules, setRules] = useState<BreakRule[]>([]);
  const [loading, setLoading] = useState(true);

  /* --- Form state --- */
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BreakRule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* --- Delete state --- */
  const [deleteTarget, setDeleteTarget] = useState<BreakRule | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('break_rules')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (error) {
      console.error('[BreakRules] Fetch error:', error.message);
    } else if (data) {
      setRules(data as BreakRule[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* --- Filtering + sorting --- */
  const filtered = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) =>
      r.name.toLowerCase().includes(q) || r.applies_to.toLowerCase().includes(q),
    );
  }, [rules, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc',
  );
  const sortedRows = sorted as unknown as BreakRule[];
  const pag = usePagination(sortedRows, 25);

  /* --- Open add form --- */
  const openAdd = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  /* --- Open edit form --- */
  const openEdit = (rule: BreakRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      duration_minutes: rule.duration_minutes,
      is_paid: rule.is_paid,
      applies_to: rule.applies_to,
      min_shift_hours: rule.min_shift_hours,
    });
    setFormOpen(true);
  };

  /* --- Save (create or update) --- */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    if (form.duration_minutes <= 0) { toast.error('Duration must be positive'); return; }
    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    if (editingRule) {
      const { error } = await supabase
        .from('break_rules')
        .update({
          name: form.name.trim(),
          duration_minutes: form.duration_minutes,
          is_paid: form.is_paid,
          applies_to: form.applies_to.trim() || 'All Positions',
          min_shift_hours: form.min_shift_hours,
        })
        .eq('id', editingRule.id)
        .eq('version_etag', editingRule.version_etag);

      if (error) {
        toast.error('Failed to update break rule');
        setSaving(false);
        return;
      }
      toast.success('Break rule updated');
    } else {
      const { error } = await supabase.from('break_rules').insert({
        name: form.name.trim(),
        duration_minutes: form.duration_minutes,
        is_paid: form.is_paid,
        applies_to: form.applies_to.trim() || 'All Positions',
        min_shift_hours: form.min_shift_hours,
      });

      if (error) {
        toast.error('Failed to create break rule');
        setSaving(false);
        return;
      }
      toast.success('Break rule created');
    }

    setSaving(false);
    setFormOpen(false);
    fetchData();
  };

  /* --- Delete (soft) --- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('break_rules')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Failed to delete break rule');
    } else {
      toast.success('Break rule deleted');
      fetchData();
    }
    setDeleteTarget(null);
  };

  if (loading) return <TableSkeleton rows={4} cols={6} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} break rule{filtered.length !== 1 ? 's' : ''} configured
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Break Rule
        </Button>
      </div>

      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Rule Name</TableHead>
            <TableHead sortable sorted={sortKey === 'duration_minutes' && sortDir} onSort={() => onSort('duration_minutes')}>Duration</TableHead>
            <TableHead>Paid/Unpaid</TableHead>
            <TableHead>Applies To</TableHead>
            <TableHead sortable sorted={sortKey === 'min_shift_hours' && sortDir} onSort={() => onSort('min_shift_hours')}>Min Shift Hours</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((rule) => (
            <TableRow key={rule.id} className="cursor-pointer" onClick={() => openEdit(rule)}>
              <TableCell className="font-medium text-foreground">{rule.name}</TableCell>
              <TableCell className="text-muted-foreground">{rule.duration_minutes} min</TableCell>
              <TableCell>
                <Badge color={rule.is_paid ? 'green' : 'gray'}>{rule.is_paid ? 'Paid' : 'Unpaid'}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{rule.applies_to}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{rule.min_shift_hours}h</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(rule); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setDeleteTarget(rule); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<Coffee className="h-10 w-10" />}
            title={search ? 'No matching break rules' : 'No Break Rules'}
            description={search ? 'Try a different search term.' : 'Configure break rules to automatically apply breaks to shifts based on duration.'}
            actionLabel={search ? undefined : '+ Add Break Rule'}
            onAction={search ? undefined : openAdd}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages}
          totalItems={pag.totalItems} pageSize={pag.pageSize}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
        />
      )}

      {/* Add / Edit SlideOver */}
      <SlideOver
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRule ? 'Edit Break Rule' : 'Add Break Rule'}
      >
        <div className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g. Standard Break"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 0 }))}
            required
          />
          <Select
            label="Paid / Unpaid"
            options={PAID_OPTIONS}
            value={String(form.is_paid)}
            onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.value === 'true' }))}
          />
          <Input
            label="Applies To"
            placeholder="e.g. All Positions, Day Porter"
            value={form.applies_to}
            onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
          />
          <Input
            label="Min Shift Hours"
            type="number"
            min={0}
            step={0.5}
            value={form.min_shift_hours}
            onChange={(e) => setForm((f) => ({ ...f, min_shift_hours: Number(e.target.value) || 0 }))}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} loading={saving}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Break Rule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
