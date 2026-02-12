'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Pagination,
  TableSkeleton,
} from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

// Extended type with joined client name
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.site_code.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q) ||
        r.address?.street?.toLowerCase().includes(q) ||
        r.address?.city?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as SiteWithClient[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

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
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'site_code' && sortDir} onSort={() => onSort('site_code')}>
              Code
            </TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>
              Name
            </TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Sq Ft</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)}>
              <TableCell className="font-mono text-xs">{row.site_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted">{row.client?.name ?? '—'}</TableCell>
              <TableCell className="text-muted">
                {row.address
                  ? [row.address.street, row.address.city, row.address.state]
                      .filter(Boolean)
                      .join(', ')
                  : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.square_footage ? row.square_footage.toLocaleString() : '—'}
              </TableCell>
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
      />
    </div>
  );
}
