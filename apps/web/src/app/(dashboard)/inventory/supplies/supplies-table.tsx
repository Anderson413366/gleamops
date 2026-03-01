'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isExternalHttpUrl } from '@/lib/url';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Pagination,
  TableSkeleton,
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  ExportButton,
  ViewToggle,
  StatusDot,
  statusRowAccentClass,
  cn,
} from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { getStatusPillColor } from '@/lib/utils/status-colors';
import { useViewPreference } from '@/hooks/use-view-preference';
import { SuppliesCardGrid } from './supplies-card-grid';
import { EntityAvatar } from '@/components/directory/entity-avatar';

const UNIT_OPTIONS = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'BOX', label: 'Box' },
  { value: 'CASE', label: 'Case' },
  { value: 'GAL', label: 'Gallon' },
  { value: 'BOTTLE', label: 'Bottle' },
];
// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'DISCONTINUED', 'all'] as const;

function normalizeSupplyStatus(value: string | null | undefined): string {
  if (!value) return 'ACTIVE';
  return value.toUpperCase();
}

function toTitleCase(str: string): string {
  if (str !== str.toUpperCase()) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SuppliesTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function SuppliesTable({ search, autoCreate, onAutoCreateHandled }: SuppliesTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<SupplyCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const { view, setView } = useViewPreference('supplies');

  // SlideOver form state (create only)
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form field values (create only)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('EA');
  const [unitCost, setUnitCost] = useState('');
  const [sdsUrl, setSdsUrl] = useState('');
  const [sdsUploading, setSdsUploading] = useState(false);
  const [notes, setNotes] = useState('');

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = normalizeSupplyStatus(row.supply_status);
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((row) => normalizeSupplyStatus(row.supply_status) === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q))
    );
  }, [rows, search, statusFilter]);

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

  const handleRowClick = useCallback((row: SupplyCatalog) => {
    router.push(`/inventory/supplies/${row.code}`);
  }, [router]);

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

      handleClose();
      fetchData();
      toast.success('Supply created');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save supply';
      toast.error(message, { duration: Infinity });
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
            Create Supply
          </Button>
        </div>
      </form>
    );
  }

  if (loading) return <TableSkeleton rows={8} cols={8} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No supplies yet'
    : `No ${selectedStatusLabel} supplies`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track catalog items, unit costs, and safety documents in one place.'
      : `There are currently no supplies with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
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
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? getStatusPillColor(status)
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Supply' : undefined}
            onAction={showGuidedEmptyState ? handleAdd : undefined}
          />
        ) : (
          <SuppliesCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'code' && sortDir} onSort={() => onSort('code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                  <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead sortable sorted={sortKey === 'unit' && sortDir} onSort={() => onSort('unit')}>Unit</TableHead>
                  <TableHead sortable sorted={sortKey === 'unit_cost' && sortDir} onSort={() => onSort('unit_cost')}>Cost</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>SDS</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={statusRowAccentClass(normalizeSupplyStatus(row.supply_status))}
                  >
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <StatusDot status={normalizeSupplyStatus(row.supply_status)} />
                        <span>{row.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <EntityAvatar
                          name={row.name}
                          seed={row.code}
                          imageUrl={row.image_url}
                          fallbackIcon={<Package className="h-3.5 w-3.5" />}
                          size="sm"
                        />
                        <span className="inline-block max-w-[220px] truncate" title={row.name}>{toTitleCase(row.name)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.brand ?? '—'}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.unit_cost != null ? `$${Number(row.unit_cost).toFixed(2)}` : '$0.00'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.preferred_vendor ?? '—'}</TableCell>
                    <TableCell>
                      {isExternalHttpUrl(row.sds_url) ? (
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
                      ) : row.sds_url ? (
                        <span className="text-muted-foreground" title={row.sds_url}>On File</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Supply' : undefined}
                onAction={showGuidedEmptyState ? handleAdd : undefined}
              />
            </div>
          )}
        </>
      )}
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

      <SlideOver open={formOpen} onClose={handleClose} title="New Supply">
        {renderForm()}
      </SlideOver>
    </div>
  );
}
