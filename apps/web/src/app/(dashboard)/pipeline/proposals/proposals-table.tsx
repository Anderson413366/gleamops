'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { PROPOSAL_STATUS_COLORS } from '@gleamops/shared';
import type { SalesProposal } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

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
}

export default function ProposalsTable({ search, onSelect }: ProposalsTableProps) {
  const [rows, setRows] = useState<ProposalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.proposal_code.toLowerCase().includes(q) ||
        r.bid_version?.bid?.bid_code?.toLowerCase().includes(q) ||
        r.bid_version?.bid?.client?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'proposal_code', 'asc'
  );
  const sortedRows = sorted as unknown as ProposalWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<FileCheck className="h-12 w-12" />}
        title="No proposals"
        description={search ? 'Try a different search term.' : 'Generate a proposal from a priced bid.'}
      />
    );
  }

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
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'proposal_code' && sortDir} onSort={() => onSort('proposal_code')}>Code</TableHead>
            <TableHead>Bid</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Created</TableHead>
            <TableHead>Sent</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)}>
              <TableCell className="font-mono text-xs">{row.proposal_code}</TableCell>
              <TableCell className="font-mono text-xs text-muted">
                {row.bid_version?.bid?.bid_code ?? '—'}
              </TableCell>
              <TableCell className="font-medium">
                {row.bid_version?.bid?.client?.name ?? '—'}
              </TableCell>
              <TableCell>
                <Badge color={PROPOSAL_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell className="text-muted">
                {new Date(row.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted">
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
    </div>
  );
}
