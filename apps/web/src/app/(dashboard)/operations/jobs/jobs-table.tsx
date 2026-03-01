'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, Button, ViewToggle, StatusDot, priorityRowAccentClass, cn,
} from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { JobForm } from '@/components/forms/job-form';
import { EntityAvatar } from '@/components/directory/entity-avatar';
import { JobsCardGrid } from './jobs-card-grid';
import { EntityLink } from '@/components/links/entity-link';

const PRIORITY_COLORS: Record<string, 'red' | 'blue' | 'orange' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'gray',
  STANDARD: 'blue',
};

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELED', 'all'] as const;

interface JobWithRelations extends SiteJob {
  site?: {
    site_code: string;
    name: string;
    photo_url?: string | null;
    client?: { name: string; client_code?: string | null } | null;
  } | null;
}

interface JobsTableProps {
  search: string;
  openCreateToken?: number;
  showCreateButton?: boolean;
}

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  '2X_WEEK': '2×/Week',
  '3X_WEEK': '3×/Week',
  '4X_WEEK': '4×/Week',
  '5X_WEEK': '5×/Week',
  '6X_WEEK': '6×/Week',
};

function humanFrequency(value: string | null | undefined) {
  if (!value) return 'Not Set';
  return FREQUENCY_LABELS[value] ?? value.replace(/_/g, ' ');
}

export default function JobsTable({ search, openCreateToken, showCreateButton = true }: JobsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<JobWithRelations[]>([]);
  const [taskMinutesByJob, setTaskMinutesByJob] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SiteJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const { view, setView } = useViewPreference('jobs');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_jobs')
      .select(`
        *,
        site:site_id(site_code, name, photo_url, client:client_id!sites_client_id_fkey(name, client_code))
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

  useEffect(() => {
    if (!openCreateToken || openCreateToken < 1) return;
    setEditItem(null);
    setFormOpen(true);
  }, [openCreateToken]);

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
      result = result.filter(
        (r) =>
          r.job_code.toLowerCase().includes(q) ||
          (r.job_name ?? '').toLowerCase().includes(q) ||
          r.site?.name?.toLowerCase().includes(q) ||
          r.site?.client?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'job_code', 'asc'
  );
  const sortedRows = sorted as unknown as JobWithRelations[];
  const pag = usePagination(sortedRows, 25);

  const handleRowClick = (row: JobWithRelations) => {
    router.push(`/operations/jobs/${row.job_code}`);
  };
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No service plans yet'
    : `No ${selectedStatusLabel} service plans`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Plan recurring work, billing, and staffing from one place.'
      : `There are currently no service plans with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          {showCreateButton && (
            <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> New Service Plan
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((row) => ({
              ...row,
              site_name: row.site?.name ?? 'Not Set',
              client_name: row.site?.client?.name ?? 'Not Set',
              frequency_display: humanFrequency(row.frequency),
              est_hours_per_service: Number(
                ((taskMinutesByJob[row.id] ?? 0) / 60).toFixed(2)
              ),
            })) as unknown as Record<string, unknown>[]}
            filename="jobs"
            columns={[
              { key: 'job_code', label: 'Code' },
              { key: 'job_name', label: 'Name' },
              { key: 'site_name', label: 'Site' },
              { key: 'client_name', label: 'Client' },
              { key: 'frequency_display', label: 'Frequency' },
              { key: 'est_hours_per_service', label: 'Est. Hours/Service' },
              { key: 'billing_amount', label: 'Billing' },
              { key: 'priority_level', label: 'Priority' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
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
            icon={<Briefcase className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Service Plan' : undefined}
            onAction={showGuidedEmptyState ? () => { setEditItem(null); setFormOpen(true); } : undefined}
          >
            {showGuidedEmptyState && (
              <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Assign each plan to a client and site with clear frequency.</li>
                <li>Track billing and priority from the operations directory.</li>
                <li>Open detail pages to manage staffing and tasks quickly.</li>
              </ul>
            )}
          </EmptyState>
        ) : (
          <JobsCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'job_code' && sortDir} onSort={() => onSort('job_code')}>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Est. Hours/Service</TableHead>
                  <TableHead sortable sorted={sortKey === 'billing_amount' && sortDir} onSort={() => onSort('billing_amount')}>Billing</TableHead>
                  <TableHead>Priority</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn('cursor-pointer', priorityRowAccentClass(row.priority_level))}
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="font-mono text-xs">
                      <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1">
                        <span className="truncate" title={row.job_code}>{row.job_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <EntityAvatar
                          name={row.job_name ?? row.job_code}
                          seed={row.job_code}
                          imageUrl={row.site?.photo_url ?? null}
                          fallbackIcon={<Briefcase className="h-3.5 w-3.5" />}
                          size="sm"
                        />
                        <StatusDot status={row.status} />
                        <span className="inline-block max-w-[220px] truncate" title={row.job_name ?? 'Not Set'}>
                          {row.job_name ?? 'Not Set'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.site?.site_code ? (
                        <EntityLink
                          entityType="site"
                          code={row.site.site_code}
                          name={row.site.name ?? row.site.site_code}
                          showCode={false}
                          stopPropagation
                          className="inline-block max-w-[180px] truncate align-middle"
                        />
                      ) : (
                        <span className="inline-block max-w-[180px] truncate" title={row.site?.name ?? 'Not Set'}>
                          {row.site?.name ?? 'Not Set'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.site?.client?.client_code ? (
                        <EntityLink
                          entityType="client"
                          code={row.site.client.client_code}
                          name={row.site.client.name ?? row.site.client.client_code}
                          showCode={false}
                          stopPropagation
                          className="inline-block max-w-[180px] truncate align-middle"
                        />
                      ) : (
                        <span className="inline-block max-w-[180px] truncate" title={row.site?.client?.name ?? 'Not Set'}>
                          {row.site?.client?.name ?? 'Not Set'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{humanFrequency(row.frequency)}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {((taskMinutesByJob[row.id] ?? 0) / 60).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.billing_amount)}</TableCell>
                    <TableCell>
                      {row.priority_level ? (
                        <Badge color={PRIORITY_COLORS[row.priority_level] ?? 'gray'}>{row.priority_level}</Badge>
                      ) : (
                        <span className="italic text-muted-foreground">Not Set</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Briefcase className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Service Plan' : undefined}
                onAction={showGuidedEmptyState ? () => { setEditItem(null); setFormOpen(true); } : undefined}
              >
                {showGuidedEmptyState && (
                  <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                    <li>Assign each plan to a client and site with clear frequency.</li>
                    <li>Track billing and priority from the operations directory.</li>
                    <li>Open detail pages to manage staffing and tasks quickly.</li>
                  </ul>
                )}
              </EmptyState>
            </div>
          )}
        </>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
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
