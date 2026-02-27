/**
 * Pure functions for the mobile → web travel capture contract.
 * Isolated from React Native dependencies for testability.
 */

export const TRAVEL_CAPTURE_API_PATH = '/api/operations/shifts-time/travel/capture';

export function buildTravelCaptureBody(m: { routeId: string; fromStopId: string; toStopId: string }) {
  return {
    route_id: m.routeId,
    from_stop_id: m.fromStopId,
    to_stop_id: m.toStopId,
  };
}
