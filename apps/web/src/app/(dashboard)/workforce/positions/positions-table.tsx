'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { StaffPosition } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, SlideOver, ExportButton
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface Props {
  search: string;
}

interface StaffCountLite {
  role: string | null;
  staff_type: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function renderNotSet() {
  return <span className="italic text-muted-foreground">Not Set</span>;
}

export default function PositionsTable({ search }: Props) {
  const [rows, setRows] = useState<StaffPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffPosition | null>(null);
  const [staffCountByPositionId, setStaffCountByPositionId] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff_positions')
      .select('*')
      .is('archived_at', null)
      .order('title');
    if (!error && data) {
      const positionRows = data as StaffPosition[];
      setRows(positionRows);

      const { data: staffRows } = await supabase
        .from('staff')
        .select('role, staff_type')
        .is('archived_at', null);

      const staff = (staffRows ?? []) as StaffCountLite[];
      const counts: Record<string, number> = {};
      for (const position of positionRows) {
        const byCode = normalize(position.position_code);
        const byTitle = normalize(position.title);
        counts[position.id] = staff.filter((member) => {
          const role = normalize(member.role);
          const staffType = normalize(member.staff_type);
          return role === byCode || role === byTitle || staffType === byCode || staffType === byTitle;
        }).length;
      }
      setStaffCountByPositionId(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.position_code.toLowerCase().includes(q) ||
      (r.department ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'title', 'asc');
  const sortedRows = sorted as unknown as StaffPosition[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;
  if (filtered.length === 0) return <EmptyState icon={<BriefcaseBusiness className="h-10 w-10" />} title="No positions found" description="Add a position to get started." />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered.map((row) => ({
            ...row,
            department_display: row.department ?? 'Not Set',
            staff_count: staffCountByPositionId[row.id] ?? 0,
            description: row.notes ?? '',
          })) as unknown as Record<string, unknown>[]}
          filename="positions"
          columns={[
            { key: 'position_code', label: 'Code' },
            { key: 'title', label: 'Title' },
            { key: 'department_display', label: 'Department' },
            { key: 'pay_grade', label: 'Pay Grade' },
            { key: 'staff_count', label: 'Staff Count' },
            { key: 'description', label: 'Description' },
          ]}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'position_code' && sortDir} onSort={() => onSort('position_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'title' && sortDir} onSort={() => onSort('title')}>Title</TableHead>
            <TableHead sortable sorted={sortKey === 'department' && sortDir} onSort={() => onSort('department')}>Department</TableHead>
            <TableHead>Pay Grade</TableHead>
            <TableHead>Staff Count</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
              <TableCell className="font-mono text-xs">
                <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1">
                  <span className="truncate" title={row.position_code}>{row.position_code}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="max-w-[250px]">
                  <div className="truncate" title={row.title}>{row.title}</div>
                  {row.notes && (
                    <div className="truncate text-xs text-muted-foreground" title={row.notes}>{row.notes}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-block max-w-[180px] truncate text-muted-foreground" title={row.department ?? 'Not Set'}>
                  {row.department ?? 'Not Set'}
                </span>
              </TableCell>
              <TableCell>{row.pay_grade ?? renderNotSet()}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{staffCountByPositionId[row.id] ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages}
        totalItems={pag.totalItems} pageSize={pag.pageSize}
        hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.title}` : 'Position'}
        subtitle={selected?.position_code}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <Badge color={selected.is_active ? 'green' : 'gray'}>
                {selected.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium text-right">{selected.department ?? renderNotSet()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pay Grade</span>
              <span className="font-medium text-right">{selected.pay_grade ?? renderNotSet()}</span>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
