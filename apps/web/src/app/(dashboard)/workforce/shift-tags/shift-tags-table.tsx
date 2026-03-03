'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge, Button, ConfirmDialog, EmptyState, Input, Pagination, Select,
  SlideOver, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton,
} from '@gleamops/ui';
import type { StatusColor } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface ShiftTag {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  description: string;
  is_active: boolean;
  version_etag: string;
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'red', label: 'Red' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'gray', label: 'Gray' },
];

const VALID_COLORS: Record<string, StatusColor> = {
  blue: 'blue', green: 'green', yellow: 'yellow', red: 'red',
  purple: 'purple', orange: 'orange', gray: 'gray',
};

const EMPTY_FORM = { name: '', color: 'blue', description: '' };

export default function ShiftTagsTable({ search }: { search: string }) {
  const [tags, setTags] = useState<ShiftTag[]>([]);
  const [loading, setLoading] = useState(true);

  /* --- Form state --- */
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ShiftTag | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* --- Delete state --- */
  const [deleteTarget, setDeleteTarget] = useState<ShiftTag | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('shift_tags')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (error) {
      console.error('[ShiftTags] Fetch error:', error.message);
    } else if (data) {
      setTags(data as ShiftTag[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* --- Filtering + sorting --- */
  const filtered = useMemo(() => {
    if (!search) return tags;
    const q = search.toLowerCase();
    return tags.filter((t) =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [tags, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc',
  );
  const sortedRows = sorted as unknown as ShiftTag[];
  const pag = usePagination(sortedRows, 25);

  /* --- Open add form --- */
  const openAdd = () => {
    setEditingTag(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  /* --- Open edit form --- */
  const openEdit = (tag: ShiftTag) => {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color, description: tag.description });
    setFormOpen(true);
  };

  /* --- Save (create or update) --- */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tag name is required'); return; }
    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    if (editingTag) {
      const { error } = await supabase
        .from('shift_tags')
        .update({
          name: form.name.trim(),
          color: form.color,
          description: form.description.trim(),
        })
        .eq('id', editingTag.id)
        .eq('version_etag', editingTag.version_etag);

      if (error) {
        toast.error(error.message?.includes('duplicate') ? 'A tag with this name already exists' : 'Failed to update shift tag');
        setSaving(false);
        return;
      }
      toast.success('Shift tag updated');
    } else {
      const { error } = await supabase.from('shift_tags').insert({
        name: form.name.trim(),
        color: form.color,
        description: form.description.trim(),
      });

      if (error) {
        toast.error(error.message?.includes('duplicate') ? 'A tag with this name already exists' : 'Failed to create shift tag');
        setSaving(false);
        return;
      }
      toast.success('Shift tag created');
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
      .from('shift_tags')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Failed to delete shift tag');
    } else {
      toast.success('Shift tag deleted');
      fetchData();
    }
    setDeleteTarget(null);
  };

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} shift tag{filtered.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Shift Tag
        </Button>
      </div>

      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Tag Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead sortable sorted={sortKey === 'description' && sortDir} onSort={() => onSort('description')}>Description</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((tag) => (
            <TableRow key={tag.id} className="cursor-pointer" onClick={() => openEdit(tag)}>
              <TableCell className="font-medium text-foreground">{tag.name}</TableCell>
              <TableCell>
                <Badge color={VALID_COLORS[tag.color] ?? 'gray'}>{tag.color}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[300px] truncate">{tag.description}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(tag); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag); }}>
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
            icon={<Tag className="h-10 w-10" />}
            title={search ? 'No matching shift tags' : 'No Shift Tags'}
            description={search ? 'Try a different search term.' : 'Create tags to categorize and group shifts for easier management.'}
            actionLabel={search ? undefined : '+ Add Shift Tag'}
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
        title={editingTag ? 'Edit Shift Tag' : 'Add Shift Tag'}
      >
        <div className="space-y-4">
          <Input
            label="Tag Name"
            placeholder="e.g. Training"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Color"
            options={COLOR_OPTIONS}
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <Badge color={VALID_COLORS[form.color] ?? 'gray'}>{form.name || 'Tag Name'}</Badge>
          </div>
          <Input
            label="Description"
            placeholder="What this tag is used for"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} loading={saving}>
              {editingTag ? 'Update Tag' : 'Create Tag'}
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
        title="Delete Shift Tag"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
