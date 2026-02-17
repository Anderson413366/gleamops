'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InventoryCount } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Button, cn, StatusDot, statusRowAccentClass, Select,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { toSafeDate } from '@/lib/utils/date';
import { InventoryCountForm } from '@/components/forms/inventory-count-form';

const STATUS_OPTIONS = ['IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'all'] as const;

interface CountRow extends InventoryCount {
  site?: { id: string; name: string; site_code: string } | null;
  counter?: { full_name: string } | null;
}

interface CountAggregate {
  itemsCount: number;
  totalValue: number;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface Props {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export default function CountsTable({ search, formOpen, onFormClose, onRefresh }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteQueryCode = searchParams.get('site');

  const [rows, setRows] = useState<CountRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [aggregatesByCountId, setAggregatesByCountId] = useState<Record<string, CountAggregate>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('IN_PROGRESS');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [statusInitialized, setStatusInitialized] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [countsRes, sitesRes] = await Promise.all([
      supabase
        .from('inventory_counts')
        .select('*, site:site_id(id, name, site_code), counter:counted_by(full_name)')
        .is('archived_at', null)
        .order('count_date', { ascending: false }),
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name'),
    ]);

    const countRows = (countsRes.data as unknown as CountRow[]) ?? [];
    setRows(countRows);
    setSites((sitesRes.data as unknown as SiteOption[]) ?? []);

    if (countRows.length > 0) {
      const countIds = countRows.map((row) => row.id);
      const { data: detailRows } = await supabase
        .from('inventory_count_details')
        .select('count_id, supply_id, actual_qty')
        .is('archived_at', null)
        .in('count_id', countIds);

      const details = (detailRows as Array<{ count_id: string; supply_id: string; actual_qty: number | string | null }>) ?? [];
      const supplyIds = Array.from(new Set(details.map((detail) => detail.supply_id).filter(Boolean)));
      const { data: supplyRows } = await supabase
        .from('supply_catalog')
        .select('id, unit_cost')
        .in('id', supplyIds);

      const costBySupplyId: Record<string, number> = {};
      for (const supply of ((supplyRows ?? []) as Array<{ id: string; unit_cost: number | null }>)) {
        costBySupplyId[supply.id] = Number(supply.unit_cost ?? 0);
      }

      const aggregateMap: Record<string, CountAggregate> = {};
      for (const detail of details) {
        if (!aggregateMap[detail.count_id]) {
          aggregateMap[detail.count_id] = { itemsCount: 0, totalValue: 0 };
        }
        const qty = Number(detail.actual_qty ?? 0);
        const unitCost = costBySupplyId[detail.supply_id] ?? 0;
        aggregateMap[detail.count_id].itemsCount += 1;
        aggregateMap[detail.count_id].totalValue += qty * unitCost;
      }
      setAggregatesByCountId(aggregateMap);
    } else {
      setAggregatesByCountId({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (formOpen) {
      setCreateOpen(true);
    }
  }, [formOpen]);

  useEffect(() => {
    if (!siteQueryCode || sites.length === 0) return;
    const matchingSite = sites.find((site) => site.site_code === siteQueryCode);
    if (matchingSite) setSiteFilter(matchingSite.id);
  }, [siteQueryCode, sites]);

  const handleFormClose = () => {
    setCreateOpen(false);
    onFormClose?.();
  };

  const handleFormSuccess = () => {
    fetchData();
    onRefresh?.();
    setCreateOpen(false);
  };

  const initialSiteId = useMemo(() => {
    if (!siteQueryCode || sites.length === 0) return null;
    return sites.find((site) => site.site_code === siteQueryCode)?.id ?? null;
  }, [siteQueryCode, sites]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'DRAFT';
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  useEffect(() => {
    if (statusInitialized || rows.length === 0) return;
    const preferred = STATUS_OPTIONS.find((status) => status !== 'all' && (statusCounts[status] ?? 0) > 0);
    if (preferred) {
      setStatusFilter(preferred);
    }
    setStatusInitialized(true);
  }, [rows.length, statusCounts, statusInitialized]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && (row.status ?? 'DRAFT') !== statusFilter) return false;
      if (siteFilter !== 'all' && row.site_id !== siteFilter) return false;
      if (dateFromFilter) {
        const fromDate = new Date(`${dateFromFilter}T00:00:00`);
        if (!Number.isNaN(fromDate.getTime())) {
          const rowDate = new Date(row.count_date);
          if (rowDate < fromDate) return false;
        }
      }
      if (dateToFilter) {
        const toDate = new Date(`${dateToFilter}T23:59:59`);
        if (!Number.isNaN(toDate.getTime())) {
          const rowDate = new Date(row.count_date);
          if (rowDate > toDate) return false;
        }
      }
      if (!search) return true;
      return (
        row.count_code.toLowerCase().includes(q) ||
        (row.site?.name ?? '').toLowerCase().includes(q) ||
        (row.site?.site_code ?? '').toLowerCase().includes(q) ||
        (row.counter?.full_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [dateFromFilter, dateToFilter, rows, search, siteFilter, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'count_date', 'desc'
  );
  const sortedRows = sorted as unknown as CountRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const selectedStatusLabel = statusFilter === 'all' ? 'all statuses' : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all' ? 'No inventory counts yet' : `No ${selectedStatusLabel} counts`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track each count by site, status, and value.'
      : `There are currently no counts with ${selectedStatusLabel} status.`;

  const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          New Count
        </Button>
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Site"
            value={siteFilter}
            onChange={(event) => setSiteFilter(event.target.value)}
            options={[
              { value: 'all', label: 'All Sites' },
              ...sites.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` })),
            ]}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
            )}
            >
              {statusCounts[status] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'count_code' && sortDir} onSort={() => onSort('count_code')}>Code</TableHead>
              <TableHead>Site</TableHead>
              <TableHead sortable sorted={sortKey === 'count_date' && sortDir} onSort={() => onSort('count_date')}>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Counted By</TableHead>
              <TableHead>Items Counted</TableHead>
              <TableHead>Total Value</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => {
              const aggregate = aggregatesByCountId[row.id] ?? { itemsCount: 0, totalValue: 0 };
              return (
                <TableRow
                  key={row.id}
                  onClick={() => router.push(`/inventory/counts/${encodeURIComponent(row.count_code)}`)}
                  className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <span>{row.count_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.site?.name ?? 'Not Set'}</TableCell>
                  <TableCell>{dateFmt.format(toSafeDate(row.count_date))}</TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                  <TableCell>{row.counter?.full_name ?? row.counted_by_name ?? 'Not Set'}</TableCell>
                  <TableCell className="tabular-nums">{aggregate.itemsCount}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(aggregate.totalValue)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={!search && statusFilter === 'all' ? '+ Start Your First Count' : undefined}
            onAction={!search && statusFilter === 'all' ? () => setCreateOpen(true) : undefined}
          />
        </div>
      )}

      {filtered.length > 0 && (
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
      )}

      <InventoryCountForm
        open={createOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        initialSiteId={initialSiteId}
      />
    </div>
  );
}
