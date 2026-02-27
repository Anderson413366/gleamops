'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, MapPin, MapPinned, Navigation, Route } from 'lucide-react';
import { Badge, Button, Card, CardContent, EmptyState, Skeleton, cn } from '@gleamops/ui';

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

export function FloaterBoard() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stops, setStops] = useState<StopViewData[]>([]);
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSaving, setCheckingSaving] = useState<string | null>(null);

  const today = useMemo(() => toDateInput(new Date()), []);

  // Fetch today's routes for the current user
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

      // Get staff record for current user
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

      // Fetch routes for today
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

      // Fetch my tickets for today
      const { data: ticketData } = await supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, scheduled_date, start_time, end_time, status, position_code,
          site:site_id(name, site_code),
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

  // Fetch stops for selected route
  useEffect(() => {
    if (!selectedRouteId) return;
    let cancelled = false;

    async function fetchStops() {
      const supabase = getSupabaseBrowserClient();

      const { data: stopData } = await supabase
        .from('route_stops')
        .select(`
          id, stop_order, site_id, estimated_travel_minutes,
          site:site_id(name, site_code, address),
          job:job_id(job_code, start_time, end_time)
        `)
        .eq('route_id', selectedRouteId)
        .order('stop_order', { ascending: true });

      if (!stopData || cancelled) return;

      // Fetch check events
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

      // Refresh stops
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

  const nextStop = stops.find((s) => !s.checkedIn);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
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
    <div className="space-y-4">
      {routes.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    Tonight&apos;s Route
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {today} · {totalStops} stops · ~{totalTravelMinutes} min travel
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

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{completedStops}/{totalStops} completed</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {nextStop && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                  <p className="font-medium text-primary">Next: {nextStop.siteName}</p>
                  <p className="text-muted-foreground">
                    {nextStop.address ? nextStop.address : 'No address'} · {nextStop.startTime ? formatTime(nextStop.startTime) : 'No time set'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {stops.map((stop) => {
              const isDone = stop.checkedOut;
              const isOnSite = stop.checkedIn && !stop.checkedOut;
              const isPending = !stop.checkedIn;

              return (
                <Card key={stop.stopId} className={cn(isDone && 'opacity-60')}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                          isDone ? 'bg-green-100 text-green-700' : isOnSite ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground',
                        )}>
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : stop.stopOrder}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{stop.siteName}</p>
                          <p className="text-xs text-muted-foreground">{stop.siteCode}{stop.jobCode ? ` · ${stop.jobCode}` : ''}</p>
                          {stop.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {stop.address}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {(stop.startTime ?? stop.endTime) && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(stop.startTime)}{stop.endTime ? ` - ${formatTime(stop.endTime)}` : ''}
                              </span>
                            )}
                            {stop.estimatedTravel != null && (
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                ~{stop.estimatedTravel} min drive
                              </span>
                            )}
                          </div>
                          {stop.checkInTime && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Checked in: {new Date(stop.checkInTime).toLocaleTimeString()}
                              {stop.checkOutTime && ` · Out: ${new Date(stop.checkOutTime).toLocaleTimeString()}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge color={isDone ? 'green' : isOnSite ? 'blue' : 'gray'}>
                          {isDone ? 'Done' : isOnSite ? 'On Site' : 'Pending'}
                        </Badge>
                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleCheckAction(stop.stopId, 'CHECK_IN')}
                            loading={checkingSaving === stop.stopId}
                          >
                            Check In
                          </Button>
                        )}
                        {isOnSite && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCheckAction(stop.stopId, 'CHECK_OUT')}
                            loading={checkingSaving === stop.stopId}
                          >
                            Check Out
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {myTickets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-muted-foreground" />
            My Assignments Today
          </h3>
          {myTickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{ticket.site?.name ?? ticket.ticket_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.site?.site_code ?? ''}
                    {ticket.position_code ? ` · ${ticket.position_code.replaceAll('_', ' ')}` : ''}
                    {ticket.start_time ? ` · ${formatTime(ticket.start_time)}${ticket.end_time ? `-${formatTime(ticket.end_time)}` : ''}` : ''}
                  </p>
                </div>
                <Badge color={ticket.status === 'COMPLETED' || ticket.status === 'VERIFIED' ? 'green' : ticket.status === 'IN_PROGRESS' ? 'yellow' : 'blue'}>
                  {ticket.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
