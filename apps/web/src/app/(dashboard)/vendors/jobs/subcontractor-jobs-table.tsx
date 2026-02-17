'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Button,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import type { SubcontractorJobAssignment } from '@gleamops/shared';
import { SubcontractorJobDetail } from './subcontractor-job-detail';
import { SubcontractorJobForm } from './subcontractor-job-form';
import { EntityLink } from '@/components/links/entity-link';

const BILLING_LABELS: Record<string, string> = {
  HOURLY: 'Hourly',
  PER_SERVICE: 'Per Service',
  FLAT_MONTHLY: 'Flat Monthly',
  PER_SQFT: 'Per Sq Ft',
};

interface Props {
  search: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function SubcontractorJobsTable({ search }: Props) {
  const [rows, setRows] = useState<SubcontractorJobAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubcontractorJobAssignment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SubcontractorJobAssignment | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('v_subcontractor_job_assignments')
      .select('*')
      .order('subcontractor_name');
    if (!error && data) setRows(data as unknown as SubcontractorJobAssignment[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.subcontractor_name.toLowerCase().includes(q) ||
      r.job_code.toLowerCase().includes(q) ||
      r.site_name.toLowerCase().includes(q) ||
      r.client_name.toLowerCase().includes(q) ||
      (r.subcontractor_code ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'subcontractor_name', 'asc'
  );
  const sortedRows = sorted as unknown as SubcontractorJobAssignment[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          Assign Job
        </Button>
      </div>

      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'subcontractor_name' && sortDir} onSort={() => onSort('subcontractor_name')}>Subcontractor</TableHead>
            <TableHead sortable sorted={sortKey === 'job_code' && sortDir} onSort={() => onSort('job_code')}>Job</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Client</TableHead>
            <TableHead sortable sorted={sortKey === 'billing_rate' && sortDir} onSort={() => onSort('billing_rate')}>Billing</TableHead>
            <TableHead>Type</TableHead>
            <TableHead sortable sorted={sortKey === 'start_date' && sortDir} onSort={() => onSort('start_date')}>Start</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => setSelected(row)}
            >
              <TableCell className="font-medium">
                {row.subcontractor_code ? (
                  <EntityLink
                    entityType="subcontractor"
                    code={row.subcontractor_code}
                    name={row.subcontractor_name}
                    showCode={false}
                    stopPropagation
                  />
                ) : row.subcontractor_name}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.job_code ? (
                  <EntityLink entityType="job" code={row.job_code} name={row.job_name ?? row.job_code} showCode={false} stopPropagation />
                ) : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.site_code ? (
                  <EntityLink entityType="site" code={row.site_code} name={row.site_name} showCode={false} stopPropagation />
                ) : row.site_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.client_code ? (
                  <EntityLink entityType="client" code={row.client_code} name={row.client_name} showCode={false} stopPropagation />
                ) : row.client_name}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.billing_rate)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{BILLING_LABELS[row.billing_type ?? ''] ?? row.billing_type ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.start_date ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<Briefcase className="h-12 w-12" />}
            title="No subcontractor jobs"
            description={search ? 'Try a different search term.' : 'Assign jobs to subcontractors to see them here.'}
          />
        </div>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />

      <SubcontractorJobDetail
        assignment={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onEdit={(item) => {
          setSelected(null);
          setEditItem(item);
          setFormOpen(true);
        }}
        onRefresh={fetchData}
      />

      <SubcontractorJobForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
