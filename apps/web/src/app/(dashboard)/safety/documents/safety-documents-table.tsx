'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText, Sparkles } from 'lucide-react';
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
} from '@gleamops/ui';
import type { SafetyDocument } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const DOC_TYPE_OPTIONS = [
  { value: 'SDS', label: 'Safety Data Sheet (SDS)' },
  { value: 'SAFETY_PLAN', label: 'Safety Plan' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'REGULATION', label: 'Regulation' },
  { value: 'TRAINING_MATERIAL', label: 'Training Material' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUPERSEDED', label: 'Superseded' },
];

interface SafetyDocumentsTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function SafetyDocumentsTable({ search, autoCreate, onAutoCreateHandled }: SafetyDocumentsTableProps) {
  const [rows, setRows] = useState<SafetyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SafetyDocument | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form fields
  const [docCode, setDocCode] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('SDS');
  const [category, setCategory] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [notes, setNotes] = useState('');

  const isEdit = !!editItem;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('safety_documents')
      .select('*')
      .is('archived_at', null)
      .order('title');
    if (!error && data) setRows(data as unknown as SafetyDocument[]);
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
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.document_code.toLowerCase().includes(q) ||
        r.document_type.toLowerCase().includes(q) ||
        (r.category?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'title',
    'asc'
  );
  const sortedRows = sorted as unknown as SafetyDocument[];
  const pag = usePagination(sortedRows, 25);

  const resetForm = useCallback(() => {
    setDocCode('');
    setTitle('');
    setDocumentType('SDS');
    setCategory('');
    setEffectiveDate('');
    setReviewDate('');
    setExpiryDate('');
    setStatus('DRAFT');
    setNotes('');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
    const supabase = getSupabaseBrowserClient();
    supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'SDC' }).then(({ data }) => {
      if (data) setDocCode(data);
    });
  }, [resetForm]);

  const handleEdit = useCallback((row: SafetyDocument) => {
    setEditItem(row);
    setDocCode(row.document_code);
    setTitle(row.title);
    setDocumentType(row.document_type);
    setCategory(row.category ?? '');
    setEffectiveDate(row.effective_date ?? '');
    setReviewDate(row.review_date ?? '');
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
    if (!docCode.trim()) errs.docCode = 'Document code is required';
    if (!title.trim()) errs.title = 'Title is required';
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
        document_code: docCode.trim(),
        title: title.trim(),
        document_type: documentType,
        category: category.trim() || null,
        effective_date: effectiveDate || null,
        review_date: reviewDate || null,
        expiry_date: expiryDate || null,
        status,
        applies_to_sites: false,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('safety_documents')
          .update(payload)
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('safety_documents').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Document updated' : 'Document created');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save document';
      toast.error(msg, { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  const docTypeLabel = (t: string) => DOC_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Document Code"
            value={docCode}
            readOnly
            disabled
            hint="Auto-generated"
            error={formErrors.docCode}
          />
          <Input
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFormErrors((prev) => { const n = { ...prev }; delete n.title; return n; });
            }}
            error={formErrors.title}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Document Type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              options={DOC_TYPE_OPTIONS}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            hint="e.g., Chemical Safety, PPE, Emergency"
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Effective Date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              type="date"
            />
            <Input
              label="Review Date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              type="date"
            />
            <Input
              label="Expiry Date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              type="date"
            />
          </div>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Create Document'}
          </Button>
        </div>
      </form>
    );
  }

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={(
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <FileText className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No safety documents found"
          description={search ? 'Try a different search term.' : 'Build a living safety library for field teams and supervisors.'}
          actionLabel={search ? undefined : '+ Add Your First Safety Document'}
          onAction={search ? undefined : handleAdd}
        >
          {!search && (
            <ul className="space-y-2 text-left text-sm text-muted-foreground">
              <li>Centralize SDS files, procedures, and policy updates.</li>
              <li>Track review and expiry dates before they become risks.</li>
              <li>Give crews one trusted source of current safety guidance.</li>
            </ul>
          )}
        </EmptyState>
        <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Document' : 'New Safety Document'}>
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
          filename="safety-documents"
          columns={[
            { key: 'document_code', label: 'Code' },
            { key: 'title', label: 'Title' },
            { key: 'document_type', label: 'Type' },
            { key: 'category', label: 'Category' },
            { key: 'effective_date', label: 'Effective' },
            { key: 'review_date', label: 'Review' },
            { key: 'expiry_date', label: 'Expires' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'document_code' && sortDir} onSort={() => onSort('document_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'title' && sortDir} onSort={() => onSort('title')}>Title</TableHead>
            <TableHead sortable sorted={sortKey === 'document_type' && sortDir} onSort={() => onSort('document_type')}>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead sortable sorted={sortKey === 'review_date' && sortDir} onSort={() => onSort('review_date')}>Review</TableHead>
            <TableHead sortable sorted={sortKey === 'expiry_date' && sortDir} onSort={() => onSort('expiry_date')}>Expires</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleEdit(row)}>
              <TableCell className="font-mono text-xs">{row.document_code}</TableCell>
              <TableCell className="font-medium">{row.title}</TableCell>
              <TableCell className="text-muted-foreground">{docTypeLabel(row.document_type)}</TableCell>
              <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.review_date ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.expiry_date ?? '—'}</TableCell>
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

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Document' : 'New Safety Document'}>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
