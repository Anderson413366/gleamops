'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DollarSign, Plus, Check, X, Play, FileCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Staff, Timesheet, PayrollRun, PayPeriod, EarningCode } from '@gleamops/shared';
import { normalizeRoleCode } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, Button, Input, Select,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useAuth } from '@/hooks/use-auth';

/* ---------- Extended types ---------- */

interface TimesheetWithStaff extends Timesheet {
  staff?: { staff_code: string; full_name: string } | null;
}

interface PayrollRunWithPeriod extends PayrollRun {
  pay_periods?: { period_start: string; period_end: string; pay_date: string } | null;
}

/* ---------- Props ---------- */

interface Props {
  search: string;
  subTab?: string;
}

/* ---------- Status color maps ---------- */

const TS_COLORS: Record<string, 'gray' | 'yellow' | 'green' | 'red'> = {
  DRAFT: 'gray', SUBMITTED: 'yellow', APPROVED: 'green', REJECTED: 'red',
};

const RUN_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'purple'> = {
  DRAFT: 'gray', CALCULATED: 'blue', APPROVED: 'green', EXPORTED: 'purple',
};

const PERIOD_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'gray'> = {
  OPEN: 'blue', APPROVED: 'green', EXPORTED: 'purple', CLOSED: 'gray',
};

const EARNING_TYPE_COLORS: Record<string, 'blue' | 'yellow' | 'orange' | 'green' | 'purple' | 'gray'> = {
  REGULAR: 'blue', OVERTIME: 'yellow', DOUBLE_TIME: 'orange',
  BONUS: 'green', TRAVEL: 'purple', OTHER: 'gray',
};

/* ---------- Helpers ---------- */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_FILTERS = ['all', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const EARNING_TYPE_OPTIONS = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'DOUBLE_TIME', label: 'Double Time' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'OTHER', label: 'Other' },
];

/* ============================================================
   TAB 1: Scheduled Hours (enhanced staff roster)
   ============================================================ */

function ScheduledHoursPanel({ search }: { search: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [staffRes, tsRes] = await Promise.all([
      supabase.from('staff').select('*').is('archived_at', null).eq('status', 'ACTIVE').order('full_name'),
      supabase.from('timesheets').select('staff_id, total_hours').eq('status', 'APPROVED'),
    ]);
    if (staffRes.data) setStaff(staffRes.data as Staff[]);
    const map: Record<string, number> = {};
    for (const row of (tsRes.data ?? []) as { staff_id: string; total_hours: number }[]) {
      map[row.staff_id] = (map[row.staff_id] || 0) + Number(row.total_hours || 0);
    }
    setHoursMap(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter((r) =>
      r.full_name.toLowerCase().includes(q) || r.staff_code.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'full_name', 'asc');
  const sortedRows = sorted as unknown as Staff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="scheduled-hours"
          columns={[
            { key: 'staff_code', label: 'Code' },
            { key: 'full_name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'pay_rate', label: 'Pay Rate' },
            { key: 'pay_type', label: 'Pay Type' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'full_name' && sortDir} onSort={() => onSort('full_name')}>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead sortable sorted={sortKey === 'pay_rate' && sortDir} onSort={() => onSort('pay_rate')}>Pay Rate</TableHead>
            <TableHead>Pay Type</TableHead>
            <TableHead>Approved Hours</TableHead>
            <TableHead>Type</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.staff_code}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{row.pay_rate ? `${usd.format(row.pay_rate)}/hr` : '—'}</TableCell>
              <TableCell>
                {row.pay_type ? (
                  <Badge color={row.pay_type === 'Hourly' ? 'blue' : 'green'}>{row.pay_type}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {hoursMap[row.id] ? `${hoursMap[row.id].toFixed(1)}h` : '0h'}
              </TableCell>
              <TableCell>
                <Badge color={row.is_subcontractor ? 'orange' : 'blue'}>
                  {row.is_subcontractor ? 'Subcontractor' : 'Employee'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages}
          totalItems={pag.totalItems} pageSize={pag.pageSize}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
        />
      )}
      {filtered.length === 0 && (
        <EmptyState
          icon={<DollarSign className="h-10 w-10" />}
          title={search ? 'No matching staff' : 'No staff on payroll'}
          description={search ? 'Try a different search term.' : 'Staff will appear here once added to the system.'}
        />
      )}
    </div>
  );
}

/* ============================================================
   TAB 2: Confirmed Hours (timesheets with approve/reject)
   ============================================================ */

function ConfirmedHoursPanel({ search }: { search: string }) {
  const [rows, setRows] = useState<TimesheetWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('timesheets')
      .select('*, staff:staff_id(staff_code, full_name)')
      .is('archived_at', null)
      .in('status', ['SUBMITTED', 'APPROVED', 'REJECTED'])
      .order('week_start', { ascending: false })
      .limit(200);
    if (data) setRows(data as TimesheetWithStaff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ts = rows.find((r) => r.id === id);
    if (!ts) return;
    const { error } = await supabase.from('timesheets').update({ status: 'APPROVED' }).eq('id', id);
    if (error) { toast.error('Failed to approve timesheet'); return; }
    await supabase.from('timesheet_approvals').insert({
      tenant_id: ts.tenant_id,
      timesheet_id: id,
      action: 'APPROVED',
      actor_user_id: user.id,
    });
    toast.success('Timesheet approved');
    fetchData();
  };

  const handleReject = async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ts = rows.find((r) => r.id === id);
    if (!ts) return;
    const { error } = await supabase.from('timesheets').update({ status: 'REJECTED' }).eq('id', id);
    if (error) { toast.error('Failed to reject timesheet'); return; }
    await supabase.from('timesheet_approvals').insert({
      tenant_id: ts.tenant_id,
      timesheet_id: id,
      action: 'REJECTED',
      actor_user_id: user.id,
    });
    toast.success('Timesheet rejected');
    fetchData();
  };

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.staff?.full_name?.toLowerCase().includes(q) ||
        r.staff?.staff_code?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'week_start', 'desc');
  const sortedRows = sorted as unknown as TimesheetWithStaff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={9} />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
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
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="confirmed-hours"
          columns={[
            { key: 'week_start', label: 'Week Start' },
            { key: 'week_end', label: 'Week End' },
            { key: 'regular_hours', label: 'Regular Hrs' },
            { key: 'overtime_hours', label: 'Overtime Hrs' },
            { key: 'break_hours', label: 'Break Hrs' },
            { key: 'total_hours', label: 'Total Hrs' },
            { key: 'exception_count', label: 'Exceptions' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Staff</TableHead>
            <TableHead sortable sorted={sortKey === 'week_start' && sortDir} onSort={() => onSort('week_start')}>Week</TableHead>
            <TableHead sortable sorted={sortKey === 'regular_hours' && sortDir} onSort={() => onSort('regular_hours')}>Regular</TableHead>
            <TableHead sortable sorted={sortKey === 'overtime_hours' && sortDir} onSort={() => onSort('overtime_hours')}>Overtime</TableHead>
            <TableHead>Break</TableHead>
            <TableHead sortable sorted={sortKey === 'total_hours' && sortDir} onSort={() => onSort('total_hours')}>Total</TableHead>
            <TableHead>Exceptions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {row.staff?.full_name ?? '—'}
                {row.staff?.staff_code && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{row.staff.staff_code}</span>
                )}
              </TableCell>
              <TableCell className="text-xs">{fmtDate(row.week_start)} – {fmtDate(row.week_end)}</TableCell>
              <TableCell className="font-mono text-xs">{row.regular_hours}h</TableCell>
              <TableCell className="font-mono text-xs">{row.overtime_hours}h</TableCell>
              <TableCell className="font-mono text-xs">{row.break_hours}h</TableCell>
              <TableCell className="font-mono text-xs font-semibold">{row.total_hours}h</TableCell>
              <TableCell>
                {row.exception_count > 0 ? (
                  <Badge color="red">{row.exception_count}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell>
                <Badge color={TS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell>
                {row.status === 'SUBMITTED' && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleApprove(row.id); }}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReject(row.id); }}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages}
          totalItems={pag.totalItems} pageSize={pag.pageSize}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
        />
      )}
      {filtered.length === 0 && (
        <EmptyState
          icon={<DollarSign className="h-10 w-10" />}
          title={statusFilter !== 'all' ? `No ${statusFilter.toLowerCase()} timesheets` : 'No confirmed hours'}
          description="Timesheets will appear here once staff submit their hours."
        />
      )}
    </div>
  );
}

/* ============================================================
   TAB 3: Confirmed Time Sheets (payroll runs)
   ============================================================ */

function ConfirmedTimeSheetsPanel({ search }: { search: string }) {
  const [runs, setRuns] = useState<PayrollRunWithPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('payroll_runs')
      .select('*, pay_periods:pay_period_id(period_start, period_end, pay_date)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (data) setRuns(data as PayrollRunWithPeriod[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateRun = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: periods } = await supabase
      .from('pay_periods')
      .select('id')
      .eq('status', 'OPEN')
      .is('archived_at', null)
      .order('period_start', { ascending: false })
      .limit(1);

    if (!periods?.length) {
      toast.error('No open pay period found. Create one in Payroll Settings first.');
      return;
    }

    const { error } = await supabase.from('payroll_runs').insert({
      pay_period_id: periods[0].id,
      run_type: 'REGULAR',
      status: 'DRAFT',
    });

    if (error) {
      toast.error('Failed to create payroll run');
    } else {
      toast.success('Payroll run created');
      fetchData();
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const supabase = getSupabaseBrowserClient();
    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'APPROVED') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updates.approved_by_user_id = user.id;
        updates.approved_at = new Date().toISOString();
      }
    }

    const { error } = await supabase.from('payroll_runs').update(updates).eq('id', id);
    if (error) {
      toast.error(`Failed to update status to ${newStatus}`);
    } else {
      toast.success(`Payroll run updated to ${newStatus}`);
      fetchData();
    }
  };

  const filtered = useMemo(() => {
    if (!search) return runs;
    const q = search.toLowerCase();
    return runs.filter((r) =>
      r.run_type.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q),
    );
  }, [runs, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'created_at', 'desc');
  const sortedRows = sorted as unknown as PayrollRunWithPeriod[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button onClick={handleCreateRun}>
          <Plus className="h-4 w-4" /> New Payroll Run
        </Button>
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="payroll-runs"
          columns={[
            { key: 'id', label: 'Run ID' },
            { key: 'run_type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Created' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Run ID</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Type</TableHead>
            <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>Status</TableHead>
            <TableHead>Approved By</TableHead>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Created</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}...</TableCell>
              <TableCell className="text-xs">
                {row.pay_periods
                  ? `${fmtDate(row.pay_periods.period_start)} – ${fmtDate(row.pay_periods.period_end)}`
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge color={row.run_type === 'REGULAR' ? 'blue' : row.run_type === 'OFF_CYCLE' ? 'yellow' : 'orange'}>
                  {row.run_type.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge color={RUN_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.approved_at ? fmtDate(row.approved_at) : '—'}
              </TableCell>
              <TableCell className="text-xs">{fmtDate(row.created_at)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {row.status === 'DRAFT' && (
                    <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusUpdate(row.id, 'CALCULATED'); }}>
                      <Play className="h-3.5 w-3.5" /> Calculate
                    </Button>
                  )}
                  {row.status === 'CALCULATED' && (
                    <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusUpdate(row.id, 'APPROVED'); }}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {row.status === 'APPROVED' && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusUpdate(row.id, 'EXPORTED'); }}>
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  )}
                  {row.status === 'EXPORTED' && (
                    <Badge color="purple"><FileCheck className="h-3 w-3 inline mr-1" />Done</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages}
          totalItems={pag.totalItems} pageSize={pag.pageSize}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
        />
      )}
      {filtered.length === 0 && (
        <EmptyState
          icon={<DollarSign className="h-10 w-10" />}
          title="No payroll runs"
          description="Click '+ New Payroll Run' to create your first run."
        />
      )}
    </div>
  );
}

/* ============================================================
   TAB 4: Payroll Settings
   ============================================================ */

function PayrollSettingsPanel() {
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [earningCodes, setEarningCodes] = useState<EarningCode[]>([]);
  const [loading, setLoading] = useState(true);

  /* --- New Period form state --- */
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [newPayDate, setNewPayDate] = useState('');

  /* --- New Earning Code form state --- */
  const [showNewCode, setShowNewCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeType, setNewCodeType] = useState('REGULAR');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [periodsRes, codesRes] = await Promise.all([
      supabase.from('pay_periods').select('*').is('archived_at', null).order('period_start', { ascending: false }),
      supabase.from('earning_codes').select('*').is('archived_at', null).order('code'),
    ]);
    if (periodsRes.data) setPeriods(periodsRes.data as PayPeriod[]);
    if (codesRes.data) setEarningCodes(codesRes.data as EarningCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSavePeriod = async () => {
    if (!newPeriodStart || !newPeriodEnd || !newPayDate) {
      toast.error('All date fields are required');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('pay_periods').insert({
      period_start: newPeriodStart,
      period_end: newPeriodEnd,
      pay_date: newPayDate,
      status: 'OPEN',
    });
    if (error) {
      toast.error('Failed to create pay period');
    } else {
      toast.success('Pay period created');
      setShowNewPeriod(false);
      setNewPeriodStart('');
      setNewPeriodEnd('');
      setNewPayDate('');
      fetchData();
    }
  };

  const handleSaveCode = async () => {
    if (!newCode || !newCodeName) {
      toast.error('Code and Name are required');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('earning_codes').insert({
      code: newCode.toUpperCase(),
      name: newCodeName,
      type: newCodeType,
      is_active: true,
    });
    if (error) {
      toast.error(error.message?.includes('duplicate') ? 'Earning code already exists' : 'Failed to create earning code');
    } else {
      toast.success('Earning code created');
      setShowNewCode(false);
      setNewCode('');
      setNewCodeName('');
      setNewCodeType('REGULAR');
      fetchData();
    }
  };

  if (loading) return <TableSkeleton rows={4} cols={4} />;

  return (
    <div className="space-y-8">
      {/* --- Pay Periods Section --- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pay Periods</h3>
          <Button size="sm" onClick={() => setShowNewPeriod(!showNewPeriod)}>
            <Plus className="h-3.5 w-3.5" /> New Period
          </Button>
        </div>
        {showNewPeriod && (
          <div className="mb-3 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="Period Start" type="date" value={newPeriodStart} onChange={(e) => setNewPeriodStart(e.target.value)} required />
              <Input label="Period End" type="date" value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)} required />
              <Input label="Pay Date" type="date" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSavePeriod}>Save Period</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowNewPeriod(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Period Start</TableHead>
              <TableHead>Period End</TableHead>
              <TableHead>Pay Date</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{fmtDate(p.period_start)}</TableCell>
                <TableCell className="text-xs">{fmtDate(p.period_end)}</TableCell>
                <TableCell className="text-xs">{fmtDate(p.pay_date)}</TableCell>
                <TableCell>
                  <Badge color={PERIOD_COLORS[p.status] ?? 'gray'}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {periods.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No pay periods configured yet.</p>
        )}
      </section>

      {/* --- Earning Codes Section --- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Earning Codes</h3>
          <Button size="sm" onClick={() => setShowNewCode(!showNewCode)}>
            <Plus className="h-3.5 w-3.5" /> Add Code
          </Button>
        </div>
        {showNewCode && (
          <div className="mb-3 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="Code" placeholder="e.g. OT" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
              <Input label="Name" placeholder="e.g. Overtime" value={newCodeName} onChange={(e) => setNewCodeName(e.target.value)} required />
              <Select label="Type" options={EARNING_TYPE_OPTIONS} value={newCodeType} onChange={(e) => setNewCodeType(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveCode}>Save Code</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowNewCode(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Active</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {earningCodes.map((ec) => (
              <TableRow key={ec.id}>
                <TableCell className="font-mono text-xs font-semibold">{ec.code}</TableCell>
                <TableCell>{ec.name}</TableCell>
                <TableCell>
                  <Badge color={EARNING_TYPE_COLORS[ec.type] ?? 'gray'}>{ec.type.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <Badge color={ec.is_active ? 'green' : 'gray'}>{ec.is_active ? 'Yes' : 'No'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {earningCodes.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No earning codes configured yet.</p>
        )}
      </section>

      {/* --- Overtime Rules Section --- */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Overtime Rules</h3>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Weekly Overtime Threshold</p>
              <p className="text-xs text-muted-foreground">Hours beyond this threshold are calculated as overtime.</p>
            </div>
            <div className="rounded-lg bg-muted px-4 py-2">
              <span className="text-lg font-semibold text-foreground">40</span>
              <span className="ml-1 text-xs text-muted-foreground">hrs/week</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   MAIN: PayrollTable — auth gate + panel routing
   ============================================================ */

export default function PayrollTable({ search, subTab = 'Scheduled Hours' }: Props) {
  const { role, loading: authLoading } = useAuth();

  if (authLoading) return <TableSkeleton rows={8} cols={5} />;

  if (normalizeRoleCode(role) !== 'OWNER_ADMIN') {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
        <p className="text-sm text-muted-foreground">Payroll data is only visible to Owner/Admin users.</p>
      </div>
    );
  }

  return (
    <>
      {subTab === 'Scheduled Hours' && <ScheduledHoursPanel search={search} />}
      {subTab === 'Confirmed Hours' && <ConfirmedHoursPanel search={search} />}
      {subTab === 'Confirmed Time Sheets' && <ConfirmedTimeSheetsPanel search={search} />}
      {subTab === 'Payroll Settings' && <PayrollSettingsPanel />}
    </>
  );
}
