'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { HardHat, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Subcontractor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, ViewToggle, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { SubcontractorsCardGrid } from './subcontractors-card-grid';

// Per product rule: default to ACTIVE; ACTIVE first; ALL last.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'PENDING', 'all'] as const;

interface Props {
  search: string;
  onSelect?: (sub: Subcontractor) => void;
}

function formatDate(d: string | null) {
  if (!d) return '---';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number | null) {
  if (n == null) return '---';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function SubcontractorsTable({ search, onSelect }: Props) {
  const [rows, setRows] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const { view, setView } = useViewPreference('subcontractors');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .is('archived_at', null)
      .order('company_name');
    if (!error && data) setRows(data as Subcontractor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.company_name.toLowerCase().includes(q) ||
        r.subcontractor_code.toLowerCase().includes(q) ||
        (r.contact_name ?? '').toLowerCase().includes(q) ||
        (r.services_provided ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'company_name', 'asc');
  const sortedRows = sorted as unknown as Subcontractor[];
  const pag = usePagination(sortedRows, 25);
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No subcontractors found'
    : `No ${selectedStatusLabel} subcontractors found`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Add a subcontractor to get started.'
      : 'All subcontractors are currently in other statuses.';

  if (loading) return <TableSkeleton rows={8} cols={8} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="subcontractors"
          columns={[
            { key: 'subcontractor_code', label: 'Code' },
            { key: 'company_name', label: 'Company' },
            { key: 'contact_name', label: 'Contact' },
            { key: 'business_phone', label: 'Phone' },
            { key: 'services_provided', label: 'Services' },
            { key: 'license_expiry', label: 'License Expiry' },
            { key: 'hourly_rate', label: 'Hourly Rate' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatusFilter(status);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
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
            icon={<HardHat className="h-10 w-10" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <SubcontractorsCardGrid rows={pag.page} onSelect={(item) => onSelect?.(item)} />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'subcontractor_code' && sortDir} onSort={() => onSort('subcontractor_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'company_name' && sortDir} onSort={() => onSort('company_name')}>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Services</TableHead>
                <TableHead sortable sorted={sortKey === 'hourly_rate' && sortDir} onSort={() => onSort('hourly_rate')}>Rate</TableHead>
                <TableHead>License Exp.</TableHead>
                <TableHead>W9</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow key={row.id} onClick={() => onSelect?.(row)} className="cursor-pointer">
                  <TableCell className="font-mono text-xs">{row.subcontractor_code}</TableCell>
                  <TableCell className="font-medium">{row.company_name}</TableCell>
                  <TableCell>{row.contact_name ?? '---'}</TableCell>
                  <TableCell>{row.business_phone ?? row.phone ?? '---'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.services_provided ?? '---'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.hourly_rate ?? null)}/hr</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.license_expiry ?? null)}</TableCell>
                  <TableCell>
                    {row.w9_on_file ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive/70" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<HardHat className="h-10 w-10" />}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          )}
        </>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}
    </div>
  );
}
