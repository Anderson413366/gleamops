'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import type { Client } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const STATUS_COLORS: Record<string, 'green' | 'gray' | 'orange' | 'red' | 'blue' | 'yellow'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROSPECT: 'orange',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
};

interface ClientsTableProps {
  search: string;
  onSelect?: (client: Client) => void;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientsTable({ search, onSelect }: ClientsTableProps) {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.client_code.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.client_type?.toLowerCase().includes(q) ||
        r.industry?.toLowerCase().includes(q)
    );
  }, [rows, search]);

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

  return (
    <div>
      <div className="flex justify-end mb-4">
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
            <TableRow key={row.id} onClick={() => onSelect?.(row)} className="cursor-pointer">
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
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />
    </div>
  );
}
