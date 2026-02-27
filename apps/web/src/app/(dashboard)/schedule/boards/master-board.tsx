'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Clock, Printer, UserCircle2, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState, ExportButton, Select, Skeleton, cn } from '@gleamops/ui';

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

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'blue' | 'red' | 'gray'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELED: 'gray',
};

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

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        id, ticket_code, scheduled_date, start_time, end_time, status, position_code,
        site:site_id(id, name, site_code),
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

  // Fetch available staff (those not assigned on this date)
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
          options={[{ value: '', label: 'All Statuses' }, ...Object.keys(STATUS_BADGE).map((s) => ({ value: s, label: s }))]}
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
            <p className="text-xl font-semibold">{loading ? '—' : filtered.length - unassignedCount}</p>
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

      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
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
            grouped.map(([groupName, groupTickets]) => (
              <Card key={groupName}>
                <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {groupBy === 'site' ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <UserCircle2 className="h-4 w-4 text-muted-foreground" />}
                    <h3 className="text-sm font-semibold text-foreground">{groupName}</h3>
                    <Badge color="gray">{groupTickets.length}</Badge>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {groupTickets.map((ticket) => {
                    const staffNames = (ticket.assignments ?? [])
                      .filter((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'))
                      .map((a) => a.staff!.full_name ?? 'Unknown');
                    const isUnassigned = staffNames.length === 0;

                    return (
                      <div key={ticket.id} className={cn('flex items-center gap-4 px-4 py-3 text-sm', isUnassigned && 'bg-destructive/5')}>
                        <div className="min-w-[100px]">
                          <p className="font-medium text-foreground">{ticket.site?.site_code ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.site?.name ?? 'No site'}</p>
                        </div>
                        <div className="min-w-[80px] flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {ticket.start_time ? `${formatTime(ticket.start_time)}${ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}` : 'No time'}
                        </div>
                        <div className="min-w-[100px]">
                          <Badge color={STATUS_BADGE[ticket.status] ?? 'gray'}>{ticket.status}</Badge>
                        </div>
                        <div className="min-w-[120px] text-xs">
                          {ticket.position_code
                            ? ticket.position_code.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
                            : '—'}
                        </div>
                        <div className="flex-1 flex items-center gap-1">
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
                                className="text-xs font-medium text-destructive hover:text-destructive/80"
                              >
                                + Assign Staff
                              </button>
                            )
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-foreground">
                              <UserCircle2 className="h-3 w-3 text-muted-foreground" />
                              {staffNames.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </div>

        {showSidebar && (
          <div className="w-64 shrink-0">
            <Card>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Available Staff</h3>
                <p className="text-xs text-muted-foreground">{unassignedStaff.length} not assigned today</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
                {unassignedStaff.map((staff) => (
                  <div key={staff.id} className="px-4 py-2 text-sm">
                    <p className="font-medium text-foreground">{staff.full_name}</p>
                    <p className="text-xs text-muted-foreground">{staff.staff_code}</p>
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
