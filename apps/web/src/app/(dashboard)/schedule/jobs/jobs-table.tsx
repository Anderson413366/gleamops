'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
  COMPLETED: 'green',
};

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface JobsTableProps {
  search: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function JobsTable({ search }: JobsTableProps) {
  const [rows, setRows] = useState<JobWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_jobs')
      .select(`
        *,
        site:site_id(site_code, name, client:client_id(name))
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as JobWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.job_code.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.site?.client?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'job_code', 'asc'
  );
  const sortedRows = sorted as unknown as JobWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-12 w-12" />}
        title="No service plans"
        description={search ? 'Try a different search term.' : 'Convert a won proposal to create service plans.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="service-plans"
          columns={[
            { key: 'job_code', label: 'Code' },
            { key: 'frequency', label: 'Frequency' },
            { key: 'billing_amount', label: 'Billing' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'job_code' && sortDir} onSort={() => onSort('job_code')}>Code</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead sortable sorted={sortKey === 'billing_amount' && sortDir} onSort={() => onSort('billing_amount')}>Billing</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.job_code}</TableCell>
              <TableCell className="font-medium">{row.site?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.site?.client?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.frequency}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.billing_amount)}</TableCell>
              <TableCell>
                <Badge color={JOB_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
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
