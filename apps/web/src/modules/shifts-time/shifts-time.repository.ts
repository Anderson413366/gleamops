import type { SupabaseClient } from '@supabase/supabase-js';

export async function rpcRouteStartStop(
  db: SupabaseClient,
  payload: { route_stop_id: string; note?: string | null },
) {
  return db.rpc('fn_route_start_stop', {
    p_route_stop_id: payload.route_stop_id,
    p_note: payload.note ?? null,
  });
}

export async function rpcRouteCompleteStop(
  db: SupabaseClient,
  payload: { route_stop_id: string; note?: string | null },
) {
  return db.rpc('fn_route_complete_stop', {
    p_route_stop_id: payload.route_stop_id,
    p_note: payload.note ?? null,
  });
}

export async function rpcCaptureTravelSegment(
  db: SupabaseClient,
  payload: {
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    travel_end_at?: string;
  },
) {
  return db.rpc('fn_auto_capture_travel_segment', {
    p_route_id: payload.route_id,
    p_from_stop_id: payload.from_stop_id,
    p_to_stop_id: payload.to_stop_id,
    p_travel_end_at: payload.travel_end_at ?? null,
  });
}

export async function rpcReportCallout(
  db: SupabaseClient,
  payload: {
    affected_staff_id: string;
    reason: string;
    route_id?: string | null;
    route_stop_id?: string | null;
    work_ticket_id?: string | null;
    site_id?: string | null;
    resolution_note?: string | null;
  },
) {
  return db.rpc('fn_report_callout', {
    p_affected_staff_id: payload.affected_staff_id,
    p_reason: payload.reason,
    p_route_id: payload.route_id ?? null,
    p_route_stop_id: payload.route_stop_id ?? null,
    p_work_ticket_id: payload.work_ticket_id ?? null,
    p_site_id: payload.site_id ?? null,
    p_resolution_note: payload.resolution_note ?? null,
  });
}

export async function rpcOfferCoverage(
  db: SupabaseClient,
  payload: {
    callout_event_id: string;
    candidate_staff_id: string;
    expires_in_minutes?: number;
  },
) {
  return db.rpc('fn_offer_coverage', {
    p_callout_event_id: payload.callout_event_id,
    p_candidate_staff_id: payload.candidate_staff_id,
    p_expires_in_minutes: payload.expires_in_minutes ?? 30,
  });
}

export async function rpcAcceptCoverage(
  db: SupabaseClient,
  payload: {
    offer_id: string;
    response_note?: string | null;
  },
) {
  return db.rpc('fn_accept_coverage', {
    p_offer_id: payload.offer_id,
    p_response_note: payload.response_note ?? null,
  });
}

export async function rpcGeneratePayrollPreview(
  db: SupabaseClient,
  payload: { mapping_id: string; period_start: string; period_end: string },
) {
  return db.rpc('fn_generate_payroll_export_preview', {
    p_mapping_id: payload.mapping_id,
    p_period_start: payload.period_start,
    p_period_end: payload.period_end,
  });
}

export async function rpcFinalizePayrollExport(
  db: SupabaseClient,
  payload: {
    run_id: string;
    exported_file_path?: string | null;
    exported_file_checksum?: string | null;
  },
) {
  return db.rpc('fn_finalize_payroll_export', {
    p_run_id: payload.run_id,
    p_exported_file_path: payload.exported_file_path ?? null,
    p_exported_file_checksum: payload.exported_file_checksum ?? null,
  });
}
