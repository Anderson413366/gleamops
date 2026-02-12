'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { KeyRound } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
  SlideOver, Input, Select, Textarea, Button,
} from '@gleamops/ui';
import { KEY_STATUS_COLORS } from '@gleamops/shared';
import type { KeyInventory } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface StaffOption {
  id: string;
  full_name: string;
  staff_code: string;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface KeyWithRelations extends KeyInventory {
  site?: { name: string; site_code: string } | null;
  assigned?: { full_name: string; staff_code: string } | null;
}

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETURNED', label: 'Returned' },
];

const KEY_TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'FOB', label: 'Fob' },
  { value: 'CARD', label: 'Card' },
  { value: 'CODE', label: 'Code' },
  { value: 'OTHER', label: 'Other' },
];

const EMPTY_FORM = {
  key_code: '',
  label: '',
  key_type: 'STANDARD',
  site_id: '',
  total_count: '1',
  assigned_to: '',
  status: 'AVAILABLE',
  notes: '',
};

interface KeysTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function KeysTable({ search, formOpen, onFormClose, onRefresh }: KeysTableProps) {
  const [rows, setRows] = useState<KeyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);

  // Form state
  const [slideOpen, setSlideOpen] = useState(false);
  const [editItem, setEditItem] = useState<KeyWithRelations | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const supabase = getSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('key_inventory')
      .select('*, site:site_id(name, site_code), assigned:assigned_to(full_name, staff_code)')
      .is('archived_at', null)
      .order('key_code');
    if (!error && data) setRows(data as unknown as KeyWithRelations[]);
    setLoading(false);
  }, [supabase]);

  const fetchOptions = useCallback(async () => {
    const [staffRes, siteRes] = await Promise.all([
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .order('full_name'),
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name'),
    ]);
    if (staffRes.data) setStaffOptions(staffRes.data as unknown as StaffOption[]);
    if (siteRes.data) setSiteOptions(siteRes.data as unknown as SiteOption[]);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  // Handle external form open trigger (New Key button from parent)
  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setSlideOpen(true);
      // Generate next code
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'KEY' }).then(({ data }) => {
        if (data) setForm((prev) => ({ ...prev, key_code: data }));
      });
    }
  }, [formOpen, supabase]);

  const handleEdit = (row: KeyWithRelations) => {
    setEditItem(row);
    setForm({
      key_code: row.key_code,
      label: row.label ?? '',
      key_type: row.key_type,
      site_id: row.site_id ?? '',
      total_count: row.total_count?.toString() ?? '1',
      assigned_to: row.assigned_to ?? '',
      status: row.status,
      notes: row.notes ?? '',
    });
    setFormErrors({});
    setSlideOpen(true);
  };

  const handleClose = () => {
    setSlideOpen(false);
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    onFormClose?.();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errs: Record<string, string> = {};
    if (!form.key_code) errs.key_code = 'Code is required';
    if (!form.label) errs.label = 'Label is required';
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        key_code: form.key_code,
        label: form.label,
        key_type: form.key_type,
        site_id: form.site_id || null,
        total_count: form.total_count ? Number(form.total_count) : 1,
        assigned_to: form.assigned_to || null,
        status: form.status,
        notes: form.notes || null,
      };

      if (editItem) {
        const { error } = await supabase
          .from('key_inventory')
          .update(payload)
          .eq('id', editItem.id)
          .eq('version_etag', editItem.version_etag);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.app_metadata?.tenant_id;
        const { error } = await supabase.from('key_inventory').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save key:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.key_code.toLowerCase().includes(q) ||
        (r.label?.toLowerCase().includes(q) ?? false) ||
        r.key_type.toLowerCase().includes(q) ||
        (r.site?.name?.toLowerCase().includes(q) ?? false) ||
        (r.assigned?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'key_code', 'asc'
  );
  const sortedRows = sorted as unknown as KeyWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<KeyRound className="h-12 w-12" />}
          title="No keys found"
          description={search ? 'Try a different search term.' : 'Add your first key to get started.'}
        />
        <KeySlideOver
          open={slideOpen}
          onClose={handleClose}
          isEdit={!!editItem}
          editItem={editItem}
          form={form}
          setForm={setForm}
          formErrors={formErrors}
          saving={saving}
          onSave={handleSave}
          staffOptions={staffOptions}
          siteOptions={siteOptions}
        />
      </>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'key_code' && sortDir} onSort={() => onSort('key_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'label' && sortDir} onSort={() => onSort('label')}>Label</TableHead>
            <TableHead sortable sorted={sortKey === 'key_type' && sortDir} onSort={() => onSort('key_type')}>Type</TableHead>
            <TableHead>Site</TableHead>
            <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead sortable sorted={sortKey === 'total_count' && sortDir} onSort={() => onSort('total_count')}>Count</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.key_code}</TableCell>
              <TableCell className="font-medium">{row.label ?? '—'}</TableCell>
              <TableCell>
                <Badge color="blue">{row.key_type}</Badge>
              </TableCell>
              <TableCell className="text-muted">
                {row.site?.name ?? '—'}
              </TableCell>
              <TableCell>
                <Badge color={KEY_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell className="text-muted">
                {row.assigned?.full_name ?? '—'}
              </TableCell>
              <TableCell className="text-muted">{row.total_count ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <KeySlideOver
        open={slideOpen}
        onClose={handleClose}
        isEdit={!!editItem}
        editItem={editItem}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        saving={saving}
        onSave={handleSave}
        staffOptions={staffOptions}
        siteOptions={siteOptions}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SlideOver form
// ---------------------------------------------------------------------------

interface KeySlideOverProps {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  editItem: KeyWithRelations | null;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  formErrors: Record<string, string>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  staffOptions: StaffOption[];
  siteOptions: SiteOption[];
}

function KeySlideOver({
  open, onClose, isEdit, editItem, form, setForm, formErrors, saving, onSave, staffOptions, siteOptions,
}: KeySlideOverProps) {
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Key' : 'New Key'}
      subtitle={isEdit ? editItem?.key_code : undefined}
    >
      <form onSubmit={onSave} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Key Code"
            value={form.key_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Label"
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            error={formErrors.label}
            required
          />
          <Select
            label="Key Type"
            value={form.key_type}
            onChange={(e) => setForm((p) => ({ ...p, key_type: e.target.value }))}
            options={KEY_TYPE_OPTIONS}
          />
          <Select
            label="Site"
            value={form.site_id}
            onChange={(e) => setForm((p) => ({ ...p, site_id: e.target.value }))}
            options={[
              { value: '', label: 'No site' },
              ...siteOptions.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.site_code})`,
              })),
            ]}
          />
          <Input
            label="Total Count"
            type="number"
            value={form.total_count}
            onChange={(e) => setForm((p) => ({ ...p, total_count: e.target.value }))}
          />
          <Select
            label="Assigned To"
            value={form.assigned_to}
            onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
            options={[
              { value: '', label: 'Unassigned' },
              ...staffOptions.map((s) => ({
                value: s.id,
                label: `${s.full_name} (${s.staff_code})`,
              })),
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            options={STATUS_OPTIONS}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Key'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
