'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { SalesBid } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { PipelineFlowHint } from '@/components/empty-states/pipeline-flow-hint';
import { EntityLink } from '@/components/links/entity-link';

interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
}

interface BidsTableProps {
  search: string;
  onCreateNew?: () => void;
}

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function BidsTable({ search, onCreateNew }: BidsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<BidWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  // UX requirement: default to Active when available; move "all" to the end.
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_bids')
      .select('*, client:client_id!sales_bids_client_id_fkey(name, client_code), service:service_id(name)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as BidWithClient[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.status).filter(Boolean)));
    const hasActive = unique.includes('ACTIVE');
    const ordered = hasActive
      ? ['ACTIVE', ...unique.filter((s) => s !== 'ACTIVE'), 'all']
      : [...unique, 'all'];
    return ordered;
  }, [rows]);

  const effectiveStatusFilter = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    if (statusOptions.includes(statusFilter)) return statusFilter;
    if (statusOptions.includes('ACTIVE')) return 'ACTIVE';
    return statusOptions.find((s) => s !== 'all') ?? 'all';
  }, [statusFilter, statusOptions]);

  const filtered = useMemo(() => {
    let result = rows;
    if (effectiveStatusFilter !== 'all') {
      result = result.filter((r) => r.status === effectiveStatusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.bid_code.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q)
    );
  }, [rows, search, effectiveStatusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'bid_code', 'asc'
  );
  const sortedRows = sorted as unknown as BidWithClient[];
  const pag = usePagination(sortedRows, 25);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'ACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);
  const selectedStatusLabel = effectiveStatusFilter === 'all'
    ? 'all statuses'
    : effectiveStatusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = effectiveStatusFilter === 'all'
    ? 'No bids yet'
    : `No ${selectedStatusLabel} bids`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : effectiveStatusFilter === 'all'
      ? 'Price your first opportunity to move it toward contract.'
      : `There are currently no bids with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && effectiveStatusFilter === 'all';
  const handleRowClick = useCallback((row: BidWithClient) => {
    router.push(`/pipeline/bids/${encodeURIComponent(row.bid_code)}`);
  }, [router]);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="bids"
          columns={[
            { key: 'bid_code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'total_sqft', label: 'Sq Ft' },
            { key: 'bid_monthly_price', label: 'Monthly Price' },
            { key: 'created_at', label: 'Created' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              effectiveStatusFilter === status ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              effectiveStatusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'bid_code' && sortDir} onSort={() => onSort('bid_code')}>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead sortable sorted={sortKey === 'total_sqft' && sortDir} onSort={() => onSort('total_sqft')}>Sq Ft</TableHead>
              <TableHead sortable sorted={sortKey === 'bid_monthly_price' && sortDir} onSort={() => onSort('bid_monthly_price')}>Monthly Price</TableHead>
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
                  <div className="flex items-center gap-2">
                    <StatusDot status={row.status} />
                    <span>{row.bid_code}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {row.client?.client_code ? (
                    <EntityLink
                      entityType="client"
                      code={row.client.client_code}
                      name={row.client.name ?? row.client.client_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    row.client?.name ?? '—'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.service?.name ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.total_sqft?.toLocaleString() ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.bid_monthly_price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <FileText className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Create Your First Bid' : undefined}
            onAction={showGuidedEmptyState ? onCreateNew : undefined}
          >
            {showGuidedEmptyState && (
              <div className="space-y-4 text-left">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Build clean scopes and pricing options in one place.</li>
                  <li>Standardize assumptions so estimates are consistent across reps.</li>
                  <li>Move from opportunity to client-ready proposal quickly.</li>
                </ul>
                <PipelineFlowHint />
              </div>
            )}
          </EmptyState>
        </div>
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
