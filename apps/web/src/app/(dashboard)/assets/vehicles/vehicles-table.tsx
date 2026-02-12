'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
  SlideOver, Input, Select, Textarea, Button,
} from '@gleamops/ui';
import { VEHICLE_STATUS_COLORS } from '@gleamops/shared';
import type { Vehicle } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface StaffOption {
  id: string;
  full_name: string;
  staff_code: string;
}

interface VehicleWithAssigned extends Vehicle {
  assigned?: { full_name: string; staff_code: string } | null;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_SHOP', label: 'In Shop' },
  { value: 'RETIRED', label: 'Retired' },
];

const EMPTY_FORM = {
  vehicle_code: '',
  name: '',
  make: '',
  model: '',
  year: '',
  license_plate: '',
  vin: '',
  color: '',
  status: 'ACTIVE',
  assigned_to: '',
  notes: '',
};

interface VehiclesTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function VehiclesTable({ search, formOpen, onFormClose, onRefresh }: VehiclesTableProps) {
  const [rows, setRows] = useState<VehicleWithAssigned[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  // Form state
  const [slideOpen, setSlideOpen] = useState(false);
  const [editItem, setEditItem] = useState<VehicleWithAssigned | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const supabase = getSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, assigned:assigned_to(full_name, staff_code)')
      .is('archived_at', null)
      .order('vehicle_code');
    if (!error && data) setRows(data as unknown as VehicleWithAssigned[]);
    setLoading(false);
  }, [supabase]);

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, full_name, staff_code')
      .is('archived_at', null)
      .order('full_name');
    if (data) setStaffOptions(data as unknown as StaffOption[]);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Handle external form open trigger (New Vehicle button from parent)
  useEffect(() => {
    if (formOpen) {
      setEditItem(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setSlideOpen(true);
      // Generate next code
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'VEH' }).then(({ data }) => {
        if (data) setForm((prev) => ({ ...prev, vehicle_code: data }));
      });
    }
  }, [formOpen, supabase]);

  const handleEdit = (row: VehicleWithAssigned) => {
    setEditItem(row);
    setForm({
      vehicle_code: row.vehicle_code,
      name: row.name ?? '',
      make: row.make ?? '',
      model: row.model ?? '',
      year: row.year?.toString() ?? '',
      license_plate: row.license_plate ?? '',
      vin: row.vin ?? '',
      color: row.color ?? '',
      status: row.status,
      assigned_to: row.assigned_to ?? '',
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
    if (!form.vehicle_code) errs.vehicle_code = 'Code is required';
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicle_code: form.vehicle_code,
        name: form.name || null,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? Number(form.year) : null,
        license_plate: form.license_plate || null,
        vin: form.vin || null,
        color: form.color || null,
        status: form.status,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
      };

      if (editItem) {
        const { error } = await supabase
          .from('vehicles')
          .update(payload)
          .eq('id', editItem.id)
          .eq('version_etag', editItem.version_etag);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.app_metadata?.tenant_id;
        const { error } = await supabase.from('vehicles').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      onRefresh?.();
      toast.success(editItem ? 'Vehicle updated' : 'Vehicle created');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save vehicle', { duration: Infinity });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.vehicle_code.toLowerCase().includes(q) ||
        (r.name?.toLowerCase().includes(q) ?? false) ||
        (r.make?.toLowerCase().includes(q) ?? false) ||
        (r.model?.toLowerCase().includes(q) ?? false) ||
        (r.license_plate?.toLowerCase().includes(q) ?? false) ||
        (r.assigned?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'vehicle_code', 'asc'
  );
  const sortedRows = sorted as unknown as VehicleWithAssigned[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="No vehicles found"
          description={search ? 'Try a different search term.' : 'Add your first vehicle to get started.'}
        />
        <VehicleSlideOver
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
        />
      </>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'vehicle_code' && sortDir} onSort={() => onSort('vehicle_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Make / Model</TableHead>
            <TableHead sortable sorted={sortKey === 'year' && sortDir} onSort={() => onSort('year')}>Year</TableHead>
            <TableHead>License Plate</TableHead>
            <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
            <TableHead>Assigned To</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.vehicle_code}</TableCell>
              <TableCell className="font-medium">{row.name ?? '—'}</TableCell>
              <TableCell className="text-muted">
                {[row.make, row.model].filter(Boolean).join(' ') || '—'}
              </TableCell>
              <TableCell className="text-muted">{row.year ?? '—'}</TableCell>
              <TableCell className="text-muted">{row.license_plate ?? '—'}</TableCell>
              <TableCell>
                <Badge color={VEHICLE_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell className="text-muted">
                {row.assigned?.full_name ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <VehicleSlideOver
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
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SlideOver form
// ---------------------------------------------------------------------------

interface VehicleSlideOverProps {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  editItem: VehicleWithAssigned | null;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  formErrors: Record<string, string>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  staffOptions: StaffOption[];
}

function VehicleSlideOver({
  open, onClose, isEdit, editItem, form, setForm, formErrors, saving, onSave, staffOptions,
}: VehicleSlideOverProps) {
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Vehicle' : 'New Vehicle'}
      subtitle={isEdit ? editItem?.vehicle_code : undefined}
    >
      <form onSubmit={onSave} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Vehicle Code"
            value={form.vehicle_code}
            readOnly
            disabled
            hint="Auto-generated"
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Make"
              value={form.make}
              onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
            />
            <Input
              label="Model"
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
            />
            <Input
              label="License Plate"
              value={form.license_plate}
              onChange={(e) => setForm((p) => ({ ...p, license_plate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="VIN"
              value={form.vin}
              onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))}
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            options={STATUS_OPTIONS}
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
            {isEdit ? 'Save Changes' : 'Create Vehicle'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
