'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn, Button,
} from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { SitesCardGrid } from './sites-card-grid';
import { SiteForm } from '@/components/forms/site-form';
import { EntityLink } from '@/components/links/entity-link';

const PRIORITY_COLORS: Record<string, 'red' | 'blue' | 'orange' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'gray',
  NORMAL: 'gray',
  STANDARD: 'blue',
};

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'CANCELED', 'all'] as const;

interface SiteWithClient extends Site {
  priority?: string | null;
  client?: { name: string; client_code: string } | null;
}

interface SitesTableProps {
  search: string;
}

interface SiteJobLite {
  site_id: string;
  status: string | null;
  billing_amount: number | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SitesTable({ search }: SitesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientFilterCode = searchParams.get('client');
  const [rows, setRows] = useState<SiteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [activeJobsBySite, setActiveJobsBySite] = useState<Record<string, number>>({});
  const [monthlyRevenueBySite, setMonthlyRevenueBySite] = useState<Record<string, number>>({});
  const { view, setView } = useViewPreference('sites');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sites')
      .select('*, client:client_id(name, client_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) {
      const siteRows = data as unknown as SiteWithClient[];
      setRows(siteRows);

      if (siteRows.length > 0) {
        const siteIds = siteRows.map((row) => row.id);
        const { data: jobsData } = await supabase
          .from('site_jobs')
          .select('site_id, status, billing_amount')
          .is('archived_at', null)
          .in('site_id', siteIds);

        const activeCounts: Record<string, number> = {};
        const revenueTotals: Record<string, number> = {};
        for (const job of (jobsData ?? []) as unknown as SiteJobLite[]) {
          const siteId = job.site_id;
          const status = (job.status ?? '').toUpperCase();
          if (status !== 'ACTIVE') continue;
          activeCounts[siteId] = (activeCounts[siteId] ?? 0) + 1;
          revenueTotals[siteId] = (revenueTotals[siteId] ?? 0) + (job.billing_amount ?? 0);
        }
        setActiveJobsBySite(activeCounts);
        setMonthlyRevenueBySite(revenueTotals);
      } else {
        setActiveJobsBySite({});
        setMonthlyRevenueBySite({});
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      if (r.status) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (clientFilterCode) {
      result = result.filter((r) => r.client?.client_code === clientFilterCode);
    }
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.site_code.toLowerCase().includes(q) ||
          r.client?.name?.toLowerCase().includes(q) ||
          r.address?.street?.toLowerCase().includes(q) ||
          r.address?.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, clientFilterCode, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as SiteWithClient[];
  const pag = usePagination(sortedRows, 25);

  const handleRowClick = (row: SiteWithClient) => {
    router.push(`/crm/sites/${row.site_code}`);
  };
  const handleAdd = () => setFormOpen(true);
  const priorityValue = (row: SiteWithClient) => row.priority_level ?? row.priority ?? null;
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No sites yet'
    : `No ${selectedStatusLabel} sites`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track each location, access details, and active service plans.'
      : `There are currently no sites with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> New Site
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((row) => ({
              ...row,
              client_name: row.client?.name ?? 'Not Set',
              city_state: row.address ? [row.address.city, row.address.state].filter(Boolean).join(', ') : 'Not Set',
              active_jobs: activeJobsBySite[row.id] ?? 0,
              monthly_revenue: monthlyRevenueBySite[row.id] ?? 0,
              priority_display: priorityValue(row) ?? 'Not Set',
            })) as unknown as Record<string, unknown>[]}
            filename="sites"
            columns={[
              { key: 'site_code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'client_name', label: 'Client' },
              { key: 'city_state', label: 'City/State' },
              { key: 'active_jobs', label: 'Active Jobs' },
              { key: 'monthly_revenue', label: 'Monthly Revenue' },
              { key: 'priority_display', label: 'Priority' },
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatusFilter(status);
            }}
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
      {clientFilterCode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Filtered to client <span className="font-mono text-foreground">{clientFilterCode}</span>
          </span>
          <button
            type="button"
            onClick={() => router.replace('/crm?tab=sites')}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear filter
          </button>
        </div>
      )}
      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Site' : undefined}
            onAction={showGuidedEmptyState ? handleAdd : undefined}
          >
            {showGuidedEmptyState && (
              <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Capture access instructions and security requirements per location.</li>
                <li>Track active service plans and monthly revenue by site.</li>
                <li>Keep field teams aligned with location-specific details.</li>
              </ul>
            )}
          </EmptyState>
        ) : (
          <SitesCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'site_code' && sortDir} onSort={() => onSort('site_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>City/State</TableHead>
                <TableHead>Active Jobs</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead>Priority</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1">
                      <span className="truncate" title={row.site_code}>{row.site_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <span className="inline-block max-w-[240px] truncate" title={row.name}>{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.client?.client_code ? (
                      <EntityLink
                        entityType="client"
                        code={row.client.client_code}
                        name={row.client.name ?? row.client.client_code}
                        showCode={false}
                        stopPropagation
                        className="inline-block max-w-[200px] truncate align-middle"
                      />
                    ) : (
                      <span className="inline-block max-w-[200px] truncate" title={row.client?.name ?? 'Not Set'}>
                        {row.client?.name ?? 'Not Set'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span
                      className="inline-block max-w-[210px] truncate"
                      title={row.address ? [row.address.city, row.address.state].filter(Boolean).join(', ') : 'Not Set'}
                    >
                      {row.address
                        ? [row.address.city, row.address.state].filter(Boolean).join(', ')
                        : 'Not Set'}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {activeJobsBySite[row.id] ?? 0}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatCurrency(monthlyRevenueBySite[row.id] ?? 0)}
                  </TableCell>
                  <TableCell>
                    {priorityValue(row) ? (
                      <Badge color={PRIORITY_COLORS[priorityValue(row) ?? ''] ?? 'gray'}>{priorityValue(row)}</Badge>
                    ) : <span className="text-muted-foreground">Not Set</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<MapPin className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Site' : undefined}
                onAction={showGuidedEmptyState ? handleAdd : undefined}
              >
                {showGuidedEmptyState && (
                  <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                    <li>Capture access instructions and security requirements per location.</li>
                    <li>Track active service plans and monthly revenue by site.</li>
                    <li>Keep field teams aligned with location-specific details.</li>
                  </ul>
                )}
              </EmptyState>
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
      <SiteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
