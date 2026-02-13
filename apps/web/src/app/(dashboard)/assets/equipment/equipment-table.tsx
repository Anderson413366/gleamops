'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Wrench } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Equipment } from '@gleamops/shared';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface EquipmentRow extends Equipment {
  staff?: { full_name: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface Props {
  search: string;
  onSelect?: (eq: EquipmentRow) => void;
}

export default function EquipmentTable({ search, onSelect }: Props) {
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('equipment')
      .select('*, staff:assigned_to(full_name), site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as EquipmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.equipment_code.toLowerCase().includes(q) ||
      (r.equipment_type ?? '').toLowerCase().includes(q) ||
      (r.serial_number ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as EquipmentRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Wrench className="h-12 w-12" />}
        title="No equipment found"
        description="Add equipment to get started."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'equipment_code' && sortDir} onSort={() => onSort('equipment_code')}>
              Code
            </TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>
              Name
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Condition</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onSelect?.(row)}
              className={onSelect ? 'cursor-pointer' : undefined}
            >
              <TableCell className="font-mono text-xs">{row.equipment_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.equipment_type ?? '—'}</TableCell>
              <TableCell>{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell>{row.site?.name ?? '—'}</TableCell>
              <TableCell>
                <Badge color={(EQUIPMENT_CONDITION_COLORS[row.condition ?? ''] as StatusColor) ?? 'gray'}>
                  {(row.condition ?? 'N/A').replace(/_/g, ' ')}
                </Badge>
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
