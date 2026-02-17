'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn, Button,
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
  onGoToBids?: () => void;
}

const STATUS_OPTIONS = [
  'DRAFT',
  'GENERATED',
  'SENT',
  'DELIVERED',
  'OPENED',
  'WON',
  'LOST',
  'EXPIRED',
  'all',
] as const;

export default function ProposalsTable({ search, onGoToBids }: ProposalsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ProposalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('DRAFT');

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
        r.proposal_code.toLowerCase().includes(q) ||
        r.bid_version?.bid?.bid_code?.toLowerCase().includes(q) ||
        r.bid_version?.bid?.client?.name?.toLowerCase().includes(q)
    );
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'proposal_code', 'asc'
  );
  const sortedRows = sorted as unknown as ProposalWithRelations[];
  const pag = usePagination(sortedRows, 25);
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No proposals yet'
    : `No ${selectedStatusLabel} proposals`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Generate polished proposals from approved bids and send for signature.'
      : `There are currently no proposals with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';
  const handleRowClick = useCallback((row: ProposalWithRelations) => {
    router.push(`/pipeline/proposals/${encodeURIComponent(row.proposal_code)}`);
  }, [router]);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={() => onGoToBids?.()} disabled={!onGoToBids}>
          <Plus className="h-4 w-4" /> New Proposal
        </Button>
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
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
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
              onClick={() => handleRowClick(row)}
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
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <FileCheck className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Go To Bids' : undefined}
            onAction={showGuidedEmptyState ? onGoToBids : undefined}
          >
            {showGuidedEmptyState && (
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
