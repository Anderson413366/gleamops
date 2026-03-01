'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Sparkles, Zap } from 'lucide-react';
import { Badge, Button, EmptyState, Pagination, SearchInput, TableSkeleton, cn } from '@gleamops/ui';
import type { SalesBid } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePagination } from '@/hooks/use-pagination';

interface BidWithRelations extends SalesBid {
  client?: { name: string | null; client_code?: string | null } | null;
  service?: { name: string | null } | null;
}

interface BidsSectionProps {
  globalSearch?: string;
  onCreateNew?: () => void;
  onExpressBid?: () => void;
  onCountChange?: (count: number) => void;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function money(value: number | null): string {
  if (value == null) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function badgeColor(status: string): 'green' | 'blue' | 'yellow' | 'gray' | 'red' {
  if (status === 'ACTIVE' || status === 'ACCEPTED') return 'green';
  if (status === 'DRAFT' || status === 'IN_PROGRESS' || status === 'READY_FOR_REVIEW') return 'blue';
  if (status === 'SENT') return 'yellow';
  if (status === 'REJECTED' || status === 'LOST') return 'red';
  return 'gray';
}

export function BidsSection({
  globalSearch = '',
  onCreateNew,
  onExpressBid,
  onCountChange,
}: BidsSectionProps) {
  const router = useRouter();
  const [rows, setRows] = useState<BidWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [sectionSearch, setSectionSearch] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_bids')
      .select('*, client:clients!sales_bids_client_id_fkey(name, client_code), service:service_id(name)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRows(data as BidWithRelations[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.status).filter(Boolean)));
    const ordered = unique.includes('ACTIVE')
      ? ['ACTIVE', ...unique.filter((status) => status !== 'ACTIVE')]
      : unique;
    return [...ordered, 'all'];
  }, [rows]);

  const effectiveStatusFilter = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    if (statusOptions.includes(statusFilter)) return statusFilter;
    if (statusOptions.includes('ACTIVE')) return 'ACTIVE';
    return statusOptions.find((status) => status !== 'all') ?? 'all';
  }, [statusFilter, statusOptions]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'ACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (effectiveStatusFilter !== 'all') {
      result = result.filter((row) => (row.status ?? 'ACTIVE') === effectiveStatusFilter);
    }

    const query = normalizeQuery(`${globalSearch} ${sectionSearch}`);
    if (!query) return result;

    return result.filter((row) => (
      row.bid_code.toLowerCase().includes(query)
      || (row.status?.toLowerCase().includes(query) ?? false)
      || (row.client?.name?.toLowerCase().includes(query) ?? false)
      || (row.client?.client_code?.toLowerCase().includes(query) ?? false)
      || (row.service?.name?.toLowerCase().includes(query) ?? false)
    ));
  }, [effectiveStatusFilter, globalSearch, rows, sectionSearch]);

  useEffect(() => {
    onCountChange?.(filtered.length);
  }, [filtered.length, onCountChange]);

  const pag = usePagination(filtered, 25);

  if (loading) {
    return <TableSkeleton rows={4} cols={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                effectiveStatusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SearchInput
            value={sectionSearch}
            onChange={setSectionSearch}
            placeholder="Search bids..."
            className="w-full sm:w-72"
          />
          {onExpressBid ? (
            <Button variant="secondary" onClick={onExpressBid}>
              <Zap className="h-4 w-4" />
              Express Bid
            </Button>
          ) : null}
          {onCreateNew ? (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4" />
              New Bid
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pag.page.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => router.push(`/pipeline/bids/${encodeURIComponent(row.bid_code)}`)}
                className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-green-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{row.bid_code}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{row.client?.name ?? 'Client pending'}</p>
                  </div>
                  <Badge color={badgeColor(row.status ?? 'ACTIVE')}>{(row.status ?? 'ACTIVE').replace(/_/g, ' ')}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-muted-foreground">Monthly</p>
                    <p className="mt-0.5 font-semibold text-foreground">{money(row.bid_monthly_price)}</p>
                  </div>
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-muted-foreground">Target Margin</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {row.target_margin_percent != null ? `${row.target_margin_percent}%` : 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-muted-foreground">Sq Ft</p>
                    <p className="mt-0.5 font-semibold text-foreground">{row.total_sqft?.toLocaleString() ?? 'Not set'}</p>
                  </div>
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-muted-foreground">Service</p>
                    <p className="mt-0.5 font-semibold text-foreground">{row.service?.name ?? 'Not set'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
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
        </>
      ) : (
        <EmptyState
          icon={(
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <FileText className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No bids match this view"
          description="Try changing status filters or search terms."
          actionLabel={onCreateNew ? '+ Add Bid' : undefined}
          onAction={onCreateNew}
        />
      )}
    </div>
  );
}
