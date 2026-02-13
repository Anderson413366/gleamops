'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Briefcase } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'gray',
  COMPLETED: 'green',
};

interface SubJobRow {
  id: string;
  job_code: string;
  frequency: string;
  billing_amount: number | null;
  status: string;
  site?: { name: string; site_code: string; client?: { name: string } | null } | null;
}

interface Props {
  search: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function SubcontractorJobsTable({ search }: Props) {
  const [rows, setRows] = useState<SubJobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    // Jobs that are assigned to subcontractors — source_bid_id tracks this through won bids
    // For now, show all jobs that have a non-null source_bid_id as "subcontracted"
    const { data, error } = await supabase
      .from('site_jobs')
      .select(`
        id, job_code, frequency, billing_amount, status,
        site:site_id(name, site_code, client:client_id(name))
      `)
      .not('source_bid_id', 'is', null)
      .is('archived_at', null)
      .order('job_code');
    if (!error && data) setRows(data as unknown as SubJobRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.job_code.toLowerCase().includes(q) ||
      (r.site?.name ?? '').toLowerCase().includes(q) ||
      (r.site?.client?.name ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'job_code', 'asc'
  );
  const sortedRows = sorted as unknown as SubJobRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-12 w-12" />}
        title="No subcontractor jobs"
        description="Jobs linked to subcontractors will appear here."
      />
    );
  }

  return (
    <div>
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
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />
    </div>
  );
}
