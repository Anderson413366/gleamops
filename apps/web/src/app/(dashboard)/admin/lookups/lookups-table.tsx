'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Lookup } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
  onRefresh?: () => void;
}

export default function LookupsTable({ search, autoCreate, onAutoCreateHandled }: Props) {
  const [rows, setRows] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  // Per product rule: default to ACTIVE; ACTIVE first; ALL last.
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('lookups')
      .select('*')
      .order('category')
      .order('sort_order');
    if (!error && data) setRows(data as Lookup[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoCreate && !loading) {
      // Future: open lookup form
      onAutoCreateHandled?.();
    }
  }, [autoCreate, loading, onAutoCreateHandled]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeFilter === 'active') result = result.filter((row) => row.is_active);
    if (activeFilter === 'inactive') result = result.filter((row) => !row.is_active);
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter((r) =>
      r.category.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q)
    );
  }, [rows, search, activeFilter]);

  const activeCounts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((row) => row.is_active).length,
    inactive: rows.filter((row) => !row.is_active).length,
  }), [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'category',
    'asc'
  );
  const sortedRows = sorted as unknown as Lookup[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-10 w-10" />}
        title="No lookups found"
        description="No lookup values match your search criteria."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['active', 'inactive', 'all'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setActiveFilter(option)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeFilter === option
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              activeFilter === option ? 'bg-white/20' : 'bg-background'
            )}>
              {activeCounts[option]}
            </span>
          </button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>Category</TableHead>
            <TableHead sortable sorted={sortKey === 'code' && sortDir} onSort={() => onSort('code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'label' && sortDir} onSort={() => onSort('label')}>Label</TableHead>
            <TableHead>Order</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge color="blue">{row.category.replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.code}</TableCell>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.sort_order}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        totalItems={pag.totalItems}
        pageSize={pag.pageSize}
        hasNext={pag.hasNext}
        hasPrev={pag.hasPrev}
        onNext={pag.nextPage}
        onPrev={pag.prevPage}
        onGoTo={pag.goToPage}
      />
    </div>
  );
}
