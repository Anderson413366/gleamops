'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { SalesProposal } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { PipelineFlowHint } from '@/components/empty-states/pipeline-flow-hint';

interface ProposalWithRelations extends SalesProposal {
  bid_version?: {
    bid?: {
      bid_code: string;
      total_sqft?: number | null;
      bid_monthly_price?: number | null;
      client?: { name: string } | null;
      service?: { name: string } | null;
    } | null;
  } | null;
}

interface ProposalsTableProps {
  search: string;
  onSelect?: (proposal: ProposalWithRelations) => void;
  onGoToBids?: () => void;
}

export default function ProposalsTable({ search, onSelect, onGoToBids }: ProposalsTableProps) {
  const [rows, setRows] = useState<ProposalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  // UX requirement: default to Active when available; move "all" to the end.
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_proposals')
      .select(`
        *,
        bid_version:bid_version_id(
          bid:bid_id(
            bid_code,
            client_id,
            total_sqft,
            bid_monthly_price,
            client:client_id(name),
            service:service_id(name)
          )
        )
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as ProposalWithRelations[]);
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
        r.proposal_code.toLowerCase().includes(q) ||
        r.bid_version?.bid?.bid_code?.toLowerCase().includes(q) ||
        r.bid_version?.bid?.client?.name?.toLowerCase().includes(q)
    );
  }, [rows, search, effectiveStatusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'proposal_code', 'asc'
  );
  const sortedRows = sorted as unknown as ProposalWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="proposals"
          columns={[
            { key: 'proposal_code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Created' },
            { key: 'pdf_generated_at', label: 'Sent' },
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
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={(
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <FileCheck className="h-10 w-10" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
            </div>
          )}
          title="No proposals"
          description={search ? 'Try a different search term.' : 'Generate polished proposals from approved bids and send for signature.'}
          actionLabel={search ? undefined : '+ Go To Bids'}
          onAction={search ? undefined : onGoToBids}
        >
          {!search && (
            <div className="space-y-4 text-left">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Turn finalized pricing into client-ready documents.</li>
                <li>Track sent, viewed, and signed states from one queue.</li>
                <li>Keep deal momentum with clear follow-up visibility.</li>
              </ul>
              <PipelineFlowHint />
            </div>
          )}
        </EmptyState>
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'proposal_code' && sortDir} onSort={() => onSort('proposal_code')}>Code</TableHead>
                <TableHead>Bid</TableHead>
                <TableHead>Client</TableHead>
                <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Created</TableHead>
                <TableHead>Sent</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onSelect?.(row)}
                  className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <span>{row.proposal_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.bid_version?.bid?.bid_code ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.bid_version?.bid?.client?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.pdf_generated_at ? new Date(row.pdf_generated_at).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
            pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
            onNext={pag.nextPage} onPrev={pag.prevPage}
          />
        </>
      )}
    </div>
  );
}
