'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
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
  ExportButton,
  cn,
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
}

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'CANCELED', 'all'] as const;

export default function SitesTable({ search }: SitesTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<SiteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const handleRowClick = useCallback((row: SiteWithClient) => {
    router.push(`/crm/sites/${encodeURIComponent(row.site_code)}`);
  }, [router]);

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
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.status ?? '').toUpperCase() === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.site_code.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q) ||
        r.address?.street?.toLowerCase().includes(q) ||
        r.address?.city?.toLowerCase().includes(q)
    );
  }, [rows, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const status = (row.status ?? '').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as SiteWithClient[];
  const pag = usePagination(sortedRows, 25);
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No sites found'
    : `No ${selectedStatusLabel} sites found`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Create your first site to get started.'
      : 'All your sites are currently in other statuses.';

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="sites"
          columns={[
            { key: 'site_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'square_footage', label: 'Sq Ft' },
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
            <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.site_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.client?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
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
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      )}
      {filtered.length > 0 && (
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
      )}
    </div>
  );
}
