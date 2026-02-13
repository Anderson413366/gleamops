'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

const SITE_STATUS_COLORS: Record<string, 'green' | 'gray' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
};

const PRIORITY_COLORS: Record<string, 'red' | 'orange' | 'yellow' | 'blue' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'blue',
  NORMAL: 'gray',
};

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SitesTableProps {
  search: string;
  onSelect?: (site: SiteWithClient) => void;
}

export default function SitesTable({ search, onSelect }: SitesTableProps) {
  const [rows, setRows] = useState<SiteWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sites')
      .select('*, client:client_id(name, client_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as SiteWithClient[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.site_code.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q) ||
        r.address?.street?.toLowerCase().includes(q) ||
        r.address?.city?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as SiteWithClient[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={8} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="h-12 w-12" />}
        title="No sites found"
        description={search ? 'Try a different search term.' : 'Create your first site to get started.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="sites"
          columns={[
            { key: 'site_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'square_footage', label: 'Sq Ft' },
            { key: 'number_of_floors', label: 'Floors' },
            { key: 'priority_level', label: 'Priority' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'site_code' && sortDir} onSort={() => onSort('site_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
            <TableHead>Address</TableHead>
            <TableHead sortable sorted={sortKey === 'square_footage' && sortDir} onSort={() => onSort('square_footage')}>Sq Ft</TableHead>
            <TableHead>Floors</TableHead>
            <TableHead>Priority</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.site_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.client?.name ?? '—'}</TableCell>
              <TableCell>
                {row.status ? (
                  <Badge color={SITE_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                ) : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.address
                  ? [row.address.city, row.address.state].filter(Boolean).join(', ')
                  : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.square_footage ? row.square_footage.toLocaleString() : '—'}
              </TableCell>
              <TableCell className="text-center">{row.number_of_floors ?? '—'}</TableCell>
              <TableCell>
                {row.priority_level ? (
                  <Badge color={PRIORITY_COLORS[row.priority_level] ?? 'gray'}>{row.priority_level}</Badge>
                ) : '—'}
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
