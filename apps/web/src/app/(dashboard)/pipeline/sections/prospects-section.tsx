'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Handshake, Plus, Sparkles } from 'lucide-react';
import { Button, EmptyState, Pagination, SearchInput, TableSkeleton, cn } from '@gleamops/ui';
import type { SalesProspect } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePagination } from '@/hooks/use-pagination';
import { ProspectsCardGrid } from '../prospects/prospects-card-grid';

interface ProspectsSectionProps {
  globalSearch?: string;
  onCreate?: () => void;
  onCountChange?: (count: number) => void;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function ProspectsSection({
  globalSearch = '',
  onCreate,
  onCountChange,
}: ProspectsSectionProps) {
  const router = useRouter();
  const [rows, setRows] = useState<SalesProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [sectionSearch, setSectionSearch] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_prospects')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRows(data as SalesProspect[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.prospect_status_code).filter(Boolean)));
    const withPreferredActive = unique.includes('ACTIVE')
      ? ['ACTIVE', ...unique.filter((status) => status !== 'ACTIVE')]
      : unique;
    return [...withPreferredActive, 'all'];
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
      const status = row.prospect_status_code ?? 'ACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;

    if (effectiveStatusFilter !== 'all') {
      result = result.filter((row) => row.prospect_status_code === effectiveStatusFilter);
    }

    const query = normalizeQuery(`${globalSearch} ${sectionSearch}`);
    if (!query) return result;

    return result.filter((row) => (
      row.company_name.toLowerCase().includes(query)
      || row.prospect_code.toLowerCase().includes(query)
      || (row.source?.toLowerCase().includes(query) ?? false)
      || (row.prospect_status_code?.toLowerCase().includes(query) ?? false)
    ));
  }, [effectiveStatusFilter, globalSearch, rows, sectionSearch]);

  useEffect(() => {
    onCountChange?.(filtered.length);
  }, [filtered.length, onCountChange]);

  const pag = usePagination(filtered, 25);

  const handleSelect = (row: SalesProspect) => {
    router.push(`/pipeline/prospects/${encodeURIComponent(row.prospect_code)}`);
  };

  if (loading) {
    return <TableSkeleton rows={4} cols={4} />;
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
                  ? 'bg-blue-600 text-white'
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
            placeholder="Search prospects..."
            className="w-full sm:w-72"
          />
          {onCreate ? (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" />
              New Prospect
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <ProspectsCardGrid rows={pag.page} onSelect={handleSelect} />
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
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Handshake className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No prospects match this view"
          description="Try adjusting filters or search terms to see prospects."
          actionLabel={onCreate ? '+ Add Prospect' : undefined}
          onAction={onCreate}
        />
      )}
    </div>
  );
}
