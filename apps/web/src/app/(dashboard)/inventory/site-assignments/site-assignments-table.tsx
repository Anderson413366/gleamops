'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SiteSupply } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface SiteSupplyRow extends SiteSupply {
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
}

export default function SiteAssignmentsTable({ search }: Props) {
  const [rows, setRows] = useState<SiteSupplyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('site_supplies')
      .select('*, site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as SiteSupplyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.site?.name ?? '').toLowerCase().includes(q) ||
      (r.site?.site_code ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as SiteSupplyRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={4} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="h-12 w-12" />}
        title="No site assignments found"
        description="Supplies assigned to sites will appear here."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>
              Supply
            </TableHead>
            <TableHead>Site</TableHead>
            <TableHead sortable sorted={sortKey === 'category' && sortDir} onSort={() => onSort('category')}>
              Category
            </TableHead>
            <TableHead>SDS</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                {row.site ? (
                  <div>
                    <span>{row.site.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{row.site.site_code}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
              <TableCell>
                {row.sds_url ? (
                  <a
                    href={row.sds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    View SDS
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
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
