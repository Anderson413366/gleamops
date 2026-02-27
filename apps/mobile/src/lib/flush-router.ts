/**
 * Pure flush routing table — maps mutation types to API paths and body builders.
 * No React Native or Supabase dependencies, fully testable in Node.js.
 */
import { buildTravelCaptureBody, TRAVEL_CAPTURE_API_PATH } from './travel-capture-contract';

export interface FlushRoute {
  apiPath: string;
  body: Record<string, unknown>;
}

/**
 * Given a mutation record, return the API path and body to POST.
 * Returns null if this mutation type doesn't use the HTTP API
 * (e.g., direct Supabase writes like checklist_toggle).
 */
export function resolveFlushRoute(mutation: Record<string, unknown>): FlushRoute | null {
  const type = mutation.type as string;

  if (type === 'route_travel_capture') {
    return {
      apiPath: TRAVEL_CAPTURE_API_PATH,
      body: buildTravelCaptureBody({
        routeId: mutation.routeId as string,
        fromStopId: mutation.fromStopId as string,
        toStopId: mutation.toStopId as string,
      }),
    };
  }

  if (type === 'route_start_shift') {
    return {
      apiPath: `/api/operations/routes/${mutation.routeId}/start-shift`,
      body: {
        mileage_start: mutation.mileageStart,
        vehicle_id: mutation.vehicleId,
        key_box_number: mutation.keyBoxNumber,
      },
    };
  }

  if (type === 'route_arrive_stop') {
    return { apiPath: `/api/operations/routes/stops/${mutation.stopId}/arrive`, body: {} };
  }

  if (type === 'route_complete_stop') {
    return { apiPath: `/api/operations/routes/stops/${mutation.stopId}/complete`, body: {} };
  }

  if (type === 'route_skip_stop') {
    return {
      apiPath: `/api/operations/routes/stops/${mutation.stopId}/skip`,
      body: { skip_reason: mutation.skipReason, skip_notes: mutation.skipNotes },
    };
  }

  if (type === 'route_complete_task') {
    return {
      apiPath: `/api/operations/routes/stops/tasks/${mutation.taskId}/complete`,
      body: { notes: mutation.notes },
    };
  }

  if (type === 'route_task_photo') {
    return {
      apiPath: `/api/operations/routes/stops/tasks/${mutation.taskId}/photo`,
      body: { photo_url: mutation.photoUrl },
    };
  }

  if (type === 'route_end_shift') {
    return {
      apiPath: `/api/operations/routes/${mutation.routeId}/end-shift`,
      body: {
        mileage_end: mutation.mileageEnd,
        vehicle_cleaned: mutation.vehicleCleaned,
        personal_items_removed: mutation.personalItemsRemoved,
        floater_notes: mutation.floaterNotes,
      },
    };
  }

  if (type === 'field_report_create') {
    return {
      apiPath: '/api/operations/field-reports',
      body: {
        report_type: mutation.reportType,
        site_id: mutation.siteId,
        description: mutation.description,
        priority: mutation.priority,
        photos: mutation.photos,
        requested_items: mutation.requestedItems,
        requested_date: mutation.requestedDate,
      },
    };
  }

  // Direct Supabase write types (checklist_toggle, time_event, etc.) don't use HTTP API
  return null;
}
