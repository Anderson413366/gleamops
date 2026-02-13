'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileImage, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver,
  Input, Button,
} from '@gleamops/ui';
import type { SalesMarketingInsert } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  search: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MarketingInsertsTable({ search }: Props) {
  const [rows, setRows] = useState<SalesMarketingInsert[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver state
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SalesMarketingInsert | null>(null);

  // Form fields
  const [insertCode, setInsertCode] = useState('');
  const [title, setTitle] = useState('');
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
      .from('sales_marketing_inserts')
      .select('*')
      .is('archived_at', null)
      .order('insert_code');
    if (!fetchErr && data) setRows(data as unknown as SalesMarketingInsert[]);
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
        r.insert_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'insert_code', 'asc'
  );
  const sortedRows = sorted as unknown as SalesMarketingInsert[];
  const pag = usePagination(sortedRows, 25);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setInsertCode('');
    setTitle('');
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
    const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'MKI' });
    setInsertCode(codeData || `MKI-${Date.now()}`);

    setFormOpen(true);
  };

  const handleEdit = (item: SalesMarketingInsert) => {
    setEditItem(item);
    setInsertCode(item.insert_code);
    setTitle(item.title);
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
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;
    if (!tenantId) { setSaving(false); setError('Authentication error'); return; }

    const payload = {
      title: title.trim(),
      is_active: isActive,
    };

    if (editItem) {
      const { error: updateErr } = await supabase
        .from('sales_marketing_inserts')
        .update(payload)
        .eq('id', editItem.id);
      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('sales_marketing_inserts')
        .insert({
          ...payload,
          tenant_id: tenantId,
          insert_code: insertCode,
          file_id: '00000000-0000-0000-0000-000000000000', // placeholder — file upload is a future enhancement
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
    toast.success(editItem ? 'Marketing insert updated' : 'Marketing insert created');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) return <TableSkeleton rows={6} cols={3} />;

  function renderForm() {
    return (
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Input
          label="Insert Code"
          value={insertCode}
          disabled
          hint="Auto-generated"
        />
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Company Capabilities Brochure"
          required
        />
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="mki-is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="mki-is-active" className="text-sm font-medium text-foreground">
            Active
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          PDF file upload will be available in a future update.
        </p>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            {editItem ? 'Save Changes' : 'Create Insert'}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={handleAdd}>
            <FileImage className="h-3 w-3" />
            Add Insert
          </Button>
        </div>
        <EmptyState
          icon={<FileImage className="h-12 w-12" />}
          title="No marketing inserts"
          description={search ? 'Try a different search term.' : 'Create your first marketing insert to attach to proposals.'}
        />
        <SlideOver
          open={formOpen}
          onClose={handleClose}
          title={editItem ? 'Edit Marketing Insert' : 'New Marketing Insert'}
          subtitle="Marketing collateral attached to proposals"
        >
          {renderForm()}
        </SlideOver>
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={handleAdd}>
          <FileImage className="h-3 w-3" />
          Add Insert
        </Button>
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'insert_code' && sortDir} onSort={() => onSort('insert_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'title' && sortDir} onSort={() => onSort('title')}>Title</TableHead>
            <TableHead>Active</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.insert_code}</TableCell>
              <TableCell className="font-medium">{row.title}</TableCell>
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

      {/* Marketing Insert Form SlideOver */}
      <SlideOver
        open={formOpen}
        onClose={handleClose}
        title={editItem ? 'Edit Marketing Insert' : 'New Marketing Insert'}
        subtitle="Marketing collateral attached to proposals"
      >
        {renderForm()}
      </SlideOver>
    </div>
  );
}
