'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
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
import { EntityLink } from '@/components/links/entity-link';

interface TimesheetWithStaff extends Timesheet {
  staff?: { staff_code: string; full_name: string } | null;
}

interface TimesheetsTableProps {
  search: string;
}

export default function TimesheetsTable({ search }: TimesheetsTableProps) {
  const [rows, setRows] = useState<TimesheetWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimesheetWithStaff | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('all');

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
    if (error) {
      console.error('[Timesheets] Fetch error:', error.message);
    } else if (data) {
      setRows(data as unknown as TimesheetWithStaff[]);
    }
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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id;
      if (!tenantId) { toast.error('Tenant context required.'); return; }

      // Get current week boundaries (Mon-Sun)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const wsStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      const weStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

      // Find staff with time entries this week who don't already have timesheets
      const { data: entries } = await supabase
        .from('time_entries')
        .select('staff_id, duration_minutes')
        .gte('clock_in', `${wsStr}T00:00:00`)
        .lte('clock_in', `${weStr}T23:59:59`)
        .not('clock_out', 'is', null);

      if (!entries || entries.length === 0) {
        toast.info('No completed time entries found for this week.');
        return;
      }

      // Group by staff
      const staffHours: Record<string, number> = {};
      for (const e of entries as Array<{ staff_id: string; duration_minutes: number | null }>) {
        staffHours[e.staff_id] = (staffHours[e.staff_id] ?? 0) + (e.duration_minutes ?? 0);
      }

      // Check existing timesheets for this week
      const { data: existing } = await supabase
        .from('timesheets')
        .select('staff_id')
        .eq('week_start', wsStr)
        .is('archived_at', null);

      const existingStaffIds = new Set((existing ?? []).map((t: { staff_id: string }) => t.staff_id));
      const newTimesheets = Object.entries(staffHours)
        .filter(([staffId]) => !existingStaffIds.has(staffId))
        .map(([staffId, totalMinutes]) => ({
          tenant_id: tenantId,
          staff_id: staffId,
          week_start: wsStr,
          week_end: weStr,
          total_hours: Math.round((totalMinutes / 60) * 10) / 10,
          regular_hours: Math.min(Math.round((totalMinutes / 60) * 10) / 10, 40),
          overtime_hours: Math.max(0, Math.round((totalMinutes / 60 - 40) * 10) / 10),
          break_hours: 0,
          exception_count: 0,
          status: 'DRAFT',
        }));

      if (newTimesheets.length === 0) {
        toast.info('Timesheets already exist for all staff this week.');
        return;
      }

      const { error } = await supabase.from('timesheets').insert(newTimesheets);
      if (error) { toast.error(error.message); return; }

      toast.success(`Generated ${newTimesheets.length} timesheet(s) for this week.`);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate timesheets.');
    } finally {
      setGenerating(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
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
          r.staff?.full_name?.toLowerCase().includes(q) ||
          r.staff?.staff_code?.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'week_start', 'asc'
  );
  const sortedRows = sorted as unknown as TimesheetWithStaff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={8} />;

  const STATUS_CHIPS = ['all', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

  if (filtered.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-module-accent/15 text-module-accent border border-module-accent/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()} ({statusCounts[s] ?? 0})
              </button>
            ))}
          </div>
          <Button onClick={handleGenerate} loading={generating}>
            <RefreshCw className="h-4 w-4" />
            Generate Timesheets
          </Button>
        </div>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={statusFilter !== 'all' ? `No ${statusFilter.toLowerCase()} timesheets` : 'No timesheets'}
          description={search ? 'Try a different search term.' : 'Click "Generate Timesheets" to create timesheets from this week\'s time entries.'}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-module-accent/15 text-module-accent border border-module-accent/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()} ({statusCounts[s] ?? 0})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleGenerate} loading={generating}>
          <RefreshCw className="h-4 w-4" />
          Generate
        </Button>
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
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'week_start' && sortDir} onSort={() => onSort('week_start')}>Week</TableHead>
              <TableHead sortable sorted={sortKey === 'staff_id' && sortDir} onSort={() => onSort('staff_id')}>Staff</TableHead>
              <TableHead>Total Hrs</TableHead>
              <TableHead>Regular</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Breaks</TableHead>
              <TableHead>Exceptions</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
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
                  {row.status === 'SUBMITTED' && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleApprove(row.id);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReject(row.id);
                        }}
                      >
                        Reject
                      </Button>
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

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Timesheet ${selected.staff?.full_name ?? ''}`.trim() : 'Timesheet'}
        subtitle={selected ? `${new Date(selected.week_start).toLocaleDateString()} — ${new Date(selected.week_end).toLocaleDateString()}` : undefined}
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
