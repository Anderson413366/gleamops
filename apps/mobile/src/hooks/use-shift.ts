import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SkipReason } from '@gleamops/shared';
import { enqueue } from '../lib/mutation-queue';
import { syncNow } from './use-sync';
import { getCachedRouteBundle, updateCachedRoutes } from './use-route';

interface StartShiftInput {
  mileageStart: number;
  vehicleId: string;
  keyBoxNumber: string | null;
}

interface EndShiftInput {
  mileageEnd: number;
  vehicleCleaned: boolean;
  personalItemsRemoved: boolean;
  floaterNotes: string | null;
}

interface SkipStopInput {
  skipReason: SkipReason;
  skipNotes: string | null;
}

interface CompleteTaskInput {
  notes?: string | null;
}

function computeShiftSummary(routeId: string, queryClient: ReturnType<typeof useQueryClient>, floaterNotes: string | null) {
  const snapshot = getCachedRouteBundle(queryClient, routeId);
  if (!snapshot) return null;

  const stopsCompleted = snapshot.stops.filter((stop) => stop.stop_status === 'COMPLETED').length;
  const stopsSkipped = snapshot.stops.filter((stop) => stop.stop_status === 'SKIPPED').length;
  const photosUploaded = snapshot.tasks.reduce(
    (sum, task) => sum + (Array.isArray(task.evidence_photos) ? task.evidence_photos.length : 0),
    0,
  );
  const mileageDriven =
    snapshot.route.mileage_start != null
      ? Math.max(0, (snapshot.route.mileage_end ?? snapshot.route.mileage_start) - snapshot.route.mileage_start)
      : null;

  return {
    stops_completed: stopsCompleted,
    stops_skipped: stopsSkipped,
    stops_total: snapshot.stops.length,
    issues_reported: 0,
    photos_uploaded: photosUploaded,
    mileage_driven: mileageDriven,
    floater_notes: floaterNotes,
    complaints_addressed: 0,
  };
}

export function useShift(routeId: string | null) {
  const queryClient = useQueryClient();

  const queueAndSync = useCallback(async (payload: Parameters<typeof enqueue>[0]) => {
    await enqueue(payload);
    void syncNow();
  }, []);

  const startShift = useCallback(
    async (input: StartShiftInput) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_start_shift',
        routeId,
        mileageStart: input.mileageStart,
        vehicleId: input.vehicleId,
        keyBoxNumber: input.keyBoxNumber,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;
        return {
          ...current,
          route: {
            ...current.route,
            mileage_start: input.mileageStart,
            key_box_number: input.keyBoxNumber,
            shift_started_at: now,
          },
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const arriveAtStop = useCallback(
    async (stopId: string) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_arrive_stop',
        stopId,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;
        return {
          ...current,
          stops: current.stops.map((stop) =>
            stop.id === stopId
              ? {
                  ...stop,
                  stop_status: 'ARRIVED',
                  arrived_at: stop.arrived_at ?? now,
                }
              : stop,
          ),
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const completeTask = useCallback(
    async (taskId: string, input?: CompleteTaskInput) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_complete_task',
        taskId,
        notes: input?.notes ?? null,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;

        const nextTasks = current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                is_completed: true,
                completed_at: now,
                notes: input?.notes ?? task.notes,
              }
            : task,
        );

        const tasksByStop = new Map<string, typeof nextTasks>();
        for (const task of nextTasks) {
          const list = tasksByStop.get(task.route_stop_id) ?? [];
          list.push(task);
          tasksByStop.set(task.route_stop_id, list);
        }

        return {
          ...current,
          tasks: nextTasks,
          stops: current.stops.map((stop) => ({
            ...stop,
            tasks: tasksByStop.get(stop.id) ?? [],
          })),
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const addTaskPhoto = useCallback(
    async (taskId: string, photoUrl: string) => {
      if (!routeId) return;

      await queueAndSync({
        type: 'route_task_photo',
        taskId,
        photoUrl,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;

        const nextTasks = current.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const existing = Array.isArray(task.evidence_photos) ? task.evidence_photos : [];
          if (existing.includes(photoUrl)) return task;
          return {
            ...task,
            evidence_photos: [...existing, photoUrl],
          };
        });

        const tasksByStop = new Map<string, typeof nextTasks>();
        for (const task of nextTasks) {
          const list = tasksByStop.get(task.route_stop_id) ?? [];
          list.push(task);
          tasksByStop.set(task.route_stop_id, list);
        }

        return {
          ...current,
          tasks: nextTasks,
          stops: current.stops.map((stop) => ({
            ...stop,
            tasks: tasksByStop.get(stop.id) ?? [],
          })),
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const completeStop = useCallback(
    async (stopId: string) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_complete_stop',
        stopId,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;
        return {
          ...current,
          stops: current.stops.map((stop) =>
            stop.id === stopId
              ? {
                  ...stop,
                  stop_status: 'COMPLETED',
                  departed_at: now,
                }
              : stop,
          ),
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const skipStop = useCallback(
    async (stopId: string, input: SkipStopInput) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_skip_stop',
        stopId,
        skipReason: input.skipReason,
        skipNotes: input.skipNotes,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;
        return {
          ...current,
          stops: current.stops.map((stop) =>
            stop.id === stopId
              ? {
                  ...stop,
                  stop_status: 'SKIPPED',
                  skip_reason: input.skipReason,
                  skip_notes: input.skipNotes,
                  departed_at: now,
                }
              : stop,
          ),
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  const captureTravel = useCallback(
    async (fromStopId: string, toStopId: string) => {
      if (!routeId) return;

      await queueAndSync({
        type: 'route_travel_capture',
        routeId,
        fromStopId,
        toStopId,
      });
    },
    [queueAndSync, routeId],
  );

  const endShift = useCallback(
    async (input: EndShiftInput) => {
      if (!routeId) return;

      const now = new Date().toISOString();
      await queueAndSync({
        type: 'route_end_shift',
        routeId,
        mileageEnd: input.mileageEnd,
        vehicleCleaned: input.vehicleCleaned,
        personalItemsRemoved: input.personalItemsRemoved,
        floaterNotes: input.floaterNotes,
      });

      updateCachedRoutes(queryClient, (current) => {
        if (current.route.id !== routeId) return current;

        return {
          ...current,
          route: {
            ...current.route,
            status: 'COMPLETED',
            mileage_end: input.mileageEnd,
            vehicle_cleaned: input.vehicleCleaned,
            personal_items_removed: input.personalItemsRemoved,
            shift_ended_at: now,
            shift_summary: computeShiftSummary(routeId, queryClient, input.floaterNotes),
          },
        };
      });
    },
    [queryClient, queueAndSync, routeId],
  );

  return {
    startShift,
    arriveAtStop,
    completeTask,
    addTaskPhoto,
    completeStop,
    skipStop,
    captureTravel,
    endShift,
  };
}
