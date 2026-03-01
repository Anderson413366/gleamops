'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Clock, Printer, UserCircle2, Users } from 'lucide-react';
import { Button, Card, CardContent, EmptyState, ExportButton, Select, Skeleton, cn } from '@gleamops/ui';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface MasterTicket {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  position_code: string | null;
  site: {
    id: string;
    name: string;
    site_code: string;
  } | null;
  assignments: Array<{
    id: string;
    assignment_status: string | null;
    staff: { id: string; full_name: string | null } | null;
  }>;
}

interface AvailableStaff {
  id: string;
  full_name: string;
  staff_code: string;
}

type GroupBy = 'site' | 'staff';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  VERIFIED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELED: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

const GROUP_ACCENT_COLORS = [
  'border-l-blue-500',
  'border-l-violet-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
  'border-l-orange-500',
  'border-l-indigo-500',
  'border-l-teal-500',
  'border-l-pink-500',
];

const GROUP_HEADER_BG = [
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-violet-50 dark:bg-violet-950/20',
  'bg-emerald-50 dark:bg-emerald-950/20',
  'bg-amber-50 dark:bg-amber-950/20',
  'bg-rose-50 dark:bg-rose-950/20',
  'bg-cyan-50 dark:bg-cyan-950/20',
  'bg-orange-50 dark:bg-orange-950/20',
  'bg-indigo-50 dark:bg-indigo-950/20',
  'bg-teal-50 dark:bg-teal-950/20',
  'bg-pink-50 dark:bg-pink-950/20',
];

function formatTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatPositionLabel(code: string | null): string {
  if (!code) return '—';
  return code
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MasterBoard() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [tickets, setTickets] = useState<MasterTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('site');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        id, ticket_code, scheduled_date, start_time, end_time, status, position_code,
        site:site_id!work_tickets_site_id_fkey(id, name, site_code),
        assignments:ticket_assignments(id, assignment_status, staff:staff_id(id, full_name))
      `)
      .eq('scheduled_date', selectedDate)
      .is('archived_at', null)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setTickets(data as unknown as MasterTicket[]);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    async function fetchAvailable() {
      const supabase = getSupabaseBrowserClient();
      const { data: allStaff } = await supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .eq('employment_status', 'ACTIVE')
        .order('full_name', { ascending: true });

      if (allStaff) {
        setAvailableStaff(allStaff as unknown as AvailableStaff[]);
      }
    }

    void fetchAvailable();
  }, [selectedDate]);

  const assignedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of tickets) {
      for (const a of t.assignments ?? []) {
        if (a.staff?.id && (!a.assignment_status || a.assignment_status === 'ASSIGNED')) {
          ids.add(a.staff.id);
        }
      }
    }
    return ids;
  }, [tickets]);

  const unassignedStaff = useMemo(
    () => availableStaff.filter((s) => !assignedStaffIds.has(s.id)),
    [availableStaff, assignedStaffIds],
  );

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (siteFilter && t.site?.name !== siteFilter) return false;
      if (positionFilter && t.position_code !== positionFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, siteFilter, positionFilter]);

  const sites = useMemo(() => Array.from(new Set(tickets.map((t) => t.site?.name).filter(Boolean))).sort() as string[], [tickets]);
  const positions = useMemo(() => Array.from(new Set(tickets.map((t) => t.position_code).filter(Boolean))).sort() as string[], [tickets]);

  const grouped = useMemo(() => {
    const map = new Map<string, MasterTicket[]>();
    for (const ticket of filtered) {
      const key = groupBy === 'site'
        ? (ticket.site?.name ?? 'No Site')
        : ((ticket.assignments ?? []).map((a) => a.staff?.full_name ?? 'Unassigned').join(', ') || 'Unassigned');
      const group = map.get(key) ?? [];
      group.push(ticket);
      map.set(key, group);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const unassignedCount = useMemo(
    () => filtered.filter((t) => !t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'))).length,
    [filtered],
  );

  const handleQuickAssign = useCallback(async (ticketId: string, staffId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

    await supabase.from('ticket_assignments').insert({
      tenant_id: tenantId,
      ticket_id: ticketId,
      staff_id: staffId,
      assignment_status: 'ASSIGNED',
    });

    setAssigningTicketId(null);
    await fetchTickets();
  }, [fetchTickets]);

  const exportData = useMemo(() => {
    return filtered.map((t) => ({
      'Ticket Code': t.ticket_code,
      Site: t.site?.name ?? '',
      'Site Code': t.site?.site_code ?? '',
      Position: t.position_code ?? '',
      'Start Time': t.start_time ?? '',
      'End Time': t.end_time ?? '',
      Status: t.status,
      'Assigned Staff': (t.assignments ?? []).map((a) => a.staff?.full_name ?? '').filter(Boolean).join(', '),
    }));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 block h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>
        <Select
          label="Group By"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          options={[
            { value: 'site', label: 'Group by Site' },
            { value: 'staff', label: 'Group by Staff' },
          ]}
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: '', label: 'All Statuses' }, ...Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))]}
        />
        <Select
          label="Site"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          options={[{ value: '', label: 'All Sites' }, ...sites.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          label="Position"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          options={[{ value: '', label: 'All Positions' }, ...positions.map((p) => ({ value: p, label: p.replaceAll('_', ' ') }))]}
        />
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="secondary" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            <Users className="h-4 w-4" />
            Available ({unassignedStaff.length})
          </Button>
          <ExportButton data={exportData} filename={`master-board-${selectedDate}`} columns={[
            { key: 'Ticket Code', label: 'Ticket Code' },
            { key: 'Site', label: 'Site' },
            { key: 'Site Code', label: 'Site Code' },
            { key: 'Position', label: 'Position' },
            { key: 'Start Time', label: 'Start Time' },
            { key: 'End Time', label: 'End Time' },
            { key: 'Status', label: 'Status' },
            { key: 'Assigned Staff', label: 'Assigned Staff' },
          ]} />
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Tickets</p>
            <p className="text-xl font-semibold">{loading ? '—' : filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Sites</p>
            <p className="text-xl font-semibold">{loading ? '—' : sites.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Assigned</p>
            <p className="text-xl font-semibold text-emerald-600">{loading ? '—' : filtered.length - unassignedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Unassigned</p>
            <p className={cn('text-xl font-semibold', unassignedCount > 0 && 'text-destructive')}>
              {loading ? '—' : unassignedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monday.com-style Board */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12" />}
              title="No tickets for this date"
              description="Select a different date or create new shifts."
            />
          ) : (
            grouped.map(([groupName, groupTickets], groupIndex) => {
              const accentColor = GROUP_ACCENT_COLORS[groupIndex % GROUP_ACCENT_COLORS.length];
              const headerBg = GROUP_HEADER_BG[groupIndex % GROUP_HEADER_BG.length];
              const isCollapsed = collapsedGroups.has(groupName);
              const assignedInGroup = groupTickets.filter((t) =>
                t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED')),
              ).length;
              const completedInGroup = groupTickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;

              return (
                <div
                  key={groupName}
                  className={cn('rounded-lg border border-border overflow-hidden border-l-[3px]', accentColor)}
                >
                  {/* Monday.com-style Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(groupName)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:opacity-90',
                      headerBg,
                    )}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {groupBy === 'site' ? (
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <UserCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-foreground">{groupName}</span>
                    <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{groupTickets.length} items</span>
                      <span className="text-emerald-600 font-medium">{assignedInGroup} assigned</span>
                      {completedInGroup > 0 && (
                        <span className="text-emerald-600">{completedInGroup} done</span>
                      )}
                    </span>
                  </button>

                  {/* Column Header */}
                  {!isCollapsed && (
                    <>
                      <div className="grid grid-cols-[1fr_120px_140px_160px_1fr] border-b border-border bg-muted/30 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <span>Site</span>
                        <span>Time</span>
                        <span>Position</span>
                        <span>Status</span>
                        <span>Person</span>
                      </div>

                      {/* Item Rows */}
                      <div className="divide-y divide-border/50">
                        {groupTickets.map((ticket) => {
                          const activeAssignments = (ticket.assignments ?? [])
                            .filter((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'));
                          const staffNames = activeAssignments.map((a) => a.staff!.full_name ?? 'Unknown');
                          const isUnassigned = staffNames.length === 0;
                          const statusStyle = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.CANCELED;

                          return (
                            <div
                              key={ticket.id}
                              className={cn(
                                'grid grid-cols-[1fr_120px_140px_160px_1fr] items-center gap-1 px-4 py-2.5 text-sm transition-colors hover:bg-muted/20',
                                isUnassigned && 'bg-destructive/5',
                              )}
                            >
                              {/* Site */}
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{ticket.site?.site_code ?? '—'}</p>
                                <p className="text-xs text-muted-foreground truncate">{ticket.site?.name ?? 'No site'}</p>
                              </div>

                              {/* Time */}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {ticket.start_time
                                    ? `${formatTime(ticket.start_time)}${ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}`
                                    : 'No time'}
                                </span>
                              </div>

                              {/* Position */}
                              <div className="text-xs text-foreground truncate">
                                {formatPositionLabel(ticket.position_code)}
                              </div>

                              {/* Status — Monday.com-style colored pill */}
                              <div>
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                    statusStyle.bg,
                                    statusStyle.text,
                                  )}
                                >
                                  <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                                  {ticket.status}
                                </span>
                              </div>

                              {/* Person — Monday.com-style avatars */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isUnassigned ? (
                                  assigningTicketId === ticket.id ? (
                                    <Select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) void handleQuickAssign(ticket.id, e.target.value);
                                      }}
                                      options={[
                                        { value: '', label: 'Select staff...' },
                                        ...unassignedStaff.map((s) => ({ value: s.id, label: s.full_name })),
                                      ]}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAssigningTicketId(ticket.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-destructive/40 px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/5 transition-colors"
                                    >
                                      <span className="h-5 w-5 rounded-full border border-dashed border-destructive/40 flex items-center justify-center text-[10px]">+</span>
                                      Assign
                                    </button>
                                  )
                                ) : (
                                  <div className="flex items-center">
                                    {/* Stacked avatar circles */}
                                    <div className="flex -space-x-1.5">
                                      {staffNames.slice(0, 3).map((name) => (
                                        <div
                                          key={name}
                                          className="h-7 w-7 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary"
                                          title={name}
                                        >
                                          {getInitials(name)}
                                        </div>
                                      ))}
                                      {staffNames.length > 3 && (
                                        <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                          +{staffNames.length - 3}
                                        </div>
                                      )}
                                    </div>
                                    <span className="ml-2 text-xs text-foreground truncate">
                                      {staffNames.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary Row */}
                      <div className="grid grid-cols-[1fr_120px_140px_160px_1fr] items-center gap-1 px-4 py-2 bg-muted/20 text-[11px] font-medium text-muted-foreground border-t border-border">
                        <span>{groupTickets.length} ticket{groupTickets.length !== 1 ? 's' : ''}</span>
                        <span />
                        <span />
                        <span>
                          {completedInGroup}/{groupTickets.length} done
                        </span>
                        <span>
                          {assignedInGroup}/{groupTickets.length} staffed
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Available Staff Sidebar */}
        {showSidebar && (
          <div className="w-64 shrink-0">
            <Card>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Available Staff</h3>
                <p className="text-xs text-muted-foreground">{unassignedStaff.length} not assigned today</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
                {unassignedStaff.map((staff) => (
                  <div key={staff.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {getInitials(staff.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{staff.full_name}</p>
                      <p className="text-xs text-muted-foreground">{staff.staff_code}</p>
                    </div>
                  </div>
                ))}
                {unassignedStaff.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">All staff assigned</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
