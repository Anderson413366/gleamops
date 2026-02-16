'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Award, Sparkles } from 'lucide-react';
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
  Pagination,
  TableSkeleton,
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  ExportButton,
  cn,
} from '@gleamops/ui';
import type { StaffCertification } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'PENDING', label: 'Pending' },
];
const FILTER_STATUS_OPTIONS = ['all', 'ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING'] as const;

interface CertificationsTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

interface CertRow extends StaffCertification {
  staff?: { full_name: string } | null;
}

export default function CertificationsTable({ search, autoCreate, onAutoCreateHandled }: CertificationsTableProps) {
  const [rows, setRows] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // SlideOver form state
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CertRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Staff lookup for dropdown
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);

  // Form fields
  const [staffId, setStaffId] = useState('');
  const [certName, setCertName] = useState('');
  const [issuingAuth, setIssuingAuth] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');

  const isEdit = !!editItem;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [certRes, staffRes] = await Promise.all([
      supabase
        .from('staff_certifications')
        .select('*, staff:staff_id(full_name)')
        .is('archived_at', null)
        .order('certification_name'),
      supabase
        .from('staff')
        .select('id, full_name')
        .is('archived_at', null)
        .order('full_name'),
    ]);
    if (!certRes.error && certRes.data) setRows(certRes.data as unknown as CertRow[]);
    if (!staffRes.error && staffRes.data) setStaffList(staffRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoCreate && !loading) {
      handleAdd();
      onAutoCreateHandled?.();
    }
  }, [autoCreate, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.status ?? 'ACTIVE') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.certification_name.toLowerCase().includes(q) ||
        (r.staff?.full_name?.toLowerCase().includes(q)) ||
        (r.issuing_authority?.toLowerCase().includes(q)) ||
        (r.certification_number?.toLowerCase().includes(q))
    );
  }, [rows, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'ACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'certification_name',
    'asc'
  );
  const sortedRows = sorted as unknown as CertRow[];
  const pag = usePagination(sortedRows, 25);

  // Form helpers
  const resetForm = useCallback(() => {
    setStaffId('');
    setCertName('');
    setIssuingAuth('');
    setCertNumber('');
    setIssuedDate('');
    setExpiryDate('');
    setStatus('ACTIVE');
    setNotes('');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const handleEdit = useCallback((row: CertRow) => {
    setEditItem(row);
    setStaffId(row.staff_id);
    setCertName(row.certification_name);
    setIssuingAuth(row.issuing_authority ?? '');
    setCertNumber(row.certification_number ?? '');
    setIssuedDate(row.issued_date ?? '');
    setExpiryDate(row.expiry_date ?? '');
    setStatus(row.status);
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
    if (!staffId) errs.staffId = 'Staff member is required';
    if (!certName.trim()) errs.certName = 'Certification name is required';
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

      const payload = {
        staff_id: staffId,
        certification_name: certName.trim(),
        issuing_authority: issuingAuth.trim() || null,
        certification_number: certNumber.trim() || null,
        issued_date: issuedDate || null,
        expiry_date: expiryDate || null,
        status,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('staff_certifications')
          .update(payload)
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_certifications').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Certification updated' : 'Certification added');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save certification';
      toast.error(msg, { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Select
            label="Staff Member"
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setFormErrors((prev) => { const n = { ...prev }; delete n.staffId; return n; });
            }}
            options={[
              { value: '', label: 'Select staff...' },
              ...staffList.map((s) => ({ value: s.id, label: s.full_name })),
            ]}
            error={formErrors.staffId}
            required
          />
          <Input
            label="Certification Name"
            value={certName}
            onChange={(e) => {
              setCertName(e.target.value);
              setFormErrors((prev) => { const n = { ...prev }; delete n.certName; return n; });
            }}
            error={formErrors.certName}
            required
          />
          <Input
            label="Issuing Authority"
            value={issuingAuth}
            onChange={(e) => setIssuingAuth(e.target.value)}
            hint="e.g., OSHA, ISSA, State Board"
          />
          <Input
            label="Certification Number"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Issued Date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              type="date"
            />
            <Input
              label="Expiry Date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              type="date"
            />
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Add Certification'}
          </Button>
        </div>
      </form>
    );
  }

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No certifications yet'
    : `No ${selectedStatusLabel} certifications`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track certification records and expiration timelines across staff.'
      : 'All certifications are currently in other statuses.';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                statusFilter === status ? 'bg-white/20' : 'bg-background'
              )}
            >
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="certifications"
          columns={[
            { key: 'certification_name', label: 'Certification' },
            { key: 'issuing_authority', label: 'Authority' },
            { key: 'certification_number', label: 'Number' },
            { key: 'issued_date', label: 'Issued' },
            { key: 'expiry_date', label: 'Expires' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'certification_name' && sortDir} onSort={() => onSort('certification_name')}>Certification</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead sortable sorted={sortKey === 'issuing_authority' && sortDir} onSort={() => onSort('issuing_authority')}>Authority</TableHead>
            <TableHead sortable sorted={sortKey === 'issued_date' && sortDir} onSort={() => onSort('issued_date')}>Issued</TableHead>
            <TableHead sortable sorted={sortKey === 'expiry_date' && sortDir} onSort={() => onSort('expiry_date')}>Expires</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-medium">{row.certification_name}</TableCell>
              <TableCell className="text-muted-foreground">{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.issuing_authority ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.issued_date ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.expiry_date ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Award className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={search || statusFilter !== 'all' ? undefined : '+ Add Your First Certification'}
            onAction={search || statusFilter !== 'all' ? undefined : handleAdd}
          >
            {!search && statusFilter === 'all' && (
              <ul className="space-y-2 text-left text-sm text-muted-foreground">
                <li>Keep proof of compliance organized by staff member.</li>
                <li>Identify expirations early to avoid scheduling disruptions.</li>
                <li>Reduce audit prep time with a complete certification ledger.</li>
              </ul>
            )}
          </EmptyState>
        </div>
      )}
      {filtered.length > 0 && (
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
      )}

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Certification' : 'New Certification'}>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
