'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, Target } from 'lucide-react';
import { Button, EmptyState, Pagination, SearchInput, TableSkeleton, cn } from '@gleamops/ui';
import { getStatusPillColor } from '@/lib/utils/status-colors';
import type { SalesOpportunity } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePagination } from '@/hooks/use-pagination';
import { OpportunitiesCardGrid } from '../opportunities/opportunities-card-grid';

interface OpportunityWithProspect extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
}

interface OpportunitiesSectionProps {
  globalSearch?: string;
  onCreate?: () => void;
  onCountChange?: (count: number) => void;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function OpportunitiesSection({
  globalSearch = '',
  onCreate,
  onCountChange,
}: OpportunitiesSectionProps) {
  const router = useRouter();
  const [rows, setRows] = useState<OpportunityWithProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('QUALIFIED');
  const [sectionSearch, setSectionSearch] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_opportunities')
      .select('*, prospect:prospect_id(company_name, prospect_code)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRows(data as OpportunityWithProspect[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const stageOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.stage_code).filter(Boolean)));
    const ordered = unique.includes('QUALIFIED')
      ? ['QUALIFIED', ...unique.filter((stage) => stage !== 'QUALIFIED')]
      : unique;
    return [...ordered, 'all'];
  }, [rows]);

  const effectiveStageFilter = useMemo(() => {
    if (stageFilter === 'all') return 'all';
    if (stageOptions.includes(stageFilter)) return stageFilter;
    if (stageOptions.includes('QUALIFIED')) return 'QUALIFIED';
    return stageOptions.find((stage) => stage !== 'all') ?? 'all';
  }, [stageFilter, stageOptions]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const stage = row.stage_code ?? 'QUALIFIED';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (effectiveStageFilter !== 'all') {
      result = result.filter((row) => (row.stage_code ?? 'QUALIFIED') === effectiveStageFilter);
    }

    const query = normalizeQuery(globalSearch);
    if (!query) return result;

    return result.filter((row) => (
      row.name.toLowerCase().includes(query)
      || row.opportunity_code.toLowerCase().includes(query)
      || (row.stage_code?.toLowerCase().includes(query) ?? false)
      || (row.prospect?.company_name?.toLowerCase().includes(query) ?? false)
      || (row.prospect?.prospect_code?.toLowerCase().includes(query) ?? false)
    ));
  }, [effectiveStageFilter, globalSearch, rows]);

  useEffect(() => {
    onCountChange?.(filtered.length);
  }, [filtered.length, onCountChange]);

  const pag = usePagination(filtered, 25);

  const handleSelect = (row: OpportunityWithProspect) => {
    router.push(`/pipeline/opportunities/${encodeURIComponent(row.opportunity_code)}`);
  };

  if (loading) {
    return <TableSkeleton rows={4} cols={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {stageOptions.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                effectiveStageFilter === stage
                  ? getStatusPillColor(stage)
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {stage === 'all' ? 'All' : stage.replace(/_/g, ' ')}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                effectiveStageFilter === stage ? 'bg-white/20' : 'bg-background'
              )}>
                {stageCounts[stage] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <OpportunitiesCardGrid rows={pag.page} onSelect={handleSelect} />
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
              <Target className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No opportunities match this view"
          description="Try changing stage filters or search terms."
          actionLabel={onCreate ? '+ Add Opportunity' : undefined}
          onAction={onCreate}
        />
      )}
    </div>
  );
}
