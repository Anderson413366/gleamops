'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronRight,
  Clock, MapPinned, Phone, RefreshCw,
} from 'lucide-react';
import { Button, Card, CardContent, EmptyState, Select, Skeleton, cn } from '@gleamops/ui';

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

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  VERIFIED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELED: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

const SITE_ACCENT_COLORS = [
  'border-l-blue-500', 'border-l-violet-500', 'border-l-emerald-500',
  'border-l-amber-500', 'border-l-rose-500', 'border-l-cyan-500',
  'border-l-orange-500', 'border-l-indigo-500', 'border-l-teal-500',
  'border-l-pink-500',
];

const SITE_HEADER_BG = [
  'bg-blue-50 dark:bg-blue-950/20', 'bg-violet-50 dark:bg-violet-950/20',
  'bg-emerald-50 dark:bg-emerald-950/20', 'bg-amber-50 dark:bg-amber-950/20',
  'bg-rose-50 dark:bg-rose-950/20', 'bg-cyan-50 dark:bg-cyan-950/20',
  'bg-orange-50 dark:bg-orange-950/20', 'bg-indigo-50 dark:bg-indigo-950/20',
  'bg-teal-50 dark:bg-teal-950/20', 'bg-pink-50 dark:bg-pink-950/20',
];

const AVATAR_BG_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];

interface SiteGroup {
  siteId: string;
  siteName: string;
  siteCode: string;
  tickets: SupervisorTicket[];
  staffList: Array<{ id: string; name: string; phone: string | null; ticketId: string; status: string; shiftTime: string }>;
  completedCount: number;
  totalCount: number;
  hasIssues: boolean;
}

export function SupervisorDashboard() {
  const [tickets, setTickets] = useState<SupervisorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reassigningTicketId, setReassigningTicketId] = useState<string | null>(null);
  const [availableStaff, setAvailableStaff] = useState<Array<{ id: string; full_name: string }>>([]);
  const [collapsedSites, setCollapsedSites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'sites' | 'staff'>('sites');

  const today = useMemo(() => toDateInput(new Date()), []);

  const toggleSiteCollapse = useCallback((siteId: string) => {
    setCollapsedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  }, []);

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

  // KPIs
  const kpis = useMemo(() => {
    const siteIds = new Set(tickets.map((t) => t.site?.id).filter(Boolean));
    const staffedCount = tickets.filter((t) =>
      t.assignments?.some((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED')),
    ).length;
    const completedCount = tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
    const unstaffedCount = tickets.length - staffedCount;

    return { totalSites: siteIds.size, totalTickets: tickets.length, staffed: staffedCount, unstaffed: unstaffedCount, completed: completedCount };
  }, [tickets]);

  // Group by site
  const siteGroups = useMemo(() => {
    const map = new Map<string, SiteGroup>();

    for (const ticket of tickets) {
      const siteId = ticket.site?.id ?? 'no-site';
      const siteName = ticket.site?.name ?? 'No Site';
      const siteCode = ticket.site?.site_code ?? '';
      const existing = map.get(siteId);
      const activeAssignments = (ticket.assignments ?? [])
        .filter((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'));
      const shiftTime = ticket.start_time
        ? `${formatTime(ticket.start_time)}${ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}`
        : 'No time';

      const staffEntries = activeAssignments.map((a) => ({
        id: a.staff!.id,
        name: a.staff!.full_name ?? 'Unknown',
        phone: a.staff!.phone ?? null,
        ticketId: ticket.id,
        status: ticket.status,
        shiftTime,
      }));

      const isCompleted = ticket.status === 'COMPLETED' || ticket.status === 'VERIFIED';

      if (existing) {
        existing.tickets.push(ticket);
        existing.staffList.push(...staffEntries);
        if (isCompleted) existing.completedCount++;
        existing.totalCount++;
        if (staffEntries.length === 0) existing.hasIssues = true;
      } else {
        map.set(siteId, {
          siteId,
          siteName,
          siteCode,
          tickets: [ticket],
          staffList: [...staffEntries],
          completedCount: isCompleted ? 1 : 0,
          totalCount: 1,
          hasIssues: staffEntries.length === 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [tickets]);

  // Flat staff list for staff view
  const allStaff = useMemo(() => {
    const staffMap = new Map<string, { id: string; name: string; phone: string | null; sites: Array<{ siteName: string; siteCode: string; shiftTime: string; status: string; ticketId: string }> }>();

    for (const ticket of tickets) {
      const activeAssignments = (ticket.assignments ?? [])
        .filter((a) => a.staff && (!a.assignment_status || a.assignment_status === 'ASSIGNED'));

      for (const a of activeAssignments) {
        const staffId = a.staff!.id;
        const existing = staffMap.get(staffId);
        const entry = {
          siteName: ticket.site?.name ?? 'No Site',
          siteCode: ticket.site?.site_code ?? '',
          shiftTime: ticket.start_time ? `${formatTime(ticket.start_time)}${ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}` : 'No time',
          status: ticket.status,
          ticketId: ticket.id,
        };

        if (existing) {
          existing.sites.push(entry);
        } else {
          staffMap.set(staffId, {
            id: staffId,
            name: a.staff!.full_name ?? 'Unknown',
            phone: a.staff!.phone ?? null,
            sites: [entry],
          });
        }
      }
    }

    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const handleReassign = useCallback(async (ticketId: string, newStaffId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

    await supabase
      .from('ticket_assignments')
      .update({ assignment_status: 'REMOVED' })
      .eq('ticket_id', ticketId);

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Supervisor Dashboard</h3>
          <p className="text-xs text-muted-foreground">{today} — Tonight&apos;s overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'sites' | 'staff')}
            options={[
              { value: 'sites', label: 'View by Sites' },
              { value: 'staff', label: 'View by Staff' },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards — Monday.com number tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Sites Tonight', value: kpis.totalSites, color: 'text-foreground', icon: Building2 },
          { label: 'Total Shifts', value: kpis.totalTickets, color: 'text-foreground', icon: Clock },
          { label: 'Staffed', value: kpis.staffed, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Unstaffed', value: kpis.unstaffed, color: kpis.unstaffed > 0 ? 'text-destructive' : 'text-foreground', icon: AlertTriangle },
          { label: 'Completed', value: kpis.completed, color: 'text-emerald-600', icon: CheckCircle2 },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-medium tracking-wider text-muted-foreground">{kpi.label}</p>
              </div>
              <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Tonight&apos;s Progress</span>
          <span>{kpis.completed}/{kpis.totalTickets} completed ({kpis.totalTickets > 0 ? Math.round((kpis.completed / kpis.totalTickets) * 100) : 0}%)</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${kpis.totalTickets > 0 ? (kpis.completed / kpis.totalTickets) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Sites View — Monday.com-style collapsible groups */}
      {viewMode === 'sites' && (
        <div className="space-y-3">
          {siteGroups.map((group, idx) => {
            const accent = SITE_ACCENT_COLORS[idx % SITE_ACCENT_COLORS.length];
            const headerBg = SITE_HEADER_BG[idx % SITE_HEADER_BG.length];
            const isCollapsed = collapsedSites.has(group.siteId);
            const progressPct = group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0;

            return (
              <div key={group.siteId} className={cn('rounded-lg border border-border overflow-hidden border-l-[3px]', accent)}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleSiteCollapse(group.siteId)}
                  className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90', headerBg)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{group.siteName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{group.siteCode}</span>
                  </div>

                  {group.hasIssues && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Needs Attention
                    </span>
                  )}

                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{group.staffList.length} staff</span>
                    <span>{group.completedCount}/{group.totalCount} done</span>
                  </span>
                </button>

                {!isCollapsed && (
                  <>
                    {/* Progress bar for site */}
                    <div className="px-4 py-2 border-b border-border/50 bg-muted/10">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Staff assigned to this site */}
                    <div className="divide-y divide-border/50">
                      {group.staffList.length > 0 ? (
                        group.staffList.map((staff, staffIdx) => {
                          const statusStyle = STATUS_COLORS[staff.status] ?? STATUS_COLORS.CANCELED;
                          const avatarColor = AVATAR_BG_COLORS[staffIdx % AVATAR_BG_COLORS.length];

                          return (
                            <div
                              key={`${staff.ticketId}-${staff.id}`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                            >
                              {/* Avatar */}
                              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor)}>
                                {getInitials(staff.name)}
                              </div>

                              {/* Name + phone */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{staff.name}</p>
                                {staff.phone && (
                                  <p className="text-xs text-muted-foreground">{staff.phone}</p>
                                )}
                              </div>

                              {/* Shift time */}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{staff.shiftTime}</span>
                              </div>

                              {/* Status pill */}
                              <span className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                statusStyle.bg, statusStyle.text,
                              )}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                                {staff.status}
                              </span>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                {reassigningTicketId === staff.ticketId ? (
                                  <Select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) void handleReassign(staff.ticketId, e.target.value);
                                    }}
                                    options={[
                                      { value: '', label: 'Select...' },
                                      ...availableStaff
                                        .filter((s) => s.id !== staff.id)
                                        .map((s) => ({ value: s.id, label: s.full_name })),
                                    ]}
                                  />
                                ) : (
                                  <>
                                    <Button variant="secondary" size="sm" onClick={() => setReassigningTicketId(staff.ticketId)}>
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                    {staff.phone && (
                                      <Button variant="secondary" size="sm" onClick={() => window.open(`tel:${staff.phone}`, '_self')}>
                                        <Phone className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            No staff assigned — immediate attention required
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary row */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border text-[11px] font-medium text-muted-foreground">
                      <span>{group.totalCount} shift{group.totalCount !== 1 ? 's' : ''}</span>
                      <span>{group.staffList.length} staff assigned</span>
                      <span>{progressPct}% complete</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Staff View — Monday.com-style table */}
      {viewMode === 'staff' && (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_1fr_120px_140px_100px] border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium tracking-wider text-muted-foreground">
            <span>Staff</span>
            <span>Site</span>
            <span>Shift</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-border/50">
            {allStaff.map((staff, idx) => {
              const avatarColor = AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length];

              return staff.sites.map((site, siteIdx) => {
                const statusStyle = STATUS_COLORS[site.status] ?? STATUS_COLORS.CANCELED;

                return (
                  <div
                    key={`${staff.id}-${site.ticketId}`}
                    className="grid grid-cols-[1fr_1fr_120px_140px_100px] items-center gap-1 px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                  >
                    {/* Staff */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {siteIdx === 0 ? (
                        <>
                          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor)}>
                            {getInitials(staff.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{staff.name}</p>
                            {staff.phone && <p className="text-xs text-muted-foreground">{staff.phone}</p>}
                          </div>
                        </>
                      ) : (
                        <div className="ml-10 text-xs text-muted-foreground italic">same staff</div>
                      )}
                    </div>

                    {/* Site */}
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{site.siteName}</p>
                      <p className="text-xs text-muted-foreground">{site.siteCode}</p>
                    </div>

                    {/* Shift */}
                    <div className="text-xs text-muted-foreground">{site.shiftTime}</div>

                    {/* Status */}
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold w-fit',
                      statusStyle.bg, statusStyle.text,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                      {site.status}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {reassigningTicketId === site.ticketId ? (
                        <Select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) void handleReassign(site.ticketId, e.target.value);
                          }}
                          options={[
                            { value: '', label: 'Select...' },
                            ...availableStaff
                              .filter((s) => s.id !== staff.id)
                              .map((s) => ({ value: s.id, label: s.full_name })),
                          ]}
                        />
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setReassigningTicketId(site.ticketId)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          {staff.phone && (
                            <Button variant="secondary" size="sm" onClick={() => window.open(`tel:${staff.phone}`, '_self')}>
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })}
            {allStaff.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No staff assignments for today.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
