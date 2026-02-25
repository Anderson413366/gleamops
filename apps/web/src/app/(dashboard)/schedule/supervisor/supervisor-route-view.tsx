'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Route, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Card, CardContent, CardHeader, CardTitle, Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MiniCommandCenter } from './mini-command-center';
import { SiteVisitCard } from './site-visit-card';
import type { SupervisorStopView } from './types';

interface StaffContext {
  id: string;
  tenant_id: string;
  full_name: string;
  staff_code: string;
}

interface RouteRow {
  id: string;
  route_date: string;
  route_type: 'DAILY_ROUTE' | 'MASTER_ROUTE' | 'PROJECT_ROUTE';
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
}

interface RouteStopRow {
  id: string;
  route_id: string;
  site_job_id: string;
  stop_order: number;
  estimated_travel_minutes: number | null;
  is_locked: boolean;
}

interface SiteJobRow {
  id: string;
  job_code: string;
  site_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface SiteRow {
  id: string;
  name: string;
  site_code: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
}

interface TicketSiteStaffRow {
  site_id: string | null;
  assignments?: Array<{
    assignment_status?: string | null;
    staff?: { full_name?: string | null } | null;
  }> | null;
}

interface RouteEventRow {
  id: string;
  site_id: string | null;
  event_type: 'CHECK_IN' | 'CHECK_OUT';
  recorded_at: string;
  notes: string | null;
}

interface RouteEventMeta {
  mode?: string;
  route_id?: string;
  stop_id?: string;
}

function localDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function todayKey() {
  return localDateKey(new Date());
}

function nextDayKey(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return localDateKey(date);
}

function parseRouteEventMeta(notes: string | null): RouteEventMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as RouteEventMeta;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function minutesBetween(earlier: string, later: string): number {
  const diffMs = new Date(later).getTime() - new Date(earlier).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.round(diffMs / 60000);
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function routeTypeLabel(routeType: RouteRow['route_type']): string {
  if (routeType === 'DAILY_ROUTE') return 'Daily Route';
  if (routeType === 'MASTER_ROUTE') return 'Master Route';
  return 'Project Route';
}

function routeBadgeColor(status: RouteRow['status']): 'gray' | 'blue' | 'green' {
  if (status === 'COMPLETED') return 'green';
  if (status === 'PUBLISHED') return 'blue';
  return 'gray';
}

async function captureLocation(): Promise<{ lat: number | null; lng: number | null; accuracy: number | null }> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { lat: null, lng: null, accuracy: null };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve({ lat: null, lng: null, accuracy: null }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export default function SupervisorRouteView() {
  const [loading, setLoading] = useState(true);
  const [savingStopId, setSavingStopId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [stops, setStops] = useState<SupervisorStopView[]>([]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStaff(null);
      setRoutes([]);
      setStops([]);
      setLoading(false);
      return;
    }

    const { data: staffRow, error: staffError } = await supabase
      .from('staff')
      .select('id, tenant_id, full_name, staff_code')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (staffError || !staffRow) {
      setStaff(null);
      setRoutes([]);
      setStops([]);
      setLoading(false);
      return;
    }

    const currentStaff = staffRow as StaffContext;
    setStaff(currentStaff);

    const today = todayKey();
    const { data: routeRows, error: routesError } = await supabase
      .from('routes')
      .select('id, route_date, route_type, status')
      .eq('route_owner_staff_id', currentStaff.id)
      .eq('route_date', today)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (routesError || !routeRows) {
      setRoutes([]);
      setStops([]);
      setLoading(false);
      return;
    }

    const parsedRoutes = routeRows as RouteRow[];
    setRoutes(parsedRoutes);

    const effectiveRouteId = selectedRouteId && parsedRoutes.some((route) => route.id === selectedRouteId)
      ? selectedRouteId
      : parsedRoutes[0]?.id ?? '';

    setSelectedRouteId(effectiveRouteId);

    if (!effectiveRouteId) {
      setStops([]);
      setLoading(false);
      return;
    }

    const { data: stopRows, error: stopsError } = await supabase
      .from('route_stops')
      .select('id, route_id, site_job_id, stop_order, estimated_travel_minutes, is_locked')
      .eq('route_id', effectiveRouteId)
      .is('archived_at', null)
      .order('stop_order', { ascending: true });

    if (stopsError || !stopRows) {
      setStops([]);
      setLoading(false);
      return;
    }

    const parsedStops = stopRows as RouteStopRow[];
    const siteJobIds = parsedStops.map((stop) => stop.site_job_id);

    const { data: siteJobs, error: siteJobsError } = await supabase
      .from('site_jobs')
      .select('id, job_code, site_id, start_time, end_time')
      .in('id', siteJobIds)
      .is('archived_at', null);

    if (siteJobsError || !siteJobs) {
      setStops([]);
      setLoading(false);
      return;
    }

    const jobsById = new Map((siteJobs as SiteJobRow[]).map((job) => [job.id, job]));
    const siteIds = Array.from(new Set((siteJobs as SiteJobRow[]).map((job) => job.site_id).filter(Boolean))) as string[];

    const [sitesRes, ticketsRes, eventsRes] = await Promise.all([
      supabase
        .from('sites')
        .select('id, name, site_code, address')
        .in('id', siteIds)
        .is('archived_at', null),
      supabase
        .from('work_tickets')
        .select('site_id, assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))')
        .eq('scheduled_date', today)
        .in('site_id', siteIds)
        .is('archived_at', null),
      supabase
        .from('time_events')
        .select('id, site_id, event_type, recorded_at, notes')
        .eq('staff_id', currentStaff.id)
        .eq('pin_used', false)
        .gte('recorded_at', `${today}T00:00:00`)
        .lt('recorded_at', `${nextDayKey(today)}T00:00:00`)
        .in('site_id', siteIds)
        .in('event_type', ['CHECK_IN', 'CHECK_OUT'])
        .order('recorded_at', { ascending: true }),
    ]);

    const sitesById = new Map(
      ((sitesRes.data ?? []) as SiteRow[]).map((site) => [site.id, site]),
    );

    const ticketRows = (ticketsRes.data ?? []) as TicketSiteStaffRow[];
    const assignedBySite = new Map<string, Set<string>>();
    for (const row of ticketRows) {
      if (!row.site_id) continue;
      const bucket = assignedBySite.get(row.site_id) ?? new Set<string>();
      for (const assignment of row.assignments ?? []) {
        if (assignment.assignment_status && assignment.assignment_status !== 'ASSIGNED') continue;
        const name = assignment.staff?.full_name?.trim();
        if (name) bucket.add(name);
      }
      assignedBySite.set(row.site_id, bucket);
    }

    const rawEvents = (eventsRes.data ?? []) as RouteEventRow[];
    const eventsByStop = new Map<string, { checkInAt: string | null; checkOutAt: string | null }>();
    for (const event of rawEvents) {
      const meta = parseRouteEventMeta(event.notes);
      if (meta.mode !== 'SUPERVISOR_ROUTE') continue;
      if (meta.route_id !== effectiveRouteId) continue;
      const stopId = meta.stop_id;
      if (!stopId) continue;

      const bucket = eventsByStop.get(stopId) ?? { checkInAt: null, checkOutAt: null };
      if (event.event_type === 'CHECK_IN') {
        bucket.checkInAt = event.recorded_at;
      } else if (event.event_type === 'CHECK_OUT') {
        bucket.checkOutAt = event.recorded_at;
      }
      eventsByStop.set(stopId, bucket);
    }

    const builtStops = parsedStops.map((stop) => {
      const job = jobsById.get(stop.site_job_id);
      const site = job?.site_id ? sitesById.get(job.site_id) : null;
      const eventInfo = eventsByStop.get(stop.id) ?? { checkInAt: null, checkOutAt: null };

      return {
        id: stop.id,
        stopOrder: stop.stop_order,
        isLocked: stop.is_locked,
        estimatedTravelMinutes: stop.estimated_travel_minutes,
        siteId: job?.site_id ?? null,
        siteName: site?.name ?? 'Unknown Site',
        siteCode: site?.site_code ?? null,
        siteAddress: site?.address
          ? [site.address.street, site.address.city, site.address.state, site.address.zip].filter(Boolean).join(', ')
          : null,
        jobCode: job?.job_code ?? null,
        startTime: job?.start_time ?? null,
        endTime: job?.end_time ?? null,
        assignedStaff: job?.site_id ? Array.from(assignedBySite.get(job.site_id) ?? []) : [],
        checkInAt: eventInfo.checkInAt,
        checkOutAt: eventInfo.checkOutAt,
        driveFromPreviousMinutes: null,
      } as SupervisorStopView;
    });

    const ordered = [...builtStops].sort((a, b) => a.stopOrder - b.stopOrder);
    for (let index = 0; index < ordered.length; index += 1) {
      if (index === 0) continue;
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (previous.checkOutAt && current.checkInAt) {
        current.driveFromPreviousMinutes = minutesBetween(previous.checkOutAt, current.checkInAt);
      }
    }

    setStops(ordered);
    setLoading(false);
  }, [selectedRouteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordVisit = useCallback(
    async (stop: SupervisorStopView, eventType: 'CHECK_IN' | 'CHECK_OUT') => {
      if (!staff) return;
      if (!selectedRouteId) return;
      if (!stop.siteId) {
        toast.error('Unable to resolve site for this stop.');
        return;
      }

      setSavingStopId(stop.id);
      const location = await captureLocation();
      const supabase = getSupabaseBrowserClient();

      const notes = {
        mode: 'SUPERVISOR_ROUTE',
        route_id: selectedRouteId,
        stop_id: stop.id,
        recorded_by: 'supervisor-route-view',
      };

      const { error } = await supabase
        .from('time_events')
        .insert({
          tenant_id: staff.tenant_id,
          staff_id: staff.id,
          site_id: stop.siteId,
          event_type: eventType,
          recorded_at: new Date().toISOString(),
          lat: location.lat,
          lng: location.lng,
          accuracy_meters: location.accuracy,
          pin_used: false,
          notes: JSON.stringify(notes),
        });

      if (error) {
        toast.error(error.message);
        setSavingStopId(null);
        return;
      }

      toast.success(eventType === 'CHECK_IN' ? 'Site check in recorded.' : 'Site check out recorded.');
      setSavingStopId(null);
      await load();
    },
    [load, selectedRouteId, staff],
  );

  const routeOptions = useMemo(
    () => [
      { value: '', label: 'Select route...' },
      ...routes.map((route) => ({
        value: route.id,
        label: `${routeTypeLabel(route.route_type)} · ${route.route_date} · ${route.status}`,
      })),
    ],
    [routes],
  );

  const dateLabel = selectedRoute ? formatDateLabel(selectedRoute.route_date) : formatDateLabel(todayKey());

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading supervisor route itinerary...
        </CardContent>
      </Card>
    );
  }

  if (!staff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Supervisor Route Access
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No staff profile is linked to your user. Ask admin to map your user to a staff record.
        </CardContent>
      </Card>
    );
  }

  if (routes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-module-accent" />
            Tonight&apos;s Supervisor Route
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No route is assigned to {staff.full_name} for {dateLabel}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supervisor Route</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-site check-in/out and drive-time tracking for {staff.full_name}.
          </p>
        </div>
        {selectedRoute ? (
          <Badge color={routeBadgeColor(selectedRoute.status)}>{selectedRoute.status}</Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-module-accent" />
            Route Selector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            label="Assigned Route"
            value={selectedRouteId}
            onChange={(event) => setSelectedRouteId(event.target.value)}
            options={routeOptions}
          />
        </CardContent>
      </Card>

      <MiniCommandCenter dateLabel={dateLabel} stops={stops} />

      <div className="grid gap-3">
        {stops.map((stop) => (
          <SiteVisitCard
            key={stop.id}
            stop={stop}
            saving={savingStopId === stop.id}
            onCheckIn={(target) => void recordVisit(target, 'CHECK_IN')}
            onCheckOut={(target) => void recordVisit(target, 'CHECK_OUT')}
          />
        ))}
      </div>
    </div>
  );
}
