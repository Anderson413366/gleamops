'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClipboardCheck, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Button, ExportButton, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { Inspection } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/utils/date';

interface InspectionWithRelations extends Inspection {
  site?: { name: string; site_code: string } | null;
  inspector?: { full_name: string; staff_code: string } | null;
  template?: { name: string } | null;
  ticket?: { ticket_code: string } | null;
}

interface InspectionsTableProps {
  search: string;
  onSelect?: (inspection: InspectionWithRelations) => void;
  onCreateNew?: () => void;
}

const STATUS_OPTIONS = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED', 'all'] as const;

export default function InspectionsTable({ search, onSelect, onCreateNew }: InspectionsTableProps) {
  const [rows, setRows] = useState<InspectionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('DRAFT');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        *,
        site:site_id(name, site_code),
        inspector:inspector_id(full_name, staff_code),
        template:template_id(name),
        ticket:ticket_id(ticket_code)
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as unknown as InspectionWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = row.status ?? 'DRAFT';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.status ?? 'DRAFT') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.inspection_code.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.inspector?.full_name?.toLowerCase().includes(q) ||
        r.template?.name?.toLowerCase().includes(q)
    );
  }, [rows, statusFilter, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'created_at', 'asc'
  );
  const sortedRows = sorted as unknown as InspectionWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No inspections yet'
    : `No ${selectedStatusLabel} inspections`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Run inspections to track quality and compliance performance.'
      : 'All inspections are currently in other statuses.';

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="inspections"
          columns={[
            { key: 'inspection_code', label: 'Code' },
            { key: 'score_pct', label: 'Score %' },
            { key: 'created_at', label: 'Date' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          New Inspection
        </Button>
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
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                statusFilter === status ? 'bg-white/20' : 'bg-background'
              )}
            >
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'inspection_code' && sortDir} onSort={() => onSort('inspection_code')}>Code</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Inspector</TableHead>
            <TableHead>Score</TableHead>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Date</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onSelect?.(row)}
              className={cn(statusRowAccentClass(row.status))}
            >
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-2">
                  <StatusDot status={row.status} />
                  <span>{row.inspection_code}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">{row.template?.name ?? '—'}</TableCell>
              <TableCell className="font-medium">{row.site?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.inspector?.full_name ?? '—'}</TableCell>
              <TableCell>
                {row.score_pct != null ? (
                  <span className={`text-sm font-medium ${Number(row.score_pct) >= 80 ? 'text-success' : Number(row.score_pct) >= 60 ? 'text-warning' : 'text-destructive'}`}>
                    {Number(row.score_pct).toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{formatDate(row.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ClipboardCheck className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={search || statusFilter !== 'all' ? undefined : '+ Add Your First Inspection'}
            onAction={search || statusFilter !== 'all' ? undefined : onCreateNew}
          >
            {!search && statusFilter === 'all' && (
              <ul className="space-y-2 text-left text-sm text-muted-foreground">
                <li>Score site quality with standardized checklists and templates.</li>
                <li>Catch service issues early before they impact client retention.</li>
                <li>Track pass trends over time for coaching and accountability.</li>
              </ul>
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
