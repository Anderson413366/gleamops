'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Truck, PlusCircle, MapPin, Clock3, Lock, ShieldCheck, Gauge, CalendarPlus, ClipboardPlus, ChevronDown, ChevronRight, PackageSearch } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, ExportButton, SlideOver, Textarea } from '@gleamops/ui';
import { toast } from 'sonner';
import { EntityLink } from '@/components/links/entity-link';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { executeWithOfflineQueue } from '@/lib/offline/mutation-queue';
import type { LoadSheetResponse } from '@gleamops/shared';

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

type RouteStopTaskRow = {
  id: string;
  route_stop_id: string;
  task_type: string;
  description: string;
  task_order: number;
  is_from_template: boolean;
  is_completed: boolean;
  evidence_required: boolean;
};

type StaffRow = {
  id: string;
  staff_code: string;
  full_name: string | null;
};

type SiteJobRow = {
  id: string;
  job_code: string;
  start_date: string | null;
  status: string;
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
  route_id: string | null;
  staff_id: string | null;
  checked_out_at: string;
  returned_at: string | null;
  checkout_odometer: number | null;
  return_odometer: number | null;
  fuel_level_out: string | null;
  fuel_level_in: string | null;
  dvir_out_status: 'PENDING' | 'PASS' | 'FAIL';
  dvir_in_status: 'PENDING' | 'PASS' | 'FAIL';
  return_notes: string | null;
  status: string;
};

type VehicleMaintenanceRow = {
  id: string;
  vehicle_id: string;
  service_date: string;
  next_service_date: string | null;
};

type VehicleDvirRow = {
  id: string;
  checkout_id: string;
  vehicle_id: string;
  report_type: 'CHECKOUT' | 'RETURN';
  odometer: number | null;
  fuel_level: string | null;
  issues_found: boolean;
  notes: string | null;
  reported_at: string;
};

type VehicleFuelLogRow = {
  id: string;
  vehicle_id: string;
  route_id: string | null;
  checkout_id: string | null;
  gallons: number;
  total_cost: number | null;
  odometer: number | null;
  station_name: string | null;
  fueled_at: string;
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
  const [dvirLogs, setDvirLogs] = useState<VehicleDvirRow[]>([]);
  const [fuelLogs, setFuelLogs] = useState<VehicleFuelLogRow[]>([]);
  const [routeStopTasks, setRouteStopTasks] = useState<RouteStopTaskRow[]>([]);
  const [loadSheet, setLoadSheet] = useState<LoadSheetResponse | null>(null);
  const [loadSheetLoading, setLoadSheetLoading] = useState(false);
  const [loadSheetOpen, setLoadSheetOpen] = useState(true);
  const [expandedLoadItems, setExpandedLoadItems] = useState<Record<string, boolean>>({});

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [newRouteDate, setNewRouteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newRouteType, setNewRouteType] = useState<RouteRow['route_type']>('DAILY_ROUTE');
  const [newRouteOwnerStaffId, setNewRouteOwnerStaffId] = useState('');

  const [newStopJobId, setNewStopJobId] = useState('');
  const [newStopTravelMinutes, setNewStopTravelMinutes] = useState('');
  const [customTaskOpen, setCustomTaskOpen] = useState(false);
  const [customTaskStopId, setCustomTaskStopId] = useState('');
  const [customTaskDescription, setCustomTaskDescription] = useState('');
  const [customTaskEvidenceRequired, setCustomTaskEvidenceRequired] = useState(false);
  const [savingCustomTask, setSavingCustomTask] = useState(false);

  const [fleetModalOpen, setFleetModalOpen] = useState(false);
  const [fleetMode, setFleetMode] = useState<'checkout' | 'return'>('checkout');
  const [fleetVehicleId, setFleetVehicleId] = useState('');
  const [fleetCheckoutId, setFleetCheckoutId] = useState('');
  const [fleetRouteId, setFleetRouteId] = useState('');
  const [fleetStaffId, setFleetStaffId] = useState('');
  const [fleetOdometer, setFleetOdometer] = useState('');
  const [fleetFuelLevel, setFleetFuelLevel] = useState('HALF');
  const [fleetFuelGallons, setFleetFuelGallons] = useState('');
  const [fleetFuelCost, setFleetFuelCost] = useState('');
  const [fleetStation, setFleetStation] = useState('');
  const [fleetNotes, setFleetNotes] = useState('');
  const [fleetSaving, setFleetSaving] = useState(false);
  const [dvirChecklist, setDvirChecklist] = useState<Record<string, boolean>>({
    brakes_ok: true,
    lights_ok: true,
    tires_ok: true,
    fluids_ok: true,
    mirrors_ok: true,
    warning_lights_ok: true,
  });

  const load = useCallback(async () => {
    setLoading(true);

    const [routesRes, stopsRes, tasksRes, staffRes, jobsRes, sitesRes, vehiclesRes, checkoutsRes, maintenanceRes, dvirRes, fuelRes] = await Promise.all([
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
        .from('route_stop_tasks')
        .select('id, route_stop_id, task_type, description, task_order, is_from_template, is_completed, evidence_required')
        .is('archived_at', null)
        .order('task_order', { ascending: true })
        .limit(6000),
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .eq('staff_status', 'ACTIVE')
        .is('archived_at', null)
        .order('full_name', { ascending: true }),
      supabase
        .from('site_jobs')
        .select('id, job_code, start_date, status, site_id')
        .is('archived_at', null)
        .order('start_date', { ascending: false })
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
        .select('id, vehicle_id, route_id, staff_id, checked_out_at, returned_at, checkout_odometer, return_odometer, fuel_level_out, fuel_level_in, dvir_out_status, dvir_in_status, return_notes, status')
        .is('archived_at', null)
        .limit(400),
      supabase
        .from('vehicle_maintenance')
        .select('id, vehicle_id, service_date, next_service_date')
        .is('archived_at', null)
        .order('service_date', { ascending: false })
        .limit(1200),
      supabase
        .from('vehicle_dvir_logs')
        .select('id, checkout_id, vehicle_id, report_type, odometer, fuel_level, issues_found, notes, reported_at')
        .is('archived_at', null)
        .order('reported_at', { ascending: false })
        .limit(1200),
      supabase
        .from('vehicle_fuel_logs')
        .select('id, vehicle_id, route_id, checkout_id, gallons, total_cost, odometer, station_name, fueled_at')
        .is('archived_at', null)
        .order('fueled_at', { ascending: false })
        .limit(1200),
    ]);

    const errors = [
      routesRes.error,
      stopsRes.error,
      tasksRes.error,
      staffRes.error,
      jobsRes.error,
      sitesRes.error,
      vehiclesRes.error,
      checkoutsRes.error,
      maintenanceRes.error,
      dvirRes.error,
      fuelRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Failed to load routes and fleet data.');
    }

    setRoutes((routesRes.data ?? []) as RouteRow[]);
    setStops((stopsRes.data ?? []) as RouteStopRow[]);
    setRouteStopTasks((tasksRes.data ?? []) as RouteStopTaskRow[]);
    setStaff((staffRes.data ?? []) as StaffRow[]);
    setJobs((jobsRes.data ?? []) as SiteJobRow[]);
    setSites((sitesRes.data ?? []) as SiteRow[]);
    setVehicles((vehiclesRes.data ?? []) as VehicleRow[]);
    setCheckouts((checkoutsRes.data ?? []) as VehicleCheckoutRow[]);
    setMaintenance((maintenanceRes.data ?? []) as VehicleMaintenanceRow[]);
    setDvirLogs((dvirRes.data ?? []) as VehicleDvirRow[]);
    setFuelLogs((fuelRes.data ?? []) as VehicleFuelLogRow[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);
  const jobById = useMemo(() => new Map(jobs.map((row) => [row.id, row])), [jobs]);
  const siteById = useMemo(() => new Map(sites.map((row) => [row.id, row])), [sites]);
  const vehicleById = useMemo(() => new Map(vehicles.map((row) => [row.id, row])), [vehicles]);

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

  useEffect(() => {
    let active = true;

    if (!selectedRouteId) {
      setLoadSheet(null);
      setExpandedLoadItems({});
      return () => {
        active = false;
      };
    }
    setExpandedLoadItems({});

    const loadRouteSheet = async () => {
      setLoadSheetLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/operations/routes/${selectedRouteId}/load-sheet`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.data) {
          throw new Error(body?.detail ?? body?.title ?? 'Failed to load route load sheet.');
        }

        if (!active) return;
        setLoadSheet(body.data as LoadSheetResponse);
      } catch (error) {
        if (!active) return;
        setLoadSheet(null);
        toast.error(error instanceof Error ? error.message : 'Failed to load route load sheet.');
      } finally {
        if (active) {
          setLoadSheetLoading(false);
        }
      }
    };

    void loadRouteSheet();

    return () => {
      active = false;
    };
  }, [selectedRouteId, supabase]);

  const toggleLoadItem = useCallback((key: string) => {
    setExpandedLoadItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const stopsForSelectedRoute = useMemo(() => {
    if (!selectedRouteId) return [];
    return stops
      .filter((row) => row.route_id === selectedRouteId)
      .sort((a, b) => a.stop_order - b.stop_order);
  }, [selectedRouteId, stops]);

  const tasksByStopId = useMemo(() => {
    return routeStopTasks.reduce<Map<string, RouteStopTaskRow[]>>((map, task) => {
      const existing = map.get(task.route_stop_id) ?? [];
      existing.push(task);
      map.set(task.route_stop_id, existing);
      return map;
    }, new Map());
  }, [routeStopTasks]);

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
    const activeCheckouts = checkouts.filter((row) => row.status === 'OUT');
    const checkoutVehicleIds = new Set(activeCheckouts.map((row) => row.vehicle_id));
    const readyVehicles = vehicles.filter((row) => row.status === 'ACTIVE' && !checkoutVehicleIds.has(row.id)).length;
    const outVehicles = activeCheckouts.length;

    const now = Date.now();
    const overdueCheckouts = activeCheckouts.filter((row) => {
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

    const dvirDue = activeCheckouts.filter((checkout) => checkout.dvir_out_status !== 'PASS').length;
    const recentFuelLogs = fuelLogs.filter((log) => {
      const hours = (Date.now() - new Date(log.fueled_at).getTime()) / 1000 / 60 / 60;
      return Number.isFinite(hours) && hours <= 24;
    }).length;

    return {
      readyVehicles,
      outVehicles,
      overdueCheckouts,
      maintenanceDue,
      dvirDue,
      recentFuelLogs,
    };
  }, [checkouts, fuelLogs, maintenance, vehicles]);

  const exportRows = useMemo(() => {
    const routeRows = routes.map((route) => ({
      record_type: 'ROUTE',
      code: route.id,
      date: route.route_date,
      status: route.status,
      ref_1: labelRouteType(route.route_type),
      ref_2: route.route_owner_staff_id ? (staffById.get(route.route_owner_staff_id)?.full_name ?? '') : '',
      metric_1: stops.filter((stop) => stop.route_id === route.id).length,
      metric_2: '',
    }));
    const checkoutRows = checkouts.map((checkout) => ({
      record_type: 'VEHICLE_CHECKOUT',
      code: checkout.id,
      date: checkout.checked_out_at,
      status: checkout.status,
      ref_1: vehicleById.get(checkout.vehicle_id)?.vehicle_code ?? '',
      ref_2: checkout.staff_id ? (staffById.get(checkout.staff_id)?.full_name ?? '') : '',
      metric_1: checkout.checkout_odometer ?? '',
      metric_2: checkout.return_odometer ?? '',
    }));
    const fuelRows = fuelLogs.slice(0, 300).map((fuel) => ({
      record_type: 'FUEL_LOG',
      code: fuel.id,
      date: fuel.fueled_at,
      status: 'RECORDED',
      ref_1: vehicleById.get(fuel.vehicle_id)?.vehicle_code ?? '',
      ref_2: fuel.station_name ?? '',
      metric_1: fuel.gallons,
      metric_2: fuel.total_cost ?? '',
    }));
    return [...routeRows, ...checkoutRows, ...fuelRows];
  }, [checkouts, fuelLogs, routes, staffById, stops, vehicleById]);

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

  const generateTomorrowRoutes = useCallback(async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = tomorrow.toISOString().slice(0, 10);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch('/api/operations/routes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target_date: targetDate }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success !== true) {
        throw new Error(body?.detail || body?.title || 'Failed to generate tomorrow routes.');
      }

      const generatedCount = Array.isArray(body.data) ? body.data.length : 0;
      toast.success(`Generated ${generatedCount} route${generatedCount === 1 ? '' : 's'} for ${targetDate}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate tomorrow routes.');
    }
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

  const openCustomTaskModal = useCallback((stopId: string) => {
    setCustomTaskStopId(stopId);
    setCustomTaskDescription('');
    setCustomTaskEvidenceRequired(false);
    setCustomTaskOpen(true);
  }, []);

  const saveCustomTask = useCallback(async () => {
    if (!tenantId || !customTaskStopId) {
      toast.error('Select a stop before adding a one-off task.');
      return;
    }

    const description = customTaskDescription.trim();
    if (!description) {
      toast.error('Task description is required.');
      return;
    }

    const existingTasks = tasksByStopId.get(customTaskStopId) ?? [];
    const nextOrder = existingTasks.length > 0
      ? Math.max(...existingTasks.map((task) => task.task_order)) + 1
      : 1;

    setSavingCustomTask(true);
    const { error } = await supabase
      .from('route_stop_tasks')
      .insert({
        tenant_id: tenantId,
        route_stop_id: customTaskStopId,
        task_type: 'CUSTOM',
        description,
        task_order: nextOrder,
        evidence_required: customTaskEvidenceRequired,
        is_from_template: false,
      });
    setSavingCustomTask(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('One-off task added.');
    setCustomTaskOpen(false);
    await load();
  }, [customTaskDescription, customTaskEvidenceRequired, customTaskStopId, load, supabase, tasksByStopId, tenantId]);

  const openCheckoutModal = useCallback((vehicleId: string) => {
    setFleetMode('checkout');
    setFleetVehicleId(vehicleId);
    setFleetCheckoutId('');
    setFleetRouteId(selectedRouteId);
    setFleetStaffId(newRouteOwnerStaffId || '');
    setFleetOdometer('');
    setFleetFuelLevel('HALF');
    setFleetFuelGallons('');
    setFleetFuelCost('');
    setFleetStation('');
    setFleetNotes('');
    setDvirChecklist({
      brakes_ok: true,
      lights_ok: true,
      tires_ok: true,
      fluids_ok: true,
      mirrors_ok: true,
      warning_lights_ok: true,
    });
    setFleetModalOpen(true);
  }, [newRouteOwnerStaffId, selectedRouteId]);

  const openReturnModal = useCallback((checkout: VehicleCheckoutRow) => {
    setFleetMode('return');
    setFleetVehicleId(checkout.vehicle_id);
    setFleetCheckoutId(checkout.id);
    setFleetRouteId(checkout.route_id ?? selectedRouteId);
    setFleetStaffId(checkout.staff_id ?? newRouteOwnerStaffId ?? '');
    setFleetOdometer(checkout.return_odometer != null ? String(checkout.return_odometer) : '');
    setFleetFuelLevel(checkout.fuel_level_in ?? 'HALF');
    setFleetFuelGallons('');
    setFleetFuelCost('');
    setFleetStation('');
    setFleetNotes(checkout.return_notes ?? '');
    setDvirChecklist({
      brakes_ok: true,
      lights_ok: true,
      tires_ok: true,
      fluids_ok: true,
      mirrors_ok: true,
      warning_lights_ok: true,
    });
    setFleetModalOpen(true);
  }, [newRouteOwnerStaffId, selectedRouteId]);

  const submitFleetWorkflow = useCallback(async () => {
    if (!tenantId || !fleetVehicleId) {
      toast.error('Select a vehicle first.');
      return;
    }
    if (!fleetStaffId) {
      toast.error('Staff member is required.');
      return;
    }
    if (!fleetOdometer || Number(fleetOdometer) < 0) {
      toast.error('Valid odometer reading is required.');
      return;
    }

    setFleetSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const payload = {
        mode: fleetMode,
        vehicleId: fleetVehicleId,
        checkoutId: fleetMode === 'return' ? fleetCheckoutId : null,
        routeId: fleetRouteId || null,
        staffId: fleetStaffId,
        odometer: Number(fleetOdometer),
        fuelLevel: fleetFuelLevel,
        notes: fleetNotes || null,
        checklist: dvirChecklist,
        fuelGallons: fleetFuelGallons ? Number(fleetFuelGallons) : null,
        fuelCost: fleetFuelCost ? Number(fleetFuelCost) : null,
        stationName: fleetStation || null,
      };
      if (fleetMode === 'return' && !fleetCheckoutId) {
        throw new Error('Active checkout is required for return workflow.');
      }

      const queuedResult = await executeWithOfflineQueue({
        url: '/api/operations/fleet/workflow',
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: payload,
      });

      if (queuedResult.queued) {
        toast.info('Fleet workflow queued for sync once online.');
        setFleetModalOpen(false);
        return;
      }

      const response = queuedResult.response as Response;
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success !== true) {
        throw new Error(responsePayload?.detail || responsePayload?.error || 'Fleet workflow failed.');
      }

      toast.success(fleetMode === 'checkout' ? 'Vehicle checked out with DVIR.' : 'Vehicle return logged with DVIR and fuel data.');

      setFleetModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fleet workflow failed.');
    } finally {
      setFleetSaving(false);
    }
  }, [
    dvirChecklist,
    fleetCheckoutId,
    fleetFuelCost,
    fleetFuelGallons,
    fleetFuelLevel,
    fleetMode,
    fleetNotes,
    fleetOdometer,
    fleetRouteId,
    fleetStaffId,
    fleetStation,
    fleetVehicleId,
    load,
    supabase,
    tenantId,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" onClick={generateTomorrowRoutes}>
          <CalendarPlus className="h-4 w-4" />
          Generate Tomorrow&apos;s Routes
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
          Print PDF
        </Button>
        <ExportButton<Record<string, unknown>> data={exportRows as unknown as Record<string, unknown>[]} filename="operations-routes-fleet" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Routes Today</p><p className="text-xl font-semibold">{routeKpis.todayRoutes}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Published Routes</p><p className="text-xl font-semibold">{routeKpis.publishedRoutes}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Stops Planned</p><p className="text-xl font-semibold">{routeKpis.totalStops}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Locked Stops</p><p className="text-xl font-semibold text-warning">{routeKpis.lockedStops}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Fleet Ready</p><p className="text-xl font-semibold text-green-600">{fleetKpis.readyVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Checked Out</p><p className="text-xl font-semibold text-blue-600">{fleetKpis.outVehicles}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Overdue Returns</p><p className="text-xl font-semibold text-red-600">{fleetKpis.overdueCheckouts}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Maintenance Due</p><p className="text-xl font-semibold text-warning">{fleetKpis.maintenanceDue}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">DVIR Needs Review</p><p className="text-xl font-semibold text-warning">{fleetKpis.dvirDue}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Fuel Logs (24h)</p><p className="text-xl font-semibold text-blue-600">{fleetKpis.recentFuelLogs}</p></CardContent></Card>
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
                          {job.job_code} · {site?.name ?? 'Unknown Site'}
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
                      const stopTasks = tasksByStopId.get(stop.id) ?? [];
                      const customTasks = stopTasks.filter((task) => !task.is_from_template);
                      return (
                        <div key={stop.id} className="rounded-md border border-border px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">Stop {stop.stop_order}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openCustomTaskModal(stop.id)}
                              >
                                <ClipboardPlus className="h-3.5 w-3.5" />
                                Add One-Off Task
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => toggleStopLock(stop.id, !stop.is_locked)}
                              >
                                <Lock className="h-3.5 w-3.5" />
                                {stop.is_locked ? 'Unlock' : 'Lock'}
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-foreground">
                            {job ? (
                              <EntityLink
                                entityType="job"
                                code={job.job_code}
                                name={job.job_code}
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
                            <span>{job?.start_date ? new Date(`${job.start_date}T00:00:00`).toLocaleDateString() : 'No date'}</span>
                            <span>{stopTasks.length} task{stopTasks.length === 1 ? '' : 's'}</span>
                          </div>
                          {customTasks.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {customTasks.map((task) => (
                                <div key={task.id} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                                  One-off: {task.description}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-md border border-border print:border-0 print:shadow-none">
                  <button
                    type="button"
                    onClick={() => setLoadSheetOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PackageSearch className="h-4 w-4 text-primary" />
                      Load Sheet Preview
                    </span>
                    {loadSheetOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {loadSheetOpen ? (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      {loadSheetLoading ? (
                        <p className="text-sm text-muted-foreground">Loading load sheet...</p>
                      ) : !loadSheet || loadSheet.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No delivery tasks on this route.</p>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {loadSheet.items.map((item) => {
                              const key = `${item.supply_id}:${item.direction}`;
                              const isExpanded = !!expandedLoadItems[key];

                              return (
                                <div key={key} className="rounded-md border border-border bg-background px-2 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleLoadItem(key)}
                                    className="flex w-full items-center justify-between gap-2 text-left"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {item.total_quantity} {item.unit ?? ''} {item.supply_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{item.direction === 'pickup' ? 'Pickup' : 'Deliver'}</p>
                                    </div>
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  </button>

                                  {isExpanded ? (
                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                      {item.site_breakdown.map((site, index) => (
                                        <p key={`${key}:${site.stop_order}:${index}`}>
                                          Stop {site.stop_order}: {site.site_name} ({site.quantity})
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>

                          {loadSheet.special_items.length > 0 ? (
                            <div className="rounded-md border border-border bg-background px-2 py-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Special items</p>
                              <div className="mt-1 space-y-1">
                                {loadSheet.special_items.map((item, index) => (
                                  <p key={`${item.for_stop}:${index}`} className="text-xs text-foreground">
                                    Stop {item.for_stop}: {item.site_name} — {item.description}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
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
                const checkout = checkouts.find((entry) => entry.vehicle_id === vehicle.id && entry.status === 'OUT') ?? null;
                const latestDvir = dvirLogs.find((entry) => entry.vehicle_id === vehicle.id) ?? null;
                const latestFuel = fuelLogs.find((entry) => entry.vehicle_id === vehicle.id) ?? null;
                const isOverdue = checkout
                  ? ((Date.now() - new Date(checkout.checked_out_at).getTime()) / 1000 / 60 / 60) >= 12
                  : false;

                return (
                  <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
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
                      <p className="text-xs text-muted-foreground">
                        {checkout?.checkout_odometer != null
                          ? `Odometer out: ${checkout.checkout_odometer.toLocaleString()}`
                          : latestDvir?.odometer != null
                            ? `Latest odometer: ${latestDvir.odometer.toLocaleString()}`
                            : 'Odometer not logged'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {latestFuel
                          ? `Fuel log: ${latestFuel.gallons.toFixed(1)} gal on ${new Date(latestFuel.fueled_at).toLocaleDateString()}`
                          : 'No recent fuel log'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={vehicle.status === 'ACTIVE' ? 'green' : vehicle.status === 'IN_SHOP' ? 'yellow' : 'gray'}>{vehicle.status}</Badge>
                      {checkout ? <Badge color={isOverdue ? 'red' : 'blue'}>{isOverdue ? 'OVERDUE' : 'OUT'}</Badge> : <Badge color="green">READY</Badge>}
                      {checkout?.dvir_out_status ? (
                        <Badge color={checkout.dvir_out_status === 'PASS' ? 'green' : checkout.dvir_out_status === 'FAIL' ? 'red' : 'yellow'}>
                          DVIR {checkout.dvir_out_status}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {checkout ? (
                        <Button size="sm" variant="secondary" onClick={() => openReturnModal(checkout)}>
                          Return + DVIR
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => openCheckoutModal(vehicle.id)}>
                          Check Out + DVIR
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SlideOver
        open={customTaskOpen}
        onClose={() => setCustomTaskOpen(false)}
        title="Add One-Off Task"
        subtitle={customTaskStopId ? `Stop ${stops.find((stop) => stop.id === customTaskStopId)?.stop_order ?? ''}` : undefined}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add an ad-hoc custom task to this stop without changing the underlying template.
          </p>
          <Textarea
            label="Task Description"
            value={customTaskDescription}
            onChange={(event) => setCustomTaskDescription(event.target.value)}
            rows={4}
            required
          />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photo Evidence Required</label>
            <select
              value={customTaskEvidenceRequired ? 'yes' : 'no'}
              onChange={(event) => setCustomTaskEvidenceRequired(event.target.value === 'yes')}
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setCustomTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomTask} disabled={savingCustomTask}>
              {savingCustomTask ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </div>
      </SlideOver>

      <SlideOver
        open={fleetModalOpen}
        onClose={() => setFleetModalOpen(false)}
        title={fleetMode === 'checkout' ? 'Vehicle Checkout + DVIR' : 'Vehicle Return + DVIR'}
        subtitle={fleetVehicleId ? (vehicles.find((vehicle) => vehicle.id === fleetVehicleId)?.vehicle_code ?? undefined) : undefined}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Route</label>
              <select
                value={fleetRouteId}
                onChange={(event) => setFleetRouteId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="">No route linked</option>
                {routes.slice(0, 150).map((route) => (
                  <option key={route.id} value={route.id}>
                    {new Date(`${route.route_date}T00:00:00`).toLocaleDateString()} · {labelRouteType(route.route_type)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</label>
              <select
                value={fleetStaffId}
                onChange={(event) => setFleetStaffId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="">Select staff...</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {(person.full_name ?? person.staff_code)} ({person.staff_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Odometer</label>
              <input
                type="number"
                min={0}
                value={fleetOdometer}
                onChange={(event) => setFleetOdometer(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                placeholder="Miles"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fuel Level</label>
              <select
                value={fleetFuelLevel}
                onChange={(event) => setFleetFuelLevel(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="EMPTY">Empty</option>
                <option value="QUARTER">1/4</option>
                <option value="HALF">1/2</option>
                <option value="THREE_QUARTER">3/4</option>
                <option value="FULL">Full</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              DVIR Checklist
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(dvirChecklist).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(event) => setDvirChecklist((prev) => ({ ...prev, [key]: event.target.checked }))}
                    className="rounded border-border"
                  />
                  {key.replace(/_/g, ' ').replace(/\\b\\w/g, (char) => char.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          {fleetMode === 'return' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fuel Gallons</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={fleetFuelGallons}
                  onChange={(event) => setFleetFuelGallons(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fuel Cost</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={fleetFuelCost}
                  onChange={(event) => setFleetFuelCost(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Station</label>
                <input
                  type="text"
                  value={fleetStation}
                  onChange={(event) => setFleetStation(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          ) : null}

          <Textarea
            label="Notes"
            value={fleetNotes}
            onChange={(event) => setFleetNotes(event.target.value)}
            placeholder="Condition notes, exceptions, issues found, or return remarks"
          />

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5" />
              This workflow records odometer readings, DVIR status, and optional fuel logs tied to vehicle and route.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setFleetModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitFleetWorkflow()} loading={fleetSaving}>
              {fleetMode === 'checkout' ? 'Complete Checkout' : 'Complete Return'}
            </Button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
