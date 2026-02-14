'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, Button, ViewToggle,
} from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { JobDetail } from './job-detail';
import { JobForm } from '@/components/forms/job-form';
import { JobsCardGrid } from './jobs-card-grid';

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
  COMPLETED: 'green',
};

const PRIORITY_COLORS: Record<string, 'red' | 'orange' | 'yellow' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'gray',
};

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
}

interface JobsTableProps {
  search: string;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function JobsTable({ search }: JobsTableProps) {
  const [rows, setRows] = useState<JobWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobWithRelations | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SiteJob | null>(null);
  const { view, setView } = useViewPreference('jobs');

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
        (r.job_name ?? '').toLowerCase().includes(q) ||
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

  const handleEdit = (job: SiteJob) => {
    setSelected(null);
    setEditItem(job);
    setFormOpen(true);
  };

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New Job
          </Button>
        </div>
        <EmptyState
          icon={<Briefcase className="h-12 w-12" />}
          title="No jobs"
          description={search ? 'Try a different search term.' : 'Create your first job to get started.'}
        />
        <JobForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          initialData={editItem}
          onSuccess={fetchData}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> New Job
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="jobs"
            columns={[
              { key: 'job_code', label: 'Code' },
              { key: 'job_name', label: 'Name' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'billing_amount', label: 'Billing' },
              { key: 'status', label: 'Status' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>
      {view === 'card' ? (
        <JobsCardGrid rows={pag.page} onSelect={(item) => setSelected(item)} />
      ) : (
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'job_code' && sortDir} onSort={() => onSort('job_code')}>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead sortable sorted={sortKey === 'billing_amount' && sortDir} onSort={() => onSort('billing_amount')}>Billing</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
              <TableCell className="font-mono text-xs">{row.job_code}</TableCell>
              <TableCell className="font-medium">{row.job_name ?? '\u2014'}</TableCell>
              <TableCell>{row.site?.name ?? '\u2014'}</TableCell>
              <TableCell className="text-muted-foreground">{row.site?.client?.name ?? '\u2014'}</TableCell>
              <TableCell className="text-muted-foreground">{row.job_type ?? '\u2014'}</TableCell>
              <TableCell className="text-muted-foreground">{row.frequency}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.billing_amount)}</TableCell>
              <TableCell>
                {row.priority_level ? (
                  <Badge color={PRIORITY_COLORS[row.priority_level] ?? 'gray'}>{row.priority_level}</Badge>
                ) : '\u2014'}
              </TableCell>
              <TableCell>
                <Badge color={JOB_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <JobDetail
        job={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onEdit={handleEdit}
      />

      <JobForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
