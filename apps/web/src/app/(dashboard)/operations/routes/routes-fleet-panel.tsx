'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Truck, PlusCircle, MapPin, Clock3, Lock } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { EntityLink } from '@/components/links/entity-link';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type RouteRow = {
  id: string;
  route_date: string;
  route_type: 'DAILY_ROUTE' | 'MASTER_ROUTE' | 'PROJECT_ROUTE';
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  route_owner_staff_id: string | null;
  created_at: string;
};

type RouteStopRow = {
  id: string;
  route_id: string;
  site_job_id: string;
  stop_order: number;
  estimated_travel_minutes: number | null;
  is_locked: boolean;
};

type StaffRow = {
  id: string;
  staff_code: string;
  full_name: string | null;
};

type SiteJobRow = {
  id: string;
  job_code: string;
  job_name: string;
  service_date: string;
  site_id: string;
};

type SiteRow = {
  id: string;
  site_code: string;
  name: string;
};

type VehicleRow = {
  id: string;
  vehicle_code: string;
  name: string | null;
  status: string;
};

type VehicleCheckoutRow = {
  id: string;
  vehicle_id: string;
  checked_out_at: string;
  status: string;
};

type VehicleMaintenanceRow = {
  id: string;
  vehicle_id: string;
  service_date: string;
  next_service_date: string | null;
};

interface Props {
  search: string;
}

function labelRouteType(value: RouteRow['route_type']) {
  switch (value) {
    case 'DAILY_ROUTE':
      return 'Daily Route';
    case 'MASTER_ROUTE':
      return 'Master Route';
    case 'PROJECT_ROUTE':
      return 'Project Route';
    default:
      return value;
  }
}

function badgeColorForStatus(status: string): 'gray' | 'blue' | 'yellow' | 'orange' | 'green' | 'red' {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'PUBLISHED':
      return 'blue';
    case 'DRAFT':
      return 'gray';
    default:
      return 'gray';
  }
}

export default function RoutesFleetPanel({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { tenantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingRoute, setSavingRoute] = useState(false);
  const [savingStop, setSavingStop] = useState(false);

  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [stops, setStops] = useState<RouteStopRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [jobs, setJobs] = useState<SiteJobRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [checkouts, setCheckouts] = useState<VehicleCheckoutRow[]>([]);
  const [maintenance, setMaintenance] = useState<VehicleMaintenanceRow[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [newRouteDate, setNewRouteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newRouteType, setNewRouteType] = useState<RouteRow['route_type']>('DAILY_ROUTE');
  const [newRouteOwnerStaffId, setNewRouteOwnerStaffId] = useState('');

  const [newStopJobId, setNewStopJobId] = useState('');
  const [newStopTravelMinutes, setNewStopTravelMinutes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    const [routesRes, stopsRes, staffRes, jobsRes, sitesRes, vehiclesRes, checkoutsRes, maintenanceRes] = await Promise.all([
      supabase
        .from('routes')
        .select('id, route_date, route_type, status, route_owner_staff_id, created_at')
        .is('archived_at', null)
        .order('route_date', { ascending: false })
        .limit(200),
      supabase
        .from('route_stops')
        .select('id, route_id, site_job_id, stop_order, estimated_travel_minutes, is_locked')
        .is('archived_at', null)
        .order('stop_order', { ascending: true })
        .limit(2000),
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .eq('status', 'ACTIVE')
        .is('archived_at', null)
        .order('full_name', { ascending: true }),
      supabase
        .from('site_jobs')
        .select('id, job_code, job_name, service_date, site_id')
        .is('archived_at', null)
        .in('status', ['ACTIVE', 'SCHEDULED', 'IN_PROGRESS'])
        .order('service_date', { ascending: false })
        .limit(400),
      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(400),
      supabase
        .from('vehicles')
        .select('id, vehicle_code, name, status')
        .is('archived_at', null)
        .limit(400),
      supabase
        .from('vehicle_checkouts')
        .select('id, vehicle_id, checked_out_at, status')
        .is('archived_at', null)
        .eq('status', 'OUT')
        .limit(400),
      supabase
        .from('vehicle_maintenance')
        .select('id, vehicle_id, service_date, next_service_date')
        .is('archived_at', null)
        .order('service_date', { ascending: false })
        .limit(1200),
    ]);

    const errors = [
      routesRes.error,
      stopsRes.error,
      staffRes.error,
      jobsRes.error,
      sitesRes.error,
      vehiclesRes.error,
      checkoutsRes.error,
      maintenanceRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Failed to load routes and fleet data.');
    }

    setRoutes((routesRes.data ?? []) as RouteRow[]);
    setStops((stopsRes.data ?? []) as RouteStopRow[]);
    setStaff((staffRes.data ?? []) as StaffRow[]);
    setJobs((jobsRes.data ?? []) as SiteJobRow[]);
    setSites((sitesRes.data ?? []) as SiteRow[]);
    setVehicles((vehiclesRes.data ?? []) as VehicleRow[]);
    setCheckouts((checkoutsRes.data ?? []) as VehicleCheckoutRow[]);
    setMaintenance((maintenanceRes.data ?? []) as VehicleMaintenanceRow[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);
  const jobById = useMemo(() => new Map(jobs.map((row) => [row.id, row])), [jobs]);
  const siteById = useMemo(() => new Map(sites.map((row) => [row.id, row])), [sites]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;

    return routes.filter((route) => {
      const owner = route.route_owner_staff_id ? staffById.get(route.route_owner_staff_id) : undefined;
      return route.route_date.toLowerCase().includes(q)
        || route.route_type.toLowerCase().includes(q)
        || route.status.toLowerCase().includes(q)
        || (owner?.full_name ?? '').toLowerCase().includes(q)
        || (owner?.staff_code ?? '').toLowerCase().includes(q);
    });
  }, [routes, search, staffById]);

  useEffect(() => {
    if (!selectedRouteId && filteredRoutes.length > 0) {
      setSelectedRouteId(filteredRoutes[0].id);
      return;
    }
    if (selectedRouteId && !filteredRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(filteredRoutes[0]?.id ?? '');
    }
  }, [filteredRoutes, selectedRouteId]);

  const selectedRoute = useMemo(
    () => filteredRoutes.find((route) => route.id === selectedRouteId) ?? null,
    [filteredRoutes, selectedRouteId],
  );

  const stopsForSelectedRoute = useMemo(() => {
    if (!selectedRouteId) return [];
    return stops
      .filter((row) => row.route_id === selectedRouteId)
      .sort((a, b) => a.stop_order - b.stop_order);
  }, [selectedRouteId, stops]);

  const routeKpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalStops = stops.length;
    const lockedStops = stops.filter((row) => row.is_locked).length;

    return {
      todayRoutes: routes.filter((row) => row.route_date === today).length,
      publishedRoutes: routes.filter((row) => row.status === 'PUBLISHED').length,
      totalStops,
      lockedStops,
    };
  }, [routes, stops]);

  const fleetKpis = useMemo(() => {
    const checkoutVehicleIds = new Set(checkouts.map((row) => row.vehicle_id));
    const readyVehicles = vehicles.filter((row) => row.status === 'ACTIVE' && !checkoutVehicleIds.has(row.id)).length;
    const outVehicles = checkouts.length;

    const now = Date.now();
    const overdueCheckouts = checkouts.filter((row) => {
      const checkedOutAt = new Date(row.checked_out_at).getTime();
      if (Number.isNaN(checkedOutAt)) return false;
      const diffHours = (now - checkedOutAt) / 1000 / 60 / 60;
      return diffHours >= 12;
    }).length;

    const latestMaintenanceByVehicle = new Map<string, VehicleMaintenanceRow>();
    for (const entry of maintenance) {
      if (!latestMaintenanceByVehicle.has(entry.vehicle_id)) {
        latestMaintenanceByVehicle.set(entry.vehicle_id, entry);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const maintenanceDue = vehicles.filter((vehicle) => {
      if (vehicle.status !== 'ACTIVE') return false;
      const latest = latestMaintenanceByVehicle.get(vehicle.id);
      if (!latest) return true;
      if (latest.next_service_date) {
        return latest.next_service_date <= today;
      }
      const serviceDate = new Date(latest.service_date).getTime();
      if (Number.isNaN(serviceDate)) return true;
      const daysSince = Math.floor((Date.now() - serviceDate) / 1000 / 60 / 60 / 24);
      return daysSince >= 30;
    }).length;

    return {
      readyVehicles,
      outVehicles,
      overdueCheckouts,
      maintenanceDue,
    };
  }, [checkouts, maintenance, vehicles]);

  const createRoute = useCallback(async () => {
    if (!tenantId) {
      toast.error('Tenant context missing. Refresh and try again.');
      return;
    }

    setSavingRoute(true);
    const { error } = await supabase
      .from('routes')
      .insert({
        tenant_id: tenantId,
        route_date: newRouteDate,
        route_type: newRouteType,
        route_owner_staff_id: newRouteOwnerStaffId || null,
        status: 'DRAFT',
      });

    setSavingRoute(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Route created.');
    await load();
  }, [load, newRouteDate, newRouteOwnerStaffId, newRouteType, supabase, tenantId]);

  const addStop = useCallback(async () => {
    if (!tenantId || !selectedRouteId || !newStopJobId) {
      toast.error('Select route and job first.');
      return;
    }

    const nextOrder = stopsForSelectedRoute.length > 0
      ? Math.max(...stopsForSelectedRoute.map((row) => row.stop_order)) + 1
      : 1;

    setSavingStop(true);
    const { error } = await supabase
      .from('route_stops')
      .insert({
        tenant_id: tenantId,
        route_id: selectedRouteId,
        site_job_id: newStopJobId,
        stop_order: nextOrder,
        estimated_travel_minutes: newStopTravelMinutes ? Number(newStopTravelMinutes) : null,
        is_locked: false,
      });

    setSavingStop(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewStopJobId('');
    setNewStopTravelMinutes('');
    toast.success('Stop added to route.');
    await load();
  }, [load, newStopJobId, newStopTravelMinutes, selectedRouteId, stopsForSelectedRoute, supabase, tenantId]);

  const updateRouteStatus = useCallback(async (routeId: string, status: RouteRow['status']) => {
    const { error } = await supabase
      .from('routes')
      .update({ status })
      .eq('id', routeId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Route moved to ${status}.`);
    await load();
  }, [load, supabase]);

  const toggleStopLock = useCallback(async (stopId: string, nextValue: boolean) => {
    const { error } = await supabase
      .from('route_stops')
      .update({ is_locked: nextValue })
      .eq('id', stopId);

    if (error) {
      toast.error(error.message);
      return;
    }

    await load();
  }, [load, supabase]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Routes Today</p><p className="text-xl font-semibold">{routeKpis.todayRoutes}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Published Routes</p><p className="text-xl font-semibold">{routeKpis.publishedRoutes}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Stops Planned</p><p className="text-xl font-semibold">{routeKpis.totalStops}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Locked Stops</p><p className="text-xl font-semibold text-warning">{routeKpis.lockedStops}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Fleet Ready</p><p className="text-xl font-semibold text-green-600">{fleetKpis.readyVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Checked Out</p><p className="text-xl font-semibold text-blue-600">{fleetKpis.outVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Overdue Returns</p><p className="text-xl font-semibold text-red-600">{fleetKpis.overdueCheckouts}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Maintenance Due</p><p className="text-xl font-semibold text-warning">{fleetKpis.maintenanceDue}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Build Route</h3>
          </div>
          <p className="text-xs text-muted-foreground">Create route plans and assign ordered stops for field teams.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={newRouteDate}
            onChange={(event) => setNewRouteDate(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
          <select
            value={newRouteType}
            onChange={(event) => setNewRouteType(event.target.value as RouteRow['route_type'])}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="DAILY_ROUTE">Daily Route</option>
            <option value="MASTER_ROUTE">Master Route</option>
            <option value="PROJECT_ROUTE">Project Route</option>
          </select>
          <select
            value={newRouteOwnerStaffId}
            onChange={(event) => setNewRouteOwnerStaffId(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="">Unassigned owner</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {(person.full_name ?? person.staff_code)} ({person.staff_code})
              </option>
            ))}
          </select>
          <Button onClick={createRoute} disabled={savingRoute}>
            <PlusCircle className="h-4 w-4" />
            {savingRoute ? 'Creating...' : 'Create Route'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Route Queue</h3>
              <Badge color="gray">{filteredRoutes.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading routes...</p>
            ) : filteredRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No routes found.</p>
            ) : (
              <div className="space-y-2">
                {filteredRoutes.map((route) => {
                  const owner = route.route_owner_staff_id ? staffById.get(route.route_owner_staff_id) : null;
                  const routeStops = stops.filter((stop) => stop.route_id === route.id);
                  const totalTravel = routeStops.reduce((total, stop) => total + (stop.estimated_travel_minutes ?? 0), 0);
                  const isSelected = selectedRouteId === route.id;

                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{labelRouteType(route.route_type)} · {new Date(`${route.route_date}T00:00:00`).toLocaleDateString()}</p>
                        <Badge color={badgeColorForStatus(route.status)}>{route.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Owner: {owner ? `${owner.full_name ?? owner.staff_code} (${owner.staff_code})` : 'Unassigned'} · Stops: {routeStops.length} · Travel: {totalTravel}m
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Selected Route</h3>
              {selectedRoute ? <Badge color={badgeColorForStatus(selectedRoute.status)}>{selectedRoute.status}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedRoute ? (
              <p className="text-sm text-muted-foreground">Select a route to manage stops.</p>
            ) : (
              <>
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">
                    {labelRouteType(selectedRoute.route_type)} · {new Date(`${selectedRoute.route_date}T00:00:00`).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRoute.status !== 'DRAFT' && (
                      <Button size="sm" variant="secondary" onClick={() => updateRouteStatus(selectedRoute.id, 'DRAFT')}>Move to Draft</Button>
                    )}
                    {selectedRoute.status !== 'PUBLISHED' && (
                      <Button size="sm" variant="secondary" onClick={() => updateRouteStatus(selectedRoute.id, 'PUBLISHED')}>Publish Route</Button>
                    )}
                    {selectedRoute.status !== 'COMPLETED' && (
                      <Button size="sm" variant="secondary" onClick={() => updateRouteStatus(selectedRoute.id, 'COMPLETED')}>Mark Completed</Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    value={newStopJobId}
                    onChange={(event) => setNewStopJobId(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm md:col-span-2"
                  >
                    <option value="">Select service plan...</option>
                    {jobs.map((job) => {
                      const site = siteById.get(job.site_id);
                      return (
                        <option key={job.id} value={job.id}>
                          {job.job_name} ({job.job_code}) · {site?.name ?? 'Unknown Site'}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={newStopTravelMinutes}
                    onChange={(event) => setNewStopTravelMinutes(event.target.value)}
                    placeholder="Travel min"
                    className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                  />
                </div>
                <Button onClick={addStop} disabled={savingStop} className="w-full">
                  <PlusCircle className="h-4 w-4" />
                  {savingStop ? 'Adding Stop...' : 'Add Stop'}
                </Button>

                <div className="space-y-2">
                  {stopsForSelectedRoute.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stops on this route yet.</p>
                  ) : (
                    stopsForSelectedRoute.map((stop) => {
                      const job = jobById.get(stop.site_job_id);
                      const site = job ? siteById.get(job.site_id) : undefined;
                      return (
                        <div key={stop.id} className="rounded-md border border-border px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">Stop {stop.stop_order}</p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => toggleStopLock(stop.id, !stop.is_locked)}
                            >
                              <Lock className="h-3.5 w-3.5" />
                              {stop.is_locked ? 'Unlock' : 'Lock'}
                            </Button>
                          </div>
                          <div className="mt-1 text-sm text-foreground">
                            {job ? (
                              <EntityLink
                                entityType="job"
                                code={job.job_code}
                                name={job.job_name}
                                showCode
                              />
                            ) : (
                              <span className="text-muted-foreground">Unknown service plan</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />
                              {site ? (
                                <EntityLink entityType="site" code={site.site_code} name={site.name} showCode />
                              ) : 'Unknown site'}
                            </span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{stop.estimated_travel_minutes ?? 0} min travel</span>
                            <span>{stop.is_locked ? 'Locked' : 'Editable'}</span>
                            <span>{job?.service_date ? new Date(`${job.service_date}T00:00:00`).toLocaleDateString() : 'No date'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-foreground">Fleet Snapshot</h3>
          </div>
          <p className="text-xs text-muted-foreground">Live readiness for route dispatch, returns, and maintenance exposure.</p>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles available.</p>
          ) : (
            <div className="space-y-2">
              {vehicles.slice(0, 12).map((vehicle) => {
                const checkout = checkouts.find((entry) => entry.vehicle_id === vehicle.id) ?? null;
                const isOverdue = checkout
                  ? ((Date.now() - new Date(checkout.checked_out_at).getTime()) / 1000 / 60 / 60) >= 12
                  : false;

                return (
                  <div key={vehicle.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <div>
                      <EntityLink
                        entityType="vehicle"
                        code={vehicle.vehicle_code}
                        name={vehicle.name ?? vehicle.vehicle_code}
                        showCode
                      />
                      <p className="text-xs text-muted-foreground">
                        {checkout
                          ? `Checked out ${new Date(checkout.checked_out_at).toLocaleString()}`
                          : 'Available for dispatch'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={vehicle.status === 'ACTIVE' ? 'green' : vehicle.status === 'IN_SHOP' ? 'yellow' : 'gray'}>{vehicle.status}</Badge>
                      {checkout ? <Badge color={isOverdue ? 'red' : 'blue'}>{isOverdue ? 'OVERDUE' : 'OUT'}</Badge> : <Badge color="green">READY</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
