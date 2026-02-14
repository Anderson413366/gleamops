'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { HardHat, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Subcontractor } from '@gleamops/shared';
import { SUBCONTRACTOR_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
  onSelect?: (sub: Subcontractor) => void;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function SubcontractorsTable({ search, onSelect }: Props) {
  const [rows, setRows] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.company_name.toLowerCase().includes(q) ||
      r.subcontractor_code.toLowerCase().includes(q) ||
      (r.contact_name ?? '').toLowerCase().includes(q) ||
      (r.services_provided ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'company_name', 'asc');
  const sortedRows = sorted as unknown as Subcontractor[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={9} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<HardHat className="h-10 w-10" />}
        title="No subcontractors found"
        description={search ? 'Try a different search term.' : 'Add a subcontractor to get started.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="subcontractors"
          columns={[
            { key: 'subcontractor_code', label: 'Code' },
            { key: 'company_name', label: 'Company' },
            { key: 'contact_name', label: 'Contact' },
            { key: 'business_phone', label: 'Phone' },
            { key: 'services_provided', label: 'Services' },
            { key: 'status', label: 'Status' },
            { key: 'license_expiry', label: 'License Expiry' },
            { key: 'hourly_rate', label: 'Hourly Rate' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
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
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.subcontractor_code}</TableCell>
              <TableCell className="font-medium">{row.company_name}</TableCell>
              <TableCell>{row.contact_name ?? '—'}</TableCell>
              <TableCell>{row.business_phone ?? row.phone ?? '—'}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.services_provided ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(row.hourly_rate ?? null)}/hr</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.license_expiry ?? null)}</TableCell>
              <TableCell>
                {row.w9_on_file ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive/70" />
                )}
              </TableCell>
              <TableCell>
                <Badge color={(SUBCONTRACTOR_STATUS_COLORS[row.status] as StatusColor) ?? 'gray'}>
                  {row.status}
                </Badge>
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
    </div>
  );
}
