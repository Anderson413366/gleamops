import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_002, SYS_002, createProblemDetails, isFeatureEnabled } from '@gleamops/shared';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  canManageShiftsTimeCoverage,
  canManageShiftsTimePayroll,
  canOperateShiftsTimeRouteExecution,
  canReportShiftsTimeCallout,
  canRespondShiftsTimeCoverage,
} from './shifts-time.permissions';
import {
  rpcAcceptCoverage,
  rpcCaptureTravelSegment,
  rpcFinalizePayrollExport,
  rpcGeneratePayrollPreview,
  rpcOfferCoverage,
  rpcReportCallout,
  rpcRouteCompleteStop,
  rpcRouteStartStop,
} from './shifts-time.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

function featureDisabled(instance: string, detail: string) {
  return createProblemDetails('SHIFT_001', 'Feature disabled', 404, detail, instance);
}

function isRouteExecutionEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_route_execution');
}

function isCalloutEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_callout_automation');
}

function isPayrollEnabled() {
  return isFeatureEnabled('shifts_time_v1') && isFeatureEnabled('shifts_time_payroll_export_v1');
}

export async function startRouteStopRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  note: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcRouteStartStop(userDb, { route_stop_id: stopId, note });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function completeRouteStopRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  stopId: string,
  note: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcRouteCompleteStop(userDb, { route_stop_id: stopId, note });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function captureTravelSegmentRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    travel_end_at?: string;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isRouteExecutionEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time route execution is not enabled.') };
  }
  if (!canOperateShiftsTimeRouteExecution(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcCaptureTravelSegment(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function reportCalloutRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    affected_staff_id: string;
    reason: string;
    route_id?: string | null;
    route_stop_id?: string | null;
    work_ticket_id?: string | null;
    site_id?: string | null;
    resolution_note?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canReportShiftsTimeCallout(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcReportCallout(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function offerCoverageRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    callout_event_id: string;
    candidate_staff_id: string;
    expires_in_minutes?: number;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canManageShiftsTimeCoverage(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcOfferCoverage(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function acceptCoverageRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  offerId: string,
  responseNote: string | null,
  apiPath: string,
): Promise<ServiceResult> {
  if (!isCalloutEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time call-out automation is not enabled.') };
  }
  if (!canRespondShiftsTimeCoverage(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcAcceptCoverage(userDb, {
    offer_id: offerId,
    response_note: responseNote,
  });
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}

export async function previewPayrollExportRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    mapping_id: string;
    period_start: string;
    period_end: string;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isPayrollEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time payroll export is not enabled.') };
  }
  if (!canManageShiftsTimePayroll(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcGeneratePayrollPreview(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data, status: 201 };
}

export async function finalizePayrollExportRpc(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: {
    run_id: string;
    exported_file_path?: string | null;
    exported_file_checksum?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!isPayrollEnabled()) {
    return { success: false, error: featureDisabled(apiPath, 'Shifts & Time payroll export is not enabled.') };
  }
  if (!canManageShiftsTimePayroll(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await rpcFinalizePayrollExport(userDb, payload);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data };
}
