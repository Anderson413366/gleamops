'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, Button, ExportButton,
} from '@gleamops/ui';
import type { Geofence } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { EntityLink } from '@/components/links/entity-link';

interface GeofenceWithSite extends Geofence {
  site?: { name: string; site_code: string } | null;
}

interface GeofenceTableProps {
  search: string;
  onAdd?: () => void;
  onSelect?: (geofence: GeofenceWithSite) => void;
}

export default function GeofenceTable({ search, onAdd, onSelect }: GeofenceTableProps) {
  const [rows, setRows] = useState<GeofenceWithSite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('geofences')
      .select(`
        *,
        site:sites!geofences_site_id_fkey(name, site_code)
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as GeofenceWithSite[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.site?.name?.toLowerCase().includes(q) ||
        r.site?.site_code?.toLowerCase().includes(q) ||
        String(r.radius_meters).includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'created_at', 'desc'
  );
  const sortedRows = sorted as unknown as GeofenceWithSite[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="geofences"
          columns={[
            { key: 'center_lat', label: 'Latitude' },
            { key: 'center_lng', label: 'Longitude' },
            { key: 'radius_meters', label: 'Radius (m)' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          New Geofence
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="No geofences"
          description={search ? 'Try a different search term.' : 'Create a geofence to enforce location-based check-ins.'}
        />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'site' && sortDir} onSort={() => onSort('site')}>Site</TableHead>
                  <TableHead sortable sorted={sortKey === 'center_lat' && sortDir} onSort={() => onSort('center_lat')}>Latitude</TableHead>
                  <TableHead sortable sorted={sortKey === 'center_lng' && sortDir} onSort={() => onSort('center_lng')}>Longitude</TableHead>
                  <TableHead sortable sorted={sortKey === 'radius_meters' && sortDir} onSort={() => onSort('radius_meters')}>Radius (m)</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow key={row.id} onClick={() => onSelect?.(row)}>
                    <TableCell className="font-medium">
                      {row.site?.site_code ? (
                        <EntityLink
                          entityType="site"
                          code={row.site.site_code}
                          name={row.site.name ?? row.site.site_code}
                          showCode={false}
                          stopPropagation
                        />
                      ) : (
                        row.site?.name ?? '—'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.center_lat.toFixed(6)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.center_lng.toFixed(6)}</TableCell>
                    <TableCell>{row.radius_meters}m</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
