'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Handshake, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn, ViewToggle,
} from '@gleamops/ui';
import type { SalesProspect } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { ProspectForm } from '@/components/forms/prospect-form';
import { PipelineFlowHint } from '@/components/empty-states/pipeline-flow-hint';
import { useViewPreference } from '@/hooks/use-view-preference';
import { ProspectsCardGrid } from './prospects-card-grid';

interface ProspectsTableProps {
  search: string;
}

export default function ProspectsTable({ search }: ProspectsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<SalesProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const { view, setView } = useViewPreference('prospects');
  // UX requirement: default to Active when available; move "all" to the end.
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_prospects')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as SalesProspect[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.prospect_status_code).filter(Boolean)));
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
      result = result.filter((r) => r.prospect_status_code === effectiveStatusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.company_name.toLowerCase().includes(q) ||
        r.prospect_code.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q)
    );
  }, [rows, search, effectiveStatusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'company_name', 'asc'
  );
  const sortedRows = sorted as unknown as SalesProspect[];
  const pag = usePagination(sortedRows, 25);
  const selectedStatusLabel = effectiveStatusFilter === 'all'
    ? 'all statuses'
    : effectiveStatusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = effectiveStatusFilter === 'all'
    ? 'No prospects'
    : `No ${selectedStatusLabel} prospects found`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : effectiveStatusFilter === 'all'
      ? 'Start your pipeline by capturing your first lead.'
      : 'All your prospects are currently in other statuses.';

  const handleAdd = () => {
    setFormOpen(true);
  };

  const handleRowClick = useCallback((row: SalesProspect) => {
    router.push(`/pipeline/prospects/${encodeURIComponent(row.prospect_code)}`);
  }, [router]);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-3">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="prospects"
          columns={[
            { key: 'prospect_code', label: 'Code' },
            { key: 'company_name', label: 'Company' },
            { key: 'prospect_status_code', label: 'Status' },
            { key: 'source', label: 'Source' },
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
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? null : <ProspectsCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'prospect_code' && sortDir} onSort={() => onSort('prospect_code')}>Code</TableHead>
              <TableHead sortable sorted={sortKey === 'company_name' && sortDir} onSort={() => onSort('company_name')}>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Created</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={cn('cursor-pointer', statusRowAccentClass(row.prospect_status_code))}
              >
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <StatusDot status={row.prospect_status_code} />
                    <span>{row.prospect_code}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{row.company_name}</TableCell>
                <TableCell className="text-muted-foreground">{row.source ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <Handshake className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={search ? undefined : '+ Add Your First Prospect'}
            onAction={search ? undefined : handleAdd}
          >
            {!search && (
              <div className="space-y-4 text-left">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Track every lead from first contact to signed contract.</li>
                  <li>Capture source, notes, and next steps so follow-up never slips.</li>
                  <li>Build a reliable pipeline your team can work from daily.</li>
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

      <ProspectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
