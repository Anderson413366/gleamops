'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, cn,
} from '@gleamops/ui';
import type { Client } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { ClientsCardGrid } from './clients-card-grid';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'orange' | 'red' | 'blue' | 'yellow'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROSPECT: 'orange',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
};

const STATUS_OPTIONS = ['all', 'ACTIVE', 'INACTIVE', 'PROSPECT', 'ON_HOLD', 'CANCELED'] as const;

interface ClientsTableProps {
  search: string;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientsTable({ search }: ClientsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { view, setView } = useViewPreference('clients');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.client_code.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q) ||
          r.client_type?.toLowerCase().includes(q) ||
          r.industry?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as Client[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={8} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="No clients found"
        description={search ? 'Try a different search term.' : 'Create your first client to get started.'}
      />
    );
  }

  const handleRowClick = (row: Client) => {
    router.push(`/crm/clients/${row.client_code}`);
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="clients"
          columns={[
            { key: 'client_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'client_type', label: 'Type' },
            { key: 'industry', label: 'Industry' },
            { key: 'payment_terms', label: 'Payment Terms' },
            { key: 'contract_start_date', label: 'Contract Start' },
            { key: 'contract_end_date', label: 'Contract End' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatusFilter(status);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
      {view === 'card' ? (
        <ClientsCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'client_code' && sortDir} onSort={() => onSort('client_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
            <TableHead sortable sorted={sortKey === 'client_type' && sortDir} onSort={() => onSort('client_type')}>Type</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Payment Terms</TableHead>
            <TableHead sortable sorted={sortKey === 'contract_end_date' && sortDir} onSort={() => onSort('contract_end_date')}>Contract End</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.client_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <Badge color={STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.client_type ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.industry ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.billing_address
                  ? [row.billing_address.city, row.billing_address.state].filter(Boolean).join(', ')
                  : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.payment_terms ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.contract_end_date ?? null)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />
    </div>
  );
}
