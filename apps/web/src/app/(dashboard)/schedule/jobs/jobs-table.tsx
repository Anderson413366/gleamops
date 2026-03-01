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
import { EntityLink } from '@/components/links/entity-link';

const JOB_STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
  COMPLETED: 'green',
};

const PRIORITY_COLORS: Record<string, 'red' | 'blue' | 'yellow' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'blue',
  MEDIUM: 'yellow',
  LOW: 'gray',
  STANDARD: 'gray',
};

interface JobWithRelations extends SiteJob {
  site?: { site_code: string; name: string; client?: { name: string; client_code?: string | null } | null } | null;
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
  const [taskMinutesByJob, setTaskMinutesByJob] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_jobs')
      .select(`
        *,
        site:site_id(site_code, name, client:client_id!sites_client_id_fkey(name, client_code))
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const typedRows = data as unknown as JobWithRelations[];
      setRows(typedRows);
      if (typedRows.length > 0) {
        const jobIds = typedRows.map((row) => row.id);
        const { data: taskData } = await supabase
          .from('job_tasks')
          .select('job_id, custom_minutes, estimated_minutes, planned_minutes')
          .in('job_id', jobIds)
          .is('archived_at', null);
        const minutesByJob = ((taskData ?? []) as Array<{
          job_id: string;
          custom_minutes?: number | null;
          estimated_minutes?: number | null;
          planned_minutes?: number | null;
        }>).reduce<Record<string, number>>((acc, task) => {
          const minutes = Number(task.custom_minutes ?? task.estimated_minutes ?? task.planned_minutes ?? 0);
          acc[task.job_id] = (acc[task.job_id] ?? 0) + (Number.isFinite(minutes) ? minutes : 0);
          return acc;
        }, {});
        setTaskMinutesByJob(minutesByJob);
      } else {
        setTaskMinutesByJob({});
      }
    }
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
          data={filtered.map((row) => ({
            ...row,
            estimated_hours_per_service: Number(
              ((taskMinutesByJob[row.id] ?? 0) / 60).toFixed(2)
            ),
          })) as unknown as Record<string, unknown>[]}
          filename="service-plans"
          columns={[
            { key: 'job_code', label: 'Code' },
            { key: 'job_name', label: 'Name' },
            { key: 'estimated_hours_per_service', label: 'Est. Hours/Service' },
            { key: 'frequency', label: 'Frequency' },
            { key: 'billing_amount', label: 'Billing' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'job_code' && sortDir} onSort={() => onSort('job_code')}>Code</TableHead>
              <TableHead>Job Name</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Est. Hours/Service</TableHead>
              <TableHead sortable sorted={sortKey === 'billing_amount' && sortDir} onSort={() => onSort('billing_amount')}>Billing</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">
                  <EntityLink entityType="job" code={row.job_code} name={row.job_code} showCode={false} />
                </TableCell>
                <TableCell className="font-medium">{row.job_name ?? '—'}</TableCell>
                <TableCell>
                  {row.site?.site_code ? (
                    <EntityLink
                      entityType="site"
                      code={row.site.site_code}
                      name={row.site.name ?? row.site.site_code}
                      showCode={false}
                    />
                  ) : (
                    row.site?.name ?? '—'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.site?.client?.client_code ? (
                    <EntityLink
                      entityType="client"
                      code={row.site.client.client_code}
                      name={row.site.client.name ?? row.site.client.client_code}
                      showCode={false}
                    />
                  ) : (
                    row.site?.client?.name ?? '—'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.job_type ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{row.frequency}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {((taskMinutesByJob[row.id] ?? 0) / 60).toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.billing_amount)}</TableCell>
                <TableCell>
                  {row.priority_level ? (
                    <Badge color={PRIORITY_COLORS[row.priority_level] ?? 'gray'}>{row.priority_level}</Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Badge color={JOB_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />
    </div>
  );
}
