'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, MapPin, MapPinned, Navigation, Route,
} from 'lucide-react';
import { Button, Card, CardContent, EmptyState, Skeleton, cn } from '@gleamops/ui';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface RouteRow {
  id: string;
  route_code: string;
  route_date: string;
  status: string | null;
}

interface RouteStopRow {
  id: string;
  stop_order: number;
  site_id: string | null;
  site: {
    name: string;
    site_code: string;
    address: { street?: string; city?: string; state?: string; zip?: string } | null;
  } | null;
  job: {
    job_code: string;
    start_time: string | null;
    end_time: string | null;
  } | null;
  estimated_travel_minutes: number | null;
}

interface StopCheckEvent {
  route_stop_id: string;
  event_type: string;
  recorded_at: string;
}

interface MyTicket {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  position_code: string | null;
  site: { name: string; site_code: string } | null;
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

interface StopViewData {
  stopId: string;
  stopOrder: number;
  siteName: string;
  siteCode: string;
  address: string;
  jobCode: string | null;
  startTime: string | null;
  endTime: string | null;
  estimatedTravel: number | null;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  VERIFIED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELED: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

export function FloaterBoard() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stops, setStops] = useState<StopViewData[]>([]);
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSaving, setCheckingSaving] = useState<string | null>(null);

  const today = useMemo(() => toDateInput(new Date()), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoutes() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .is('archived_at', null)
        .maybeSingle();

      if (!staffRow) {
        setLoading(false);
        return;
      }

      const { data: routeData } = await supabase
        .from('daily_routes')
        .select('id, route_code, route_date, status')
        .eq('route_date', today)
        .eq('assigned_to', staffRow.id)
        .is('archived_at', null)
        .order('route_code', { ascending: true });

      if (!cancelled && routeData) {
        setRoutes(routeData as unknown as RouteRow[]);
        if (routeData.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routeData[0].id);
        }
      }

      const { data: ticketData } = await supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, scheduled_date, start_time, end_time, status, position_code,
          site:site_id!work_tickets_site_id_fkey(name, site_code),
          assignments:ticket_assignments!inner(staff_id)
        `)
        .eq('scheduled_date', today)
        .eq('assignments.staff_id', staffRow.id)
        .is('archived_at', null)
        .order('start_time', { ascending: true });

      if (!cancelled && ticketData) {
        setMyTickets(ticketData as unknown as MyTicket[]);
      }

      if (!cancelled) setLoading(false);
    }

    void fetchRoutes();
    return () => { cancelled = true; };
  }, [today, selectedRouteId]);

  useEffect(() => {
    if (!selectedRouteId) return;
    let cancelled = false;

    async function fetchStops() {
      const supabase = getSupabaseBrowserClient();

      const { data: stopData } = await supabase
        .from('route_stops')
        .select(`
          id, stop_order, site_id, estimated_travel_minutes,
          site:site_id!route_stops_site_id_fkey(name, site_code, address),
          job:job_id!route_stops_site_job_id_fkey(job_code, start_time, end_time)
        `)
        .eq('route_id', selectedRouteId)
        .order('stop_order', { ascending: true });

      if (!stopData || cancelled) return;

      const stopIds = stopData.map((s: { id: string }) => s.id);
      const { data: events } = await supabase
        .from('time_events')
        .select('route_stop_id, event_type, recorded_at')
        .in('route_stop_id', stopIds);

      const eventMap = new Map<string, { checkIn: string | null; checkOut: string | null }>();
      for (const evt of (events ?? []) as StopCheckEvent[]) {
        const entry = eventMap.get(evt.route_stop_id) ?? { checkIn: null, checkOut: null };
        if (evt.event_type === 'CHECK_IN') entry.checkIn = evt.recorded_at;
        if (evt.event_type === 'CHECK_OUT') entry.checkOut = evt.recorded_at;
        eventMap.set(evt.route_stop_id, entry);
      }

      if (!cancelled) {
        setStops(
          (stopData as unknown as RouteStopRow[]).map((s) => {
            const checkEvents = eventMap.get(s.id);
            const addr = s.site?.address;
            return {
              stopId: s.id,
              stopOrder: s.stop_order,
              siteName: s.site?.name ?? 'Unknown Site',
              siteCode: s.site?.site_code ?? '',
              address: addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : '',
              jobCode: s.job?.job_code ?? null,
              startTime: s.job?.start_time ?? null,
              endTime: s.job?.end_time ?? null,
              estimatedTravel: s.estimated_travel_minutes,
              checkedIn: Boolean(checkEvents?.checkIn),
              checkedOut: Boolean(checkEvents?.checkOut),
              checkInTime: checkEvents?.checkIn ?? null,
              checkOutTime: checkEvents?.checkOut ?? null,
            };
          }),
        );
      }
    }

    void fetchStops();
    return () => { cancelled = true; };
  }, [selectedRouteId]);

  const handleCheckAction = useCallback(async (stopId: string, eventType: 'CHECK_IN' | 'CHECK_OUT') => {
    setCheckingSaving(stopId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* location unavailable */ }

      await supabase.from('time_events').insert({
        tenant_id: tenantId,
        route_stop_id: stopId,
        event_type: eventType,
        recorded_at: new Date().toISOString(),
        latitude: lat,
        longitude: lng,
      });

      setStops((prev) =>
        prev.map((s) => {
          if (s.stopId !== stopId) return s;
          const now = new Date().toISOString();
          if (eventType === 'CHECK_IN') return { ...s, checkedIn: true, checkInTime: now };
          return { ...s, checkedOut: true, checkOutTime: now };
        }),
      );
    } finally {
      setCheckingSaving(null);
    }
  }, []);

  const completedStops = stops.filter((s) => s.checkedOut).length;
  const totalStops = stops.length;
  const totalTravelMinutes = stops.reduce((sum, s) => sum + (s.estimatedTravel ?? 0), 0);
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  const currentStopIndex = stops.findIndex((s) => !s.checkedIn);
  const nextStop = currentStopIndex >= 0 ? stops[currentStopIndex] : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (routes.length === 0 && myTickets.length === 0) {
    return (
      <EmptyState
        icon={<Route className="h-12 w-12" />}
        title="No route assigned today"
        description="You have no routes or assignments for today. Check back later or contact your supervisor."
      />
    );
  }

  return (
    <div className="space-y-5">
      {routes.length > 0 && (
        <>
          {/* Route header card */}
          <Card className="border-l-[3px] border-l-primary">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Route className="h-5 w-5 text-primary" />
                    Tonight&apos;s Route
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {today} — {totalStops} stops — ~{totalTravelMinutes} min total travel
                  </p>
                </div>
                {routes.length > 1 && (
                  <select
                    value={selectedRouteId ?? ''}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>{r.route_code}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Route Progress</span>
                  <span className="font-medium">{completedStops}/{totalStops} stops completed ({progressPercent}%)</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Next stop highlight */}
              {nextStop && (
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-primary mb-0.5">Next Stop</p>
                      <p className="text-sm font-semibold text-foreground">{nextStop.siteName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nextStop.address || 'No address on file'}
                        {nextStop.startTime && ` — ${formatTime(nextStop.startTime)}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCheckAction(nextStop.stopId, 'CHECK_IN')}
                      loading={checkingSaving === nextStop.stopId}
                    >
                      Check In
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vertical timeline stops */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-0">
              {stops.map((stop, idx) => {
                const isDone = stop.checkedOut;
                const isOnSite = stop.checkedIn && !stop.checkedOut;
                const isPending = !stop.checkedIn;
                const isNext = idx === currentStopIndex;

                return (
                  <div key={stop.stopId} className="relative">
                    {/* Travel indicator between stops */}
                    {idx > 0 && stop.estimatedTravel != null && stop.estimatedTravel > 0 && (
                      <div className="flex items-center gap-2 py-1.5 pl-[30px]">
                        <Navigation className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/60">~{stop.estimatedTravel} min drive</span>
                      </div>
                    )}

                    <div className={cn(
                      'relative flex items-start gap-4 rounded-lg py-3 pl-0 pr-3 transition-all',
                      isNext && 'bg-primary/5',
                      isDone && 'opacity-60',
                    )}>
                      {/* Timeline node */}
                      <div className="relative z-10 flex flex-col items-center shrink-0 w-10">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold border-2 transition-all',
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isOnSite
                              ? 'bg-primary border-primary text-white ring-4 ring-primary/20'
                              : isNext
                                ? 'bg-background border-primary text-primary'
                                : 'bg-muted border-border text-muted-foreground',
                        )}>
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            stop.stopOrder
                          )}
                        </div>
                      </div>

                      {/* Stop content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={cn(
                              'text-sm font-semibold truncate',
                              isDone ? 'text-muted-foreground line-through' : 'text-foreground',
                            )}>
                              {stop.siteName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {stop.siteCode}
                              {stop.jobCode && ` — ${stop.jobCode}`}
                            </p>

                            {stop.address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{stop.address}</span>
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              {(stop.startTime ?? stop.endTime) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(stop.startTime)}{stop.endTime ? ` - ${formatTime(stop.endTime)}` : ''}
                                </span>
                              )}
                            </div>

                            {/* Check timestamps */}
                            {stop.checkInTime && (
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <span>In: {new Date(stop.checkInTime).toLocaleTimeString()}</span>
                                {stop.checkOutTime && <span>Out: {new Date(stop.checkOutTime).toLocaleTimeString()}</span>}
                              </div>
                            )}
                          </div>

                          {/* Status + actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {(() => {
                              const statusKey = isDone ? 'COMPLETED' : isOnSite ? 'IN_PROGRESS' : 'SCHEDULED';
                              const statusStyle = STATUS_COLORS[statusKey];
                              const statusLabel = isDone ? 'Done' : isOnSite ? 'On Site' : 'Pending';
                              return (
                                <span className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                  statusStyle.bg, statusStyle.text,
                                )}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                                  {statusLabel}
                                </span>
                              );
                            })()}

                            {isPending && !isNext && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCheckAction(stop.stopId, 'CHECK_IN')}
                                loading={checkingSaving === stop.stopId}
                              >
                                Check In
                              </Button>
                            )}
                            {isOnSite && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckAction(stop.stopId, 'CHECK_OUT')}
                                loading={checkingSaving === stop.stopId}
                              >
                                Check Out
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* My Assignments — Monday.com-style table */}
      {myTickets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <MapPinned className="h-4 w-4 text-muted-foreground" />
            My Assignments Today
          </h3>

          <div className="rounded-lg border border-border overflow-hidden">
            {/* Column header */}
            <div className="grid grid-cols-[1fr_100px_120px_120px] border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Site</span>
              <span>Position</span>
              <span>Time</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-border/50">
              {myTickets.map((ticket) => {
                const statusStyle = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.CANCELED;

                return (
                  <div
                    key={ticket.id}
                    className="grid grid-cols-[1fr_100px_120px_120px] items-center gap-1 px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{ticket.site?.name ?? ticket.ticket_code}</p>
                      <p className="text-xs text-muted-foreground">{ticket.site?.site_code ?? ''}</p>
                    </div>
                    <div className="text-xs text-foreground truncate">
                      {ticket.position_code?.replaceAll('_', ' ') ?? '—'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {ticket.start_time ? `${formatTime(ticket.start_time)}${ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}` : 'No time'}
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold w-fit',
                      statusStyle.bg, statusStyle.text,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                      {ticket.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
