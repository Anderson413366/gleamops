'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton, SlideOver,
} from '@gleamops/ui';
import { TIMESHEET_STATUS_COLORS } from '@gleamops/shared';
import type { Timesheet } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useBulkSelect } from '@/hooks/use-bulk-select';
import { EntityLink } from '@/components/links/entity-link';

interface TimesheetWithStaff extends Timesheet {
  staff?: { staff_code: string; full_name: string } | null;
}

interface TimesheetEntry {
  id: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  break_minutes: number;
  site?: { name: string; site_code: string } | null;
}

type StatusFilter = 'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

interface ManageTimesheetsProps {
  search: string;
}

export default function ManageTimesheets({ search }: ManageTimesheetsProps) {
  const [rows, setRows] = useState<TimesheetWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<TimesheetWithStaff | null>(null);
  const [detailEntries, setDetailEntries] = useState<TimesheetEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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
      .limit(200);
    if (!error && data) setRows(data as unknown as TimesheetWithStaff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by status + search
  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.staff?.full_name?.toLowerCase().includes(q) ||
          r.staff?.staff_code?.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, statusFilter, search]);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const counts = { all: rows.length, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of rows) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'week_start', 'desc'
  );
  const sortedRows = sorted as unknown as TimesheetWithStaff[];
  const pag = usePagination(sortedRows, 25);
  const bulk = useBulkSelect(pag.page);

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
    toast.success('Timesheet approved');
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
    toast.success('Timesheet rejected');
    fetchData();
  };

  const handleBulkAction = async (action: 'APPROVED' | 'REJECTED') => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ids = Array.from(bulk.selected);
    const affectedRows = rows.filter((r) => ids.includes(r.id) && r.status === 'SUBMITTED');
    if (affectedRows.length === 0) {
      toast.error('No SUBMITTED timesheets in selection');
      return;
    }

    for (const ts of affectedRows) {
      await supabase.from('timesheets').update({ status: action }).eq('id', ts.id);
      await supabase.from('timesheet_approvals').insert({
        tenant_id: ts.tenant_id,
        timesheet_id: ts.id,
        action,
        actor_user_id: user.id,
      });
    }

    toast.success(`${affectedRows.length} timesheet${affectedRows.length !== 1 ? 's' : ''} ${action.toLowerCase()}`);
    bulk.clear();
    fetchData();
  };

  // Load detail entries when selecting a timesheet
  const handleSelect = async (ts: TimesheetWithStaff) => {
    setSelected(ts);
    setDetailLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('time_entries')
      .select(`
        id, start_at, end_at, duration_minutes, break_minutes,
        site:site_id(name, site_code)
      `)
      .eq('staff_id', ts.staff_id)
      .gte('start_at', ts.week_start)
      .lte('start_at', ts.week_end)
      .is('archived_at', null)
      .order('start_at', { ascending: true });
    if (data) setDetailEntries(data as unknown as TimesheetEntry[]);
    setDetailLoading(false);
  };

  const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'SUBMITTED', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  if (loading) return <TableSkeleton rows={6} cols={8} />;

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setStatusFilter(chip.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === chip.key
                ? 'bg-module-accent/15 text-module-accent border border-module-accent/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
            }`}
          >
            {chip.label} ({statusCounts[chip.key]})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="timesheets-manage"
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
      </div>

      {/* Bulk action bar */}
      {bulk.selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-module-accent/30 bg-module-accent/5 px-4 py-2 mb-4">
          <span className="text-sm font-medium">{bulk.selectedCount} selected</span>
          <Button size="sm" onClick={() => handleBulkAction('APPROVED')}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve All
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleBulkAction('REJECTED')}>
            <XCircle className="h-4 w-4 mr-1" />
            Reject All
          </Button>
          <Button size="sm" variant="secondary" onClick={bulk.clear}>
            Clear
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No timesheets"
          description={search ? 'Try a different search term.' : 'Timesheets will appear here when staff submit weekly hours.'}
        />
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={bulk.allSelected}
                      ref={(el) => { if (el) el.indeterminate = bulk.someSelected; }}
                      onChange={bulk.toggleAll}
                      className="h-4 w-4 rounded border-border"
                    />
                  </TableHead>
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
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => handleSelect(row)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={bulk.isSelected(row.id)}
                        onChange={() => bulk.toggle(row.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(row.week_start).toLocaleDateString()} — {new Date(row.week_end).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.staff?.staff_code ? (
                        <EntityLink
                          entityType="staff"
                          code={row.staff.staff_code}
                          name={row.staff.full_name ?? row.staff.staff_code}
                          showCode={false}
                          stopPropagation
                        />
                      ) : (
                        row.staff?.full_name ?? '—'
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{Number(row.total_hours).toFixed(1)}</TableCell>
                    <TableCell>{Number(row.regular_hours).toFixed(1)}</TableCell>
                    <TableCell className={Number(row.overtime_hours) > 0 ? 'text-warning font-medium' : ''}>
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" onClick={() => handleApprove(row.id)}>Approve</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleReject(row.id)}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
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

      {/* Detail SlideOver */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Timesheet — ${selected.staff?.full_name ?? ''}`.trim() : 'Timesheet'}
        subtitle={
          selected
            ? `${new Date(selected.week_start).toLocaleDateString()} — ${new Date(selected.week_end).toLocaleDateString()}`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <Badge color={TIMESHEET_STATUS_COLORS[selected.status] ?? 'gray'}>{selected.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Total Hours</div>
                <div className="text-lg font-semibold">{Number(selected.total_hours).toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Exceptions</div>
                <div className="text-lg font-semibold">{selected.exception_count}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Regular</div>
                <div className="text-lg font-semibold">{Number(selected.regular_hours).toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Overtime</div>
                <div className={`text-lg font-semibold ${Number(selected.overtime_hours) > 0 ? 'text-warning' : ''}`}>
                  {Number(selected.overtime_hours).toFixed(1)}
                </div>
              </div>
            </div>

            {/* Time entries for the week */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-2">Time Entries</h4>
              {detailLoading ? (
                <p className="text-xs text-muted-foreground">Loading entries...</p>
              ) : detailEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No time entries found for this period.</p>
              ) : (
                <div className="space-y-2">
                  {detailEntries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border bg-muted/10 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {new Date(entry.start_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.duration_minutes != null
                            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1 text-muted-foreground">
                        <span>
                          {new Date(entry.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {entry.end_at
                            ? new Date(entry.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Open'}
                        </span>
                        <span>{entry.site?.name ?? '—'}</span>
                      </div>
                      {entry.break_minutes > 0 && (
                        <div className="mt-1 text-muted-foreground">Break: {entry.break_minutes}m</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected.status === 'SUBMITTED' && (
              <div className="pt-2 flex items-center gap-2">
                <Button onClick={() => handleApprove(selected.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => handleReject(selected.id)}>Reject</Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
