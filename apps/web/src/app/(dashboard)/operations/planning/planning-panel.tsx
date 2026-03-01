'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, Input } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import { PlannerFilters } from './planner-filters';
import { PlannerGrid, type PlannerTicketRow } from './planner-grid';
import { ConflictsPanel } from './conflicts-panel';
import { PublishDrawer } from './publish-drawer';

type SchedulePeriodRow = {
  id: string;
  site_id: string | null;
  period_name: string | null;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'ARCHIVED';
};

type ScheduleConflictRow = {
  id: string;
  conflict_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  is_blocking: boolean;
  ticket_id: string | null;
  staff_id: string | null;
  created_at: string;
};

type SiteOption = {
  id: string;
  name: string;
  site_code: string | null;
};

type StaffOption = {
  id: string;
  staff_code: string;
  full_name: string | null;
};

type AvailabilityRuleRow = {
  id: string;
  rule_type: 'WEEKLY_RECURRING' | 'ONE_OFF';
  availability_type: 'AVAILABLE' | 'UNAVAILABLE' | 'PREFERRED';
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  one_off_start: string | null;
  one_off_end: string | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
};

type ShiftTradeRow = {
  id: string;
  ticket_id: string;
  request_type: 'SWAP' | 'RELEASE';
  status: 'PENDING' | 'ACCEPTED' | 'MANAGER_APPROVED' | 'APPLIED' | 'DENIED' | 'CANCELED';
  target_staff_id: string | null;
  initiator_note: string | null;
  manager_note: string | null;
  requested_at: string;
  ticket?: {
    ticket_code?: string | null;
    scheduled_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    site?: { name?: string | null; site_code?: string | null } | null;
  } | null;
  initiator?: { full_name?: string | null; staff_code?: string | null } | null;
  target?: { full_name?: string | null; staff_code?: string | null } | null;
};

type ApiDataResponse<T> = {
  success: boolean;
  data: T;
};

type ValidatePeriodResponse = {
  success: boolean;
  summary: Array<{ conflict_type: string; conflict_count: number }>;
  conflicts: ScheduleConflictRow[];
};

interface PlanningPanelProps {
  search: string;
}

function formatWeekday(weekday: number | null): string {
  if (weekday == null) return 'N/A';
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday] ?? 'N/A';
}

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return 'All day';
  return `${start ?? '00:00'}-${end ?? '23:59'}`;
}

export default function PlanningPanel({ search }: PlanningPanelProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [periods, setPeriods] = useState<SchedulePeriodRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [tickets, setTickets] = useState<PlannerTicketRow[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflictRow[]>([]);
  const [trades, setTrades] = useState<ShiftTradeRow[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleRow[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [newPeriodEnd, setNewPeriodEnd] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);
    return nextWeek.toISOString().slice(0, 10);
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    rule_type: 'WEEKLY_RECURRING',
    availability_type: 'AVAILABLE',
    weekday: '1',
    start_time: '09:00',
    end_time: '17:00',
    one_off_start: '',
    one_off_end: '',
    valid_from: '',
    valid_to: '',
    notes: '',
  });

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId]
  );

  const blockingConflicts = useMemo(
    () => conflicts.filter((conflict) => conflict.is_blocking).length,
    [conflicts]
  );

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (siteFilter !== 'all') {
        if (!ticket.site?.id || ticket.site.id !== siteFilter) return false;
      }
      if (!query) return true;

      return (
        ticket.ticket_code.toLowerCase().includes(query)
        || (ticket.site?.name ?? '').toLowerCase().includes(query)
        || (ticket.position_code ?? '').toLowerCase().includes(query)
        || ticket.status.toLowerCase().includes(query)
      );
    });
  }, [tickets, search, statusFilter, siteFilter]);

  const apiRequest = useCallback(async <TResponse,>(url: string, init?: RequestInit) => (
    fetchJsonWithSupabaseAuth<TResponse>(supabase, url, init)
  ), [supabase]);

  const loadPeriods = useCallback(async () => {
    try {
      const response = await apiRequest<ApiDataResponse<SchedulePeriodRow[]>>('/api/operations/schedule/periods');
      const rows = response.data ?? [];
      setPeriods(rows);
      if (!selectedPeriodId && rows.length > 0) {
        setSelectedPeriodId(rows[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load schedule periods.');
      return;
    }
  }, [apiRequest, selectedPeriodId]);

  const loadSites = useCallback(async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, site_code')
      .is('archived_at', null)
      .order('name', { ascending: true })
      .limit(300);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSites((data ?? []) as SiteOption[]);
  }, [supabase]);

  const loadStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, staff_code, full_name')
      .is('archived_at', null)
      .order('full_name', { ascending: true })
      .limit(1000);

    if (error) {
      toast.error(error.message);
      return;
    }

    const rows = (data ?? []) as StaffOption[];
    setStaff(rows);
    if (!selectedStaffId && rows.length > 0) {
      setSelectedStaffId(rows[0].id);
    }
  }, [selectedStaffId, supabase]);

  const loadAvailabilityRules = useCallback(async (staffId: string) => {
    if (!staffId) {
      setAvailabilityRules([]);
      return;
    }

    try {
      const response = await apiRequest<ApiDataResponse<AvailabilityRuleRow[]>>(
        `/api/operations/schedule/availability?staffId=${encodeURIComponent(staffId)}`
      );
      setAvailabilityRules(response.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load availability rules.');
      return;
    }
  }, [apiRequest]);

  const loadPeriodData = useCallback(async (period: SchedulePeriodRow | null) => {
    if (!period) {
      setTickets([]);
      setConflicts([]);
      setTrades([]);
      return;
    }

    const [ticketRes, conflictRes, tradesRes] = await Promise.all([
      supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, scheduled_date, start_time, end_time, status,
          required_staff_count, position_code, schedule_period_id,
          site:site_id!work_tickets_site_id_fkey(id, name, site_code),
          assignments:ticket_assignments(id, assignment_status, staff_id, staff:staff_id(full_name))
        `)
        .is('archived_at', null)
        .gte('scheduled_date', period.period_start)
        .lte('scheduled_date', period.period_end)
        .order('scheduled_date', { ascending: true }),
      apiRequest<ApiDataResponse<ScheduleConflictRow[]>>(
        `/api/operations/schedule/conflicts?periodId=${encodeURIComponent(period.id)}`
      ),
      apiRequest<ApiDataResponse<ShiftTradeRow[]>>(
        `/api/operations/schedule/trades?periodId=${encodeURIComponent(period.id)}`
      ),
    ]);

    if (ticketRes.error) toast.error(ticketRes.error.message);

    const scopedTickets = ((ticketRes.data ?? []) as PlannerTicketRow[]).filter((ticket) => {
      if (!period.site_id) return true;
      return ticket.site?.id === period.site_id;
    });

    setTickets(scopedTickets);
    setConflicts(conflictRes.data ?? []);
    setTrades(tradesRes.data ?? []);
  }, [apiRequest, supabase]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPeriods(), loadSites(), loadStaff()]);
    setLoading(false);
  }, [loadPeriods, loadSites, loadStaff]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!selectedPeriod) {
      setTickets([]);
      setConflicts([]);
      setTrades([]);
      return;
    }
    void loadPeriodData(selectedPeriod);
  }, [selectedPeriod, loadPeriodData]);

  useEffect(() => {
    void loadAvailabilityRules(selectedStaffId);
  }, [loadAvailabilityRules, selectedStaffId]);

  const handleCreatePeriod = useCallback(async () => {
    setBusy(true);
    const payload = {
      period_name: newPeriodName || null,
      period_start: newPeriodStart,
      period_end: newPeriodEnd,
      site_id: siteFilter === 'all' ? null : siteFilter,
      status: 'DRAFT',
    };
    try {
      await apiRequest<ApiDataResponse<SchedulePeriodRow>>('/api/operations/schedule/periods', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setNewPeriodName('');
      toast.success('Schedule period created.');
      await loadPeriods();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule period.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadPeriods, newPeriodEnd, newPeriodName, newPeriodStart, siteFilter]);

  const handleValidate = useCallback(async () => {
    if (!selectedPeriod) return;
    setBusy(true);
    try {
      const result = await apiRequest<ValidatePeriodResponse>(
        `/api/operations/schedule/periods/${selectedPeriod.id}/validate`,
        { method: 'POST' }
      );
      setConflicts(result.conflicts ?? []);
      toast.success('Schedule period validated.');
      await loadPeriodData(selectedPeriod);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to validate schedule period.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadPeriodData, selectedPeriod]);

  const handlePublish = useCallback(async () => {
    if (!selectedPeriod) return;
    setBusy(true);
    try {
      await apiRequest<ApiDataResponse<SchedulePeriodRow>>(
        `/api/operations/schedule/periods/${selectedPeriod.id}/publish`,
        { method: 'POST' }
      );
      toast.success('Schedule period published.');
      await loadPeriods();
      await loadPeriodData(selectedPeriod);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish schedule period.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadPeriodData, loadPeriods, selectedPeriod]);

  const handleLock = useCallback(async () => {
    if (!selectedPeriod) return;
    setBusy(true);
    try {
      await apiRequest<ApiDataResponse<SchedulePeriodRow>>(
        `/api/operations/schedule/periods/${selectedPeriod.id}/lock`,
        { method: 'POST' }
      );
      toast.success('Schedule period locked.');
      await loadPeriods();
      await loadPeriodData(selectedPeriod);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to lock schedule period.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadPeriodData, loadPeriods, selectedPeriod]);

  const handleCreateAvailabilityRule = useCallback(async () => {
    if (!selectedStaffId) {
      toast.error('Select a staff member first.');
      return;
    }

    setBusy(true);
    const payload = {
      staff_id: selectedStaffId,
      rule_type: availabilityForm.rule_type,
      availability_type: availabilityForm.availability_type,
      weekday: availabilityForm.rule_type === 'WEEKLY_RECURRING' ? Number(availabilityForm.weekday) : null,
      start_time: availabilityForm.rule_type === 'WEEKLY_RECURRING' ? (availabilityForm.start_time || null) : null,
      end_time: availabilityForm.rule_type === 'WEEKLY_RECURRING' ? (availabilityForm.end_time || null) : null,
      one_off_start: availabilityForm.rule_type === 'ONE_OFF' && availabilityForm.one_off_start
        ? new Date(availabilityForm.one_off_start).toISOString()
        : null,
      one_off_end: availabilityForm.rule_type === 'ONE_OFF' && availabilityForm.one_off_end
        ? new Date(availabilityForm.one_off_end).toISOString()
        : null,
      valid_from: availabilityForm.valid_from || null,
      valid_to: availabilityForm.valid_to || null,
      notes: availabilityForm.notes || null,
    };
    try {
      await apiRequest<ApiDataResponse<AvailabilityRuleRow>>('/api/operations/schedule/availability', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Availability rule created.');
      setAvailabilityForm((prev) => ({
        ...prev,
        notes: '',
        one_off_start: '',
        one_off_end: '',
        valid_from: '',
        valid_to: '',
      }));
      await loadAvailabilityRules(selectedStaffId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create availability rule.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, availabilityForm, loadAvailabilityRules, selectedStaffId]);

  const handleArchiveAvailabilityRule = useCallback(async (ruleId: string) => {
    setBusy(true);
    try {
      await apiRequest<ApiDataResponse<AvailabilityRuleRow>>(
        `/api/operations/schedule/availability/${ruleId}/archive`,
        { method: 'POST' }
      );
      toast.success('Availability rule archived.');
      await loadAvailabilityRules(selectedStaffId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive availability rule.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadAvailabilityRules, selectedStaffId]);

  const runTradeAction = useCallback(async (
    action: 'accept' | 'approve' | 'deny' | 'cancel' | 'apply',
    tradeId: string,
  ) => {
    if (!selectedPeriod) return;
    setBusy(true);
    const endpoint = `/api/operations/schedule/trades/${tradeId}/${action}`;
    const init: RequestInit = { method: 'POST' };
    if (action === 'deny') {
      init.body = JSON.stringify({ manager_note: 'Denied from planning panel' });
    }

    try {
      await apiRequest<ApiDataResponse<ShiftTradeRow>>(endpoint, init);
      toast.success('Trade workflow updated.');
      await loadPeriodData(selectedPeriod);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update trade workflow.');
      return;
    } finally {
      setBusy(false);
    }
  }, [apiRequest, loadPeriodData, selectedPeriod]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">Create Schedule Period</h3>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input
            value={newPeriodName}
            onChange={(event) => setNewPeriodName(event.target.value)}
            placeholder="Period name (optional)"
          />
          <Input type="date" value={newPeriodStart} onChange={(event) => setNewPeriodStart(event.target.value)} />
          <Input type="date" value={newPeriodEnd} onChange={(event) => setNewPeriodEnd(event.target.value)} />
          <Button disabled={busy} onClick={() => void handleCreatePeriod()}>
            Create Draft Period
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Periods</h3>
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)} disabled={!selectedPeriod}>Manage</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && periods.length === 0 ? <p className="text-sm text-muted-foreground">No periods yet.</p> : null}
            {periods.map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => setSelectedPeriodId(period.id)}
                className={`w-full rounded-lg border p-2 text-left text-sm transition ${selectedPeriodId === period.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'}`}
              >
                <p className="font-medium text-foreground">{period.period_name ?? `${period.period_start} to ${period.period_end}`}</p>
                <p className="text-xs text-muted-foreground">{period.status}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <PlannerFilters
            statusFilter={statusFilter}
            siteFilter={siteFilter}
            sites={sites}
            onStatusFilterChange={setStatusFilter}
            onSiteFilterChange={setSiteFilter}
          />

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">Ticket Coverage</h3>
            </CardHeader>
            <CardContent>
              <PlannerGrid
                tickets={filteredTickets}
                emptyState={<p className="text-sm text-muted-foreground">No tickets found for selected filters.</p>}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">Conflicts</h3>
            </CardHeader>
            <CardContent>
              <ConflictsPanel conflicts={conflicts} />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-foreground">Shift Trades</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {trades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trade requests for this period.</p>
                ) : (
                  trades.map((trade) => (
                    <div key={trade.id} className="rounded-lg border border-border p-2 text-xs">
                      <p className="font-semibold text-foreground">
                        {trade.ticket?.ticket_code ?? 'Ticket'} · {trade.request_type} · {trade.status}
                      </p>
                      <p className="text-muted-foreground">
                        From {trade.initiator?.full_name ?? trade.initiator?.staff_code ?? 'Unknown'}
                        {trade.target ? ` to ${trade.target.full_name ?? trade.target.staff_code ?? 'Target'}` : ''}
                      </p>
                      {trade.initiator_note ? (
                        <p className="mt-1 text-muted-foreground">Note: {trade.initiator_note}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {trade.status === 'PENDING' && trade.request_type === 'SWAP' && trade.target_staff_id ? (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runTradeAction('accept', trade.id)}>
                            Accept
                          </Button>
                        ) : null}
                        {trade.status === 'PENDING' || trade.status === 'ACCEPTED' ? (
                          <>
                            <Button size="sm" disabled={busy} onClick={() => void runTradeAction('approve', trade.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runTradeAction('deny', trade.id)}>
                              Deny
                            </Button>
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runTradeAction('cancel', trade.id)}>
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {trade.status === 'MANAGER_APPROVED' ? (
                          <Button size="sm" disabled={busy} onClick={() => void runTradeAction('apply', trade.id)}>
                            Apply
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-foreground">Availability Rules</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Staff Member
                  <select
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  >
                    <option value="">Select staff</option>
                    {staff.map((row) => (
                      <option key={row.id} value={row.id}>
                        {(row.full_name ?? row.staff_code)} ({row.staff_code})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Rule Type
                    <select
                      value={availabilityForm.rule_type}
                      onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, rule_type: event.target.value }))}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                    >
                      <option value="WEEKLY_RECURRING">Weekly Recurring</option>
                      <option value="ONE_OFF">One-Off</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Availability
                    <select
                      value={availabilityForm.availability_type}
                      onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, availability_type: event.target.value }))}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                      <option value="PREFERRED">Preferred</option>
                    </select>
                  </label>
                </div>

                {availabilityForm.rule_type === 'WEEKLY_RECURRING' ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      Weekday
                      <select
                        value={availabilityForm.weekday}
                        onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, weekday: event.target.value }))}
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                      >
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      Start
                      <Input type="time" value={availabilityForm.start_time} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, start_time: event.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      End
                      <Input type="time" value={availabilityForm.end_time} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, end_time: event.target.value }))} />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      One-off Start
                      <Input type="datetime-local" value={availabilityForm.one_off_start} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, one_off_start: event.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      One-off End
                      <Input type="datetime-local" value={availabilityForm.one_off_end} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, one_off_end: event.target.value }))} />
                    </label>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Valid From
                    <Input type="date" value={availabilityForm.valid_from} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, valid_from: event.target.value }))} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Valid To
                    <Input type="date" value={availabilityForm.valid_to} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, valid_to: event.target.value }))} />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Notes
                  <Input value={availabilityForm.notes} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional notes" />
                </label>

                <Button disabled={busy || !selectedStaffId} onClick={() => void handleCreateAvailabilityRule()}>
                  Add Availability Rule
                </Button>

                <div className="space-y-2">
                  {availabilityRules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No rules for selected staff.</p>
                  ) : (
                    availabilityRules.map((rule) => (
                      <div key={rule.id} className="rounded-lg border border-border p-2 text-xs">
                        <p className="font-semibold text-foreground">{rule.availability_type} · {rule.rule_type}</p>
                        {rule.rule_type === 'WEEKLY_RECURRING' ? (
                          <p className="text-muted-foreground">{formatWeekday(rule.weekday)} · {formatTimeWindow(rule.start_time, rule.end_time)}</p>
                        ) : (
                          <p className="text-muted-foreground">
                            {rule.one_off_start ? new Date(rule.one_off_start).toLocaleString() : 'N/A'}
                            {' -> '}
                            {rule.one_off_end ? new Date(rule.one_off_end).toLocaleString() : 'N/A'}
                          </p>
                        )}
                        {rule.valid_from || rule.valid_to ? (
                          <p className="text-muted-foreground">Valid: {rule.valid_from ?? 'Any'} to {rule.valid_to ?? 'Any'}</p>
                        ) : null}
                        {rule.notes ? <p className="text-muted-foreground">{rule.notes}</p> : null}
                        <div className="mt-1">
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleArchiveAvailabilityRule(rule.id)}>
                            Archive
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PublishDrawer
        open={drawerOpen}
        period={selectedPeriod}
        blockingConflicts={blockingConflicts}
        onClose={() => setDrawerOpen(false)}
        onValidate={handleValidate}
        onPublish={handlePublish}
        onLock={handleLock}
        busy={busy}
      />
    </div>
  );
}
