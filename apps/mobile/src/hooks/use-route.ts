import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RouteRecord, RouteStop, RouteStopTask } from '@gleamops/shared';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

export const ROUTE_QUERY_PREFIX = ['route', 'today'] as const;

export interface RouteVehicleSnapshot {
  id: string;
  vehicle_code: string | null;
  name: string | null;
}

export interface RouteTemplateSnapshot {
  id: string;
  label: string;
  default_key_box: string | null;
  default_vehicle_id: string | null;
  default_vehicle: RouteVehicleSnapshot | null;
}

export interface RouteSiteSnapshot {
  id: string;
  site_code: string;
  name: string;
  address: Record<string, string> | null;
  entry_instructions: string | null;
  access_notes: string | null;
}

export interface RouteStopWithSite extends RouteStop {
  site_job: {
    id: string;
    job_code: string | null;
    site: RouteSiteSnapshot | null;
  } | null;
  tasks: RouteStopTask[];
}

export interface RouteBundle {
  route: RouteRecord & {
    template: RouteTemplateSnapshot | null;
  };
  stops: RouteStopWithSite[];
  tasks: RouteStopTask[];
}

export function updateCachedRoutes(
  queryClient: QueryClient,
  updater: (current: RouteBundle) => RouteBundle,
) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ROUTE_QUERY_PREFIX });
  for (const query of queries) {
    queryClient.setQueryData<RouteBundle | null>(query.queryKey, (current) => {
      if (!current) return current;
      return updater(current);
    });
  }
}

export function getCachedRouteBundle(queryClient: QueryClient, routeId: string): RouteBundle | null {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ROUTE_QUERY_PREFIX });
  for (const query of queries) {
    const value = queryClient.getQueryData<RouteBundle | null>(query.queryKey);
    if (value?.route.id === routeId) {
      return value;
    }
  }
  return null;
}

interface StaffSelf {
  id: string;
  full_name: string;
}

export function useRoute(date: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const staffQuery = useQuery<StaffSelf | null>({
    queryKey: ['staff-self', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const staffId = staffQuery.data?.id ?? null;

  const routeQuery = useQuery<RouteBundle | null>({
    queryKey: [...ROUTE_QUERY_PREFIX, date, staffId],
    queryFn: async () => {
      if (!staffId) return null;

      const { data: routeRow, error: routeError } = await supabase
        .from('routes')
        .select(`
          id,
          tenant_id,
          route_date,
          route_owner_staff_id,
          route_type,
          status,
          template_id,
          mileage_start,
          mileage_end,
          key_box_number,
          vehicle_cleaned,
          personal_items_removed,
          shift_started_at,
          shift_ended_at,
          shift_summary,
          shift_review_status,
          reviewed_by,
          reviewed_at,
          reviewer_notes,
          template:template_id(
            id,
            label,
            default_key_box,
            default_vehicle_id,
            default_vehicle:default_vehicle_id(id, vehicle_code, name)
          )
        `)
        .eq('route_date', date)
        .eq('route_owner_staff_id', staffId)
        .is('archived_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (routeError) throw routeError;
      if (!routeRow) return null;

      const { data: stopRows, error: stopError } = await supabase
        .from('route_stops')
        .select(`
          id,
          tenant_id,
          route_id,
          site_job_id,
          stop_order,
          estimated_travel_minutes,
          is_locked,
          arrived_at,
          departed_at,
          stop_status,
          skip_reason,
          skip_notes,
          access_window_start,
          access_window_end,
          site_job:site_job_id(
            id,
            job_code,
            site:site_id(
              id,
              site_code,
              name,
              address,
              entry_instructions,
              access_notes
            )
          )
        `)
        .eq('route_id', routeRow.id)
        .is('archived_at', null)
        .order('stop_order', { ascending: true });

      if (stopError) throw stopError;

      const stops = ((stopRows ?? []) as unknown as Omit<RouteStopWithSite, 'tasks'>[]);
      const stopIds = stops.map((stop) => stop.id);

      let tasks: RouteStopTask[] = [];
      if (stopIds.length > 0) {
        const { data: taskRows, error: taskError } = await supabase
          .from('route_stop_tasks')
          .select(`
            id,
            tenant_id,
            route_stop_id,
            task_type,
            description,
            task_order,
            is_completed,
            completed_at,
            completed_by,
            evidence_required,
            evidence_photos,
            notes,
            delivery_items,
            is_from_template,
            source_complaint_id,
            created_at,
            updated_at,
            archived_at,
            version_etag
          `)
          .in('route_stop_id', stopIds)
          .is('archived_at', null)
          .order('task_order', { ascending: true });

        if (taskError) throw taskError;
        tasks = (taskRows ?? []) as RouteStopTask[];
      }

      const taskMap = new Map<string, RouteStopTask[]>();
      for (const task of tasks) {
        const list = taskMap.get(task.route_stop_id) ?? [];
        list.push(task);
        taskMap.set(task.route_stop_id, list);
      }

      const stopsWithTasks: RouteStopWithSite[] = stops.map((stop) => ({
        ...stop,
        tasks: taskMap.get(stop.id) ?? [],
      }));

      return {
        route: routeRow as unknown as RouteBundle['route'],
        stops: stopsWithTasks,
        tasks,
      };
    },
    enabled: !!staffId,
  });

  const setRouteOptimistic = useCallback(
    (updater: (route: RouteBundle['route']) => RouteBundle['route']) => {
      if (!staffId) return;
      queryClient.setQueryData<RouteBundle | null>([...ROUTE_QUERY_PREFIX, date, staffId], (current) => {
        if (!current) return current;
        return {
          ...current,
          route: updater(current.route),
        };
      });
    },
    [date, queryClient, staffId],
  );

  const setStopOptimistic = useCallback(
    (stopId: string, updater: (stop: RouteStopWithSite) => RouteStopWithSite) => {
      if (!staffId) return;
      queryClient.setQueryData<RouteBundle | null>([...ROUTE_QUERY_PREFIX, date, staffId], (current) => {
        if (!current) return current;
        return {
          ...current,
          stops: current.stops.map((stop) => (stop.id === stopId ? updater(stop) : stop)),
        };
      });
    },
    [date, queryClient, staffId],
  );

  const setTaskOptimistic = useCallback(
    (taskId: string, updater: (task: RouteStopTask) => RouteStopTask) => {
      if (!staffId) return;
      queryClient.setQueryData<RouteBundle | null>([...ROUTE_QUERY_PREFIX, date, staffId], (current) => {
        if (!current) return current;

        const nextTasks = current.tasks.map((task) => (task.id === taskId ? updater(task) : task));
        const taskMap = new Map<string, RouteStopTask[]>();
        for (const task of nextTasks) {
          const list = taskMap.get(task.route_stop_id) ?? [];
          list.push(task);
          taskMap.set(task.route_stop_id, list);
        }

        return {
          ...current,
          tasks: nextTasks,
          stops: current.stops.map((stop) => ({
            ...stop,
            tasks: taskMap.get(stop.id) ?? [],
          })),
        };
      });
    },
    [date, queryClient, staffId],
  );

  const routeBundle = routeQuery.data;
  const stops = routeBundle?.stops ?? [];
  const tasks = routeBundle?.tasks ?? [];
  const completedStops = stops.filter((stop) => stop.stop_status === 'COMPLETED' || stop.stop_status === 'SKIPPED').length;
  const nextStop = stops.find((stop) => stop.stop_status === 'PENDING' || stop.stop_status === 'ARRIVED') ?? null;

  return {
    route: routeBundle?.route ?? null,
    stops,
    tasks,
    nextStop,
    progress: {
      done: completedStops,
      total: stops.length,
    },
    staffId,
    staffName: staffQuery.data?.full_name ?? '',
    loading: staffQuery.isLoading || routeQuery.isLoading,
    refreshing: routeQuery.isFetching && !routeQuery.isLoading,
    isOffline: routeQuery.isError && !!routeQuery.data,
    refetch: routeQuery.refetch,
    setRouteOptimistic,
    setStopOptimistic,
    setTaskOptimistic,
  };
}
