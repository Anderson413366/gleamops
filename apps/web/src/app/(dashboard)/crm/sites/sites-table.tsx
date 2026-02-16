'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { Site } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { SitesCardGrid } from './sites-card-grid';

const PRIORITY_COLORS: Record<string, 'red' | 'blue' | 'yellow' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'blue',
  MEDIUM: 'yellow',
  LOW: 'gray',
  NORMAL: 'gray',
  STANDARD: 'gray',
};

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'CANCELED', 'all'] as const;

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SitesTableProps {
  search: string;
}

export default function SitesTable({ search }: SitesTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<SiteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const { view, setView } = useViewPreference('sites');

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      if (r.status) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
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
          r.site_code.toLowerCase().includes(q) ||
          r.client?.name?.toLowerCase().includes(q) ||
          r.address?.street?.toLowerCase().includes(q) ||
          r.address?.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as SiteWithClient[];
  const pag = usePagination(sortedRows, 25);

  const handleRowClick = (row: SiteWithClient) => {
    router.push(`/crm/sites/${row.site_code}`);
  };

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
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
      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="No sites found"
          description={search ? 'Try a different search term.' : 'Create your first site to get started.'}
        />
      ) : (
        <>
          {view === 'card' ? (
            <SitesCardGrid rows={pag.page} onSelect={handleRowClick} />
          ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'site_code' && sortDir} onSort={() => onSort('site_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Address</TableHead>
                <TableHead sortable sorted={sortKey === 'square_footage' && sortDir} onSort={() => onSort('square_footage')}>Sq Ft</TableHead>
                <TableHead>Floors</TableHead>
                <TableHead>Priority</TableHead>
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
                      <span>{row.site_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.client?.name ?? '---'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.address
                      ? [row.address.city, row.address.state].filter(Boolean).join(', ')
                      : '---'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.square_footage ? row.square_footage.toLocaleString() : '---'}
                  </TableCell>
                  <TableCell className="text-center">{row.number_of_floors ?? '---'}</TableCell>
                  <TableCell>
                    {row.priority_level ? (
                      <Badge color={PRIORITY_COLORS[row.priority_level] ?? 'gray'}>{row.priority_level}</Badge>
                    ) : '---'}
                  </TableCell>
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
        </>
      )}
    </div>
  );
}
