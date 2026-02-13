'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Store } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface VendorRow {
  name: string;
  supplyCount: number;
  categories: string[];
}

interface Props {
  search: string;
}

export default function VendorsTable({ search }: Props) {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('supply_catalog')
      .select('preferred_vendor, category')
      .is('archived_at', null)
      .not('preferred_vendor', 'is', null);

    if (!error && data) {
      const vendorMap = new Map<string, { count: number; categories: Set<string> }>();
      for (const row of data) {
        const vendor = (row.preferred_vendor as string).trim();
        if (!vendor) continue;
        const existing = vendorMap.get(vendor);
        if (existing) {
          existing.count++;
          if (row.category) existing.categories.add(row.category);
        } else {
          const cats = new Set<string>();
          if (row.category) cats.add(row.category);
          vendorMap.set(vendor, { count: 1, categories: cats });
        }
      }

      const aggregated: VendorRow[] = Array.from(vendorMap.entries())
        .map(([name, info]) => ({
          name,
          supplyCount: info.count,
          categories: Array.from(info.categories).sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setRows(aggregated);
    }
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
        r.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as VendorRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={3} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Store className="h-12 w-12" />}
        title="No supply vendors found"
        description={search ? 'Try a different search term.' : 'Vendor names are pulled from the Supply Catalog\'s "Preferred Vendor" field.'}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Vendor Name</TableHead>
            <TableHead sortable sorted={sortKey === 'supplyCount' && sortDir} onSort={() => onSort('supplyCount')}>Supplies</TableHead>
            <TableHead>Categories</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="font-mono text-xs">{row.supplyCount}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {row.categories.length > 0 ? row.categories.join(', ') : '—'}
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
