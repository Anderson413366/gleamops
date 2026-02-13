'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Package, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Badge,
  Pagination,
  TableSkeleton,
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  ExportButton,
} from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const UNIT_OPTIONS = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'BOX', label: 'Box' },
  { value: 'CASE', label: 'Case' },
  { value: 'GAL', label: 'Gallon' },
  { value: 'BOTTLE', label: 'Bottle' },
];

interface SuppliesTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function SuppliesTable({ search, autoCreate, onAutoCreateHandled }: SuppliesTableProps) {
  const [rows, setRows] = useState<SupplyCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver form state
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SupplyCatalog | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form field values
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('EA');
  const [unitCost, setUnitCost] = useState('');
  const [sdsUrl, setSdsUrl] = useState('');
  const [sdsUploading, setSdsUploading] = useState(false);
  const [notes, setNotes] = useState('');

  const isEdit = !!editItem;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('supply_catalog')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as SupplyCatalog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-create trigger from parent
  useEffect(() => {
    if (autoCreate && !loading) {
      handleAdd();
      onAutoCreateHandled?.();
    }
  }, [autoCreate, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as SupplyCatalog[];
  const pag = usePagination(sortedRows, 25);

  // --- Form helpers ---

  const resetForm = useCallback(() => {
    setCode('');
    setName('');
    setCategory('');
    setUnit('EA');
    setUnitCost('');
    setSdsUrl('');
    setNotes('');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);

    // Generate next code
    const supabase = getSupabaseBrowserClient();
    supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SUP' }).then(({ data }) => {
      if (data) setCode(data);
    });
  }, [resetForm]);

  const handleEdit = useCallback((row: SupplyCatalog) => {
    setEditItem(row);
    setCode(row.code);
    setName(row.name);
    setCategory(row.category ?? '');
    setUnit(row.unit);
    setUnitCost(row.unit_cost != null ? String(row.unit_cost) : '');
    setSdsUrl(row.sds_url ?? '');
    setNotes(row.notes ?? '');
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Code is required';
    if (!name.trim()) errs.name = 'Name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id;

      const costValue = unitCost.trim() ? parseFloat(unitCost.trim()) : null;

      if (isEdit) {
        const { error } = await supabase
          .from('supply_catalog')
          .update({
            name: name.trim(),
            category: category.trim() || null,
            unit,
            unit_cost: costValue,
            sds_url: sdsUrl.trim() || null,
            notes: notes.trim() || null,
          })
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('supply_catalog').insert({
          code: code.trim(),
          name: name.trim(),
          category: category.trim() || null,
          unit,
          unit_cost: costValue,
          sds_url: sdsUrl.trim() || null,
          notes: notes.trim() || null,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Supply updated' : 'Supply created');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save supply', { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  // --- Render ---

  const handleSdsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSdsUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split('.').pop() ?? 'pdf';
      const path = `sds/${code || 'new'}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      setSdsUrl(urlData.publicUrl);
    } catch (err) {
      console.error('SDS upload error:', err);
      setFormErrors((prev) => ({ ...prev, sds: 'Upload failed. Try pasting a URL instead.' }));
    } finally {
      setSdsUploading(false);
      e.target.value = '';
    }
  };

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Supply Code"
            value={code}
            readOnly
            disabled
            hint="Auto-generated"
            error={formErrors.code}
          />
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }}
            error={formErrors.name}
            required
          />
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            hint="e.g., Cleaning Chemicals, Paper Products"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={UNIT_OPTIONS}
            />
            <Input
              label="Unit Cost ($)"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
              type="number"
              hint="Cost per unit"
            />
          </div>
          <div className="space-y-2">
            <Input
              label="SDS URL"
              value={sdsUrl}
              onChange={(e) => setSdsUrl(e.target.value)}
              placeholder="https://..."
              hint="Safety Data Sheet link"
              error={formErrors.sds}
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer text-primary hover:text-primary/80">
              <Upload className="h-3.5 w-3.5" />
              <span>{sdsUploading ? 'Uploading...' : 'Upload SDS PDF'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleSdsUpload}
                disabled={sdsUploading}
              />
            </label>
          </div>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Create Supply'}
          </Button>
        </div>
      </form>
    );
  }

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No supplies found"
          description={search ? 'Try a different search term.' : 'Add your first supply to get started.'}
        />
        <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Supply' : 'New Supply'} subtitle={isEdit ? editItem?.code : undefined}>
          {renderForm()}
        </SlideOver>
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="supplies"
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Category' },
            { key: 'brand', label: 'Brand' },
            { key: 'unit', label: 'Unit' },
            { key: 'unit_cost', label: 'Cost' },
            { key: 'preferred_vendor', label: 'Vendor' },
            { key: 'supply_status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'code' && sortDir} onSort={() => onSort('code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead sortable sorted={sortKey === 'unit' && sortDir} onSort={() => onSort('unit')}>Unit</TableHead>
            <TableHead sortable sorted={sortKey === 'unit_cost' && sortDir} onSort={() => onSort('unit_cost')}>Cost</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SDS</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleEdit(row)}
            >
              <TableCell className="font-mono text-xs">{row.code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.brand ?? '—'}</TableCell>
              <TableCell>{row.unit}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.unit_cost != null ? `$${Number(row.unit_cost).toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.preferred_vendor ?? '—'}</TableCell>
              <TableCell>
                <Badge color={row.supply_status === 'ACTIVE' ? 'green' : row.supply_status === 'DISCONTINUED' ? 'red' : 'gray'}>
                  {row.supply_status ?? 'ACTIVE'}
                </Badge>
              </TableCell>
              <TableCell>
                {row.sds_url ? (
                  <a
                    href={row.sds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        totalItems={pag.totalItems}
        pageSize={pag.pageSize}
        hasNext={pag.hasNext}
        hasPrev={pag.hasPrev}
        onNext={pag.nextPage}
        onPrev={pag.prevPage}
      />

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Supply' : 'New Supply'} subtitle={isEdit ? editItem?.code : undefined}>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
