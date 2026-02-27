'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Clock, MapPinned, Phone, RefreshCw, UserCircle2, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState, Select, Skeleton, cn } from '@gleamops/ui';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SupervisorTicket {
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
    staff: { id: string; full_name: string | null; phone?: string | null } | null;
  }>;
}

interface StaffAssignment {
  staffId: string;
  staffName: string;
  phone: string | null;
  siteName: string;
  siteCode: string;
  shiftTime: string;
  checkedIn: boolean;
  ticketId: string;
  status: string;
}

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

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'blue' | 'red' | 'gray'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELED: 'gray',
};

interface SiteCard {
  siteId: string;
  siteName: string;
  siteCode: string;
  tickets: SupervisorTicket[];
  assignedStaff: string[];
  shiftRange: string;
  allCheckedIn: boolean;
  hasIssues: boolean;
  status: string;
}

export function SupervisorDashboard() {
  const [tickets, setTickets] = useState<SupervisorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reassigningTicketId, setReassigningTicketId] = useState<string | null>(null);
  const [availableStaff, setAvailableStaff] = useState<Array<{ id: string; full_name: string }>>([]);

  const today = useMemo(() => toDateInput(new Date()), []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data } = await supabase
      .from('work_tickets')
      .select(`
        id, ticket_code, scheduled_date, start_time, end_time, status, position_code,
        site:site_id(id, name, site_code),
        assignments:ticket_assignments(id, assignment_status, staff:staff_id(id, full_name, phone))
      `)
      .eq('scheduled_date', today)
      .is('archived_at', null)
      .order('start_time', { ascending: true });

    if (data) {
      setTickets(data as unknown as SupervisorTicket[]);
    }

    // Fetch available staff
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name')
      .is('archived_at', null)
      .eq('employment_status', 'ACTIVE')
      .order('full_name', { ascending: true });

    if (staffData) {
      setAvailableStaff(staffData as unknown as Array<{ id: string; full_name: string }>);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets, refreshKey]);

  // KPI calculations
  const kpis = useMemo(() => {
    const siteIds = new Set(tickets.map((t) => t.site?.id).filter(Boolean));
    const staffedTickets = tickets.filter((t) =>
      t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED')),
    );
    const unstaffedTickets = tickets.filter((t) =>
      !t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED')),
    );
    const completedTickets = tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED');
    const issueTickets = unstaffedTickets;

    return {
      totalSites: siteIds.size,
      staffed: staffedTickets.length,
      unstaffed: unstaffedTickets.length,
      completed: completedTickets.length,
      issues: issueTickets.length,
    };
  }, [tickets]);

  // Group tickets into site cards
  const siteCards = useMemo(() => {
    const map = new Map<string, SiteCard>();

    for (const ticket of tickets) {
      const siteId = ticket.site?.id ?? 'no-site';
      const siteName = ticket.site?.name ?? 'No Site';
      const siteCode = ticket.site?.site_code ?? '';

      const existing = map.get(siteId);
      const staffNames = (ticket.assignments ?? [])
        .filter((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'))
        .map((a) => a.staff!.full_name ?? 'Unknown');

      if (existing) {
        existing.tickets.push(ticket);
        for (const name of staffNames) {
          if (!existing.assignedStaff.includes(name)) {
            existing.assignedStaff.push(name);
          }
        }
      } else {
        map.set(siteId, {
          siteId,
          siteName,
          siteCode,
          tickets: [ticket],
          assignedStaff: [...staffNames],
          shiftRange: '',
          allCheckedIn: false,
          hasIssues: staffNames.length === 0,
          status: ticket.status,
        });
      }
    }

    // Compute shift ranges and status
    for (const card of map.values()) {
      const times = card.tickets
        .flatMap((t) => [t.start_time, t.end_time])
        .filter(Boolean) as string[];
      if (times.length >= 2) {
        times.sort();
        card.shiftRange = `${formatTime(times[0])} - ${formatTime(times[times.length - 1])}`;
      }

      const hasInProgress = card.tickets.some((t) => t.status === 'IN_PROGRESS');
      const allCompleted = card.tickets.every((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED');

      card.status = allCompleted ? 'COMPLETED' : hasInProgress ? 'IN_PROGRESS' : 'SCHEDULED';
      card.hasIssues = card.assignedStaff.length === 0 || card.tickets.some((t) =>
        !t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED')),
      );
    }

    return Array.from(map.values()).sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [tickets]);

  // Staff assignment table
  const staffAssignments = useMemo(() => {
    const assignments: StaffAssignment[] = [];
    for (const ticket of tickets) {
      for (const assignment of ticket.assignments ?? []) {
        if (!assignment.staff || (assignment.assignment_status && assignment.assignment_status !== 'ASSIGNED')) continue;
        assignments.push({
          staffId: assignment.staff.id,
          staffName: assignment.staff.full_name ?? 'Unknown',
          phone: assignment.staff.phone ?? null,
          siteName: ticket.site?.name ?? 'No Site',
          siteCode: ticket.site?.site_code ?? '',
          shiftTime: ticket.start_time ? `${formatTime(ticket.start_time)}${ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}` : 'No time',
          checkedIn: ticket.status === 'IN_PROGRESS' || ticket.status === 'COMPLETED' || ticket.status === 'VERIFIED',
          ticketId: ticket.id,
          status: ticket.status,
        });
      }
    }
    return assignments.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [tickets]);

  const handleReassign = useCallback(async (ticketId: string, newStaffId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

    // Remove existing assignments
    await supabase
      .from('ticket_assignments')
      .update({ assignment_status: 'REMOVED' })
      .eq('ticket_id', ticketId);

    // Add new assignment
    await supabase.from('ticket_assignments').insert({
      tenant_id: tenantId,
      ticket_id: ticketId,
      staff_id: newStaffId,
      assignment_status: 'ASSIGNED',
    });

    setReassigningTicketId(null);
    setRefreshKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<MapPinned className="h-12 w-12" />}
        title="No shifts for today"
        description="There are no scheduled shifts for today. Check back later."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Supervisor Dashboard — {today}</h3>
        <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Sites</p>
            <p className="text-2xl font-bold">{kpis.totalSites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Staffed</p>
            <p className="text-2xl font-bold text-green-600">{kpis.staffed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Unstaffed</p>
            <p className={cn('text-2xl font-bold', kpis.unstaffed > 0 ? 'text-destructive' : '')}>{kpis.unstaffed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{kpis.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Issues</p>
            <p className={cn('text-2xl font-bold', kpis.issues > 0 ? 'text-amber-600' : '')}>{kpis.issues}</p>
          </CardContent>
        </Card>
      </div>

      {/* Site Status Grid */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Site Status
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {siteCards.map((card) => (
            <Card key={card.siteId} className={cn(card.hasIssues && 'border-amber-300 dark:border-amber-800')}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{card.siteName}</p>
                    <p className="text-xs text-muted-foreground">{card.siteCode}</p>
                  </div>
                  <Badge color={STATUS_BADGE[card.status] ?? 'gray'}>{card.status}</Badge>
                </div>

                {card.shiftRange && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Clock className="h-3 w-3" />
                    {card.shiftRange}
                  </p>
                )}

                <div className="space-y-1 mb-2">
                  {card.assignedStaff.length > 0 ? (
                    card.assignedStaff.map((name) => (
                      <div key={name} className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                          {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs text-foreground">{name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No staff assigned
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">{card.tickets.length} ticket(s)</p>
                  {card.hasIssues && (
                    <span className="text-[10px] text-amber-600 font-medium">Needs attention</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Staff Assignment Table */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Staff Assignments
        </h4>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Staff</th>
                  <th className="px-4 py-3 text-left font-medium">Site</th>
                  <th className="px-4 py-3 text-left font-medium">Shift</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffAssignments.map((assignment) => (
                  <tr key={`${assignment.ticketId}-${assignment.staffId}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{assignment.staffName}</p>
                          {assignment.phone && (
                            <p className="text-xs text-muted-foreground">{assignment.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{assignment.siteName}</p>
                      <p className="text-xs text-muted-foreground">{assignment.siteCode}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{assignment.shiftTime}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_BADGE[assignment.status] ?? 'gray'}>{assignment.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {reassigningTicketId === assignment.ticketId ? (
                          <Select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) void handleReassign(assignment.ticketId, e.target.value);
                            }}
                            options={[
                              { value: '', label: 'Select new staff...' },
                              ...availableStaff
                                .filter((s) => s.id !== assignment.staffId)
                                .map((s) => ({ value: s.id, label: s.full_name })),
                            ]}
                          />
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setReassigningTicketId(assignment.ticketId)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reassign
                            </Button>
                            {assignment.phone && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(`tel:${assignment.phone}`, '_self')}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {staffAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No staff assignments for today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
