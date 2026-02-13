'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton,
} from '@gleamops/ui';
import { TIMESHEET_STATUS_COLORS } from '@gleamops/shared';
import type { Timesheet } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface TimesheetWithStaff extends Timesheet {
  staff?: { staff_code: string; full_name: string } | null;
}

interface TimesheetsTableProps {
  search: string;
}

export default function TimesheetsTable({ search }: TimesheetsTableProps) {
  const [rows, setRows] = useState<TimesheetWithStaff[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        staff:staff_id(staff_code, full_name)
      `)
      .is('archived_at', null)
      .order('week_start', { ascending: false })
      .limit(100);
    if (!error && data) setRows(data as unknown as TimesheetWithStaff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (timesheetId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ts = rows.find((r) => r.id === timesheetId);
    if (!ts) return;

    await supabase.from('timesheets').update({ status: 'APPROVED' }).eq('id', timesheetId);
    await supabase.from('timesheet_approvals').insert({
      tenant_id: ts.tenant_id,
      timesheet_id: timesheetId,
      action: 'APPROVED',
      actor_user_id: user.id,
    });

    fetchData();
  };

  const handleReject = async (timesheetId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ts = rows.find((r) => r.id === timesheetId);
    if (!ts) return;

    await supabase.from('timesheets').update({ status: 'REJECTED' }).eq('id', timesheetId);
    await supabase.from('timesheet_approvals').insert({
      tenant_id: ts.tenant_id,
      timesheet_id: timesheetId,
      action: 'REJECTED',
      actor_user_id: user.id,
    });

    fetchData();
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staff?.full_name?.toLowerCase().includes(q) ||
        r.staff?.staff_code?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'week_start', 'asc'
  );
  const sortedRows = sorted as unknown as TimesheetWithStaff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={8} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No timesheets"
        description={search ? 'Try a different search term.' : 'Timesheets are generated weekly from time entries.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="timesheets"
          columns={[
            { key: 'week_start', label: 'Week Start' },
            { key: 'week_end', label: 'Week End' },
            { key: 'total_hours', label: 'Total Hours' },
            { key: 'regular_hours', label: 'Regular Hours' },
            { key: 'overtime_hours', label: 'Overtime Hours' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'week_start' && sortDir} onSort={() => onSort('week_start')}>Week</TableHead>
            <TableHead sortable sorted={sortKey === 'staff_id' && sortDir} onSort={() => onSort('staff_id')}>Staff</TableHead>
            <TableHead>Total Hrs</TableHead>
            <TableHead>Regular</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Breaks</TableHead>
            <TableHead>Exceptions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="text-sm">
                  {new Date(row.week_start).toLocaleDateString()} — {new Date(row.week_end).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell className="font-medium">{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell className="font-semibold">{Number(row.total_hours).toFixed(1)}</TableCell>
              <TableCell>{Number(row.regular_hours).toFixed(1)}</TableCell>
              <TableCell className={Number(row.overtime_hours) > 0 ? 'text-orange-600 font-medium' : ''}>
                {Number(row.overtime_hours).toFixed(1)}
              </TableCell>
              <TableCell className="text-muted-foreground">{Number(row.break_hours).toFixed(1)}</TableCell>
              <TableCell>
                {row.exception_count > 0 ? (
                  <Badge color="red">{row.exception_count}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell>
                <Badge color={TIMESHEET_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell>
                {row.status === 'SUBMITTED' && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => handleApprove(row.id)}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleReject(row.id)}>Reject</Button>
                  </div>
                )}
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
