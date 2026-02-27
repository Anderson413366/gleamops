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

export type ShiftsTimeRouteRow = {
  id: string;
  route_date: string;
  status: string;
  route_owner_staff_id: string | null;
  route_owner: {
    id: string;
    staff_code: string | null;
    full_name: string | null;
  } | Array<{
    id: string;
    staff_code: string | null;
    full_name: string | null;
  }> | null;
};

export type ShiftsTimeRouteStopRow = {
  id: string;
  route_id: string;
  work_ticket_id: string | null;
  stop_order: number;
  stop_status: string | null;
  status: string | null;
  planned_start_at: string | null;
  planned_end_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  site: {
    id: string;
    site_code: string | null;
    name: string | null;
  } | null;
  site_job: {
    id: string;
    job_code: string | null;
    site: {
      id: string;
      site_code: string | null;
      name: string | null;
    } | null;
  } | null;
};

export type ShiftsTimeAssignedTicketRow = {
  id: string;
  ticket_code: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  site: {
    id: string;
    site_code: string | null;
    name: string | null;
  } | Array<{
    id: string;
    site_code: string | null;
    name: string | null;
  }> | null;
  assignments: Array<{
    id: string;
    staff_id: string;
    assignment_status: string;
    staff: {
      id: string;
      staff_code: string | null;
      full_name: string | null;
    } | Array<{
      id: string;
      staff_code: string | null;
      full_name: string | null;
    }> | null;
  }>;
};

export type ShiftsTimeCalloutEventRow = {
  id: string;
  reason: string;
  status: string;
  reported_at: string;
  escalation_level: number | null;
  route_id: string | null;
  route_stop_id: string | null;
  affected_staff: {
    id: string;
    staff_code: string | null;
    full_name: string | null;
  } | Array<{
    id: string;
    staff_code: string | null;
    full_name: string | null;
  }> | null;
  reported_by_staff: {
    id: string;
    staff_code: string | null;
    full_name: string | null;
  } | Array<{
    id: string;
    staff_code: string | null;
    full_name: string | null;
  }> | null;
  covered_by_staff: {
    id: string;
    staff_code: string | null;
    full_name: string | null;
  } | Array<{
    id: string;
    staff_code: string | null;
    full_name: string | null;
  }> | null;
  site: {
    id: string;
    site_code: string | null;
    name: string | null;
  } | Array<{
    id: string;
    site_code: string | null;
    name: string | null;
  }> | null;
};

export type ShiftsTimeCoverageCandidateRow = {
  id: string;
  staff_code: string | null;
  full_name: string | null;
};

export type ShiftsTimePayrollMappingRow = {
  id: string;
  template_name: string;
  provider_code: string | null;
  delimiter: string;
  include_header: boolean;
  quote_all: boolean;
  decimal_separator: string;
  date_format: string;
  is_default: boolean;
  is_active: boolean;
};

export type ShiftsTimePayrollMappingFieldRow = {
  id: string;
  mapping_id: string;
  sort_order: number;
  output_column_name: string;
  source_field: string | null;
  static_value: string | null;
  transform_config: Record<string, unknown> | null;
  is_required: boolean;
  is_enabled: boolean;
};

export type ShiftsTimePayrollRunRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  exported_at: string | null;
  mapping: {
    id: string;
    template_name: string;
  } | Array<{
    id: string;
    template_name: string;
  }> | null;
};

export async function findStaffIdByUserId(
  db: SupabaseClient,
  userId: string,
) {
  return db
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle<{ id: string | null }>();
}

export async function listRoutesForDate(
  db: SupabaseClient,
  routeDate: string,
  routeOwnerStaffId?: string | null,
) {
  let query = db
    .from('routes')
    .select(`
      id,
      route_date,
      status,
      route_owner_staff_id,
      route_owner:route_owner_staff_id(id, staff_code, full_name)
    `)
    .eq('route_date', routeDate)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (routeOwnerStaffId) {
    query = query.eq('route_owner_staff_id', routeOwnerStaffId);
  }

  return query;
}

export async function listRouteStopsByRouteIds(
  db: SupabaseClient,
  routeIds: string[],
) {
  if (routeIds.length === 0) {
    return { data: [] as ShiftsTimeRouteStopRow[], error: null };
  }

  return db
    .from('route_stops')
    .select(`
      id,
      route_id,
      work_ticket_id,
      stop_order,
      stop_status,
      status,
      planned_start_at,
      planned_end_at,
      arrived_at,
      departed_at,
      site:site_id(id, site_code, name),
      site_job:site_job_id(id, job_code, site:site_id(id, site_code, name))
    `)
    .in('route_id', routeIds)
    .is('archived_at', null)
    .order('stop_order', { ascending: true })
    .limit(5000);
}

export async function listAssignedTicketsForDate(
  db: SupabaseClient,
  scheduledDate: string,
  staffId?: string | null,
) {
  let query = db
    .from('work_tickets')
    .select(`
      id,
      ticket_code,
      scheduled_date,
      start_time,
      end_time,
      status,
      site:site_id(id, site_code, name),
      assignments:ticket_assignments!inner(
        id,
        staff_id,
        assignment_status,
        staff:staff_id(id, staff_code, full_name)
      )
    `)
    .eq('scheduled_date', scheduledDate)
    .is('archived_at', null)
    .is('assignments.archived_at', null)
    .eq('assignments.assignment_status', 'ASSIGNED')
    .not('status', 'in', '(CANCELED,CANCELLED)')
    .order('start_time', { ascending: true })
    .limit(5000);

  if (staffId) {
    query = query.eq('assignments.staff_id', staffId);
  }

  return query;
}

export async function getWorkTicketForExecution(
  db: SupabaseClient,
  ticketId: string,
) {
  return db
    .from('work_tickets')
    .select('id, status')
    .eq('id', ticketId)
    .is('archived_at', null)
    .maybeSingle<{ id: string; status: string }>();
}

export async function isStaffAssignedToTicket(
  db: SupabaseClient,
  ticketId: string,
  staffId: string,
) {
  return db
    .from('ticket_assignments')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('staff_id', staffId)
    .eq('assignment_status', 'ASSIGNED')
    .is('archived_at', null)
    .maybeSingle<{ id: string }>();
}

export async function updateWorkTicketExecutionStatus(
  db: SupabaseClient,
  ticketId: string,
  status: string,
) {
  return db
    .from('work_tickets')
    .update({ status })
    .eq('id', ticketId)
    .select('id, status')
    .maybeSingle<{ id: string; status: string }>();
}

export async function listRecentCalloutEvents(
  db: SupabaseClient,
  limit: number,
  affectedStaffId?: string | null,
) {
  let query = db
    .from('callout_events')
    .select(`
      id,
      reason,
      status,
      reported_at,
      escalation_level,
      route_id,
      route_stop_id,
      affected_staff:affected_staff_id(id, staff_code, full_name),
      reported_by_staff:reported_by_staff_id(id, staff_code, full_name),
      covered_by_staff:covered_by_staff_id(id, staff_code, full_name),
      site:site_id(id, site_code, name)
    `)
    .is('archived_at', null)
    .order('reported_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (affectedStaffId) {
    query = query.eq('affected_staff_id', affectedStaffId);
  }

  return query;
}

export async function listCoverageCandidates(
  db: SupabaseClient,
  limit = 200,
) {
  return db
    .from('staff')
    .select('id, staff_code, full_name')
    .is('archived_at', null)
    .order('full_name', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function listActivePayrollMappings(
  db: SupabaseClient,
  limit = 50,
) {
  return db
    .from('payroll_export_mappings')
    .select('id, template_name, provider_code, delimiter, include_header, quote_all, decimal_separator, date_format, is_default, is_active')
    .is('archived_at', null)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('template_name', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 200)));
}

export async function listPayrollMappingFields(
  db: SupabaseClient,
  mappingId: string,
) {
  return db
    .from('payroll_export_mapping_fields')
    .select(`
      id,
      mapping_id,
      sort_order,
      output_column_name,
      source_field,
      static_value,
      transform_config,
      is_required,
      is_enabled
    `)
    .eq('mapping_id', mappingId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .limit(500);
}

export async function createPayrollMapping(
  db: SupabaseClient,
  payload: {
    tenant_id: string;
    template_name: string;
    provider_code?: string | null;
    delimiter?: string;
    include_header?: boolean;
    quote_all?: boolean;
    decimal_separator?: string;
    date_format?: string;
    is_default?: boolean;
    notes?: string | null;
  },
) {
  return db
    .from('payroll_export_mappings')
    .insert(payload)
    .select('id, template_name, provider_code, delimiter, include_header, quote_all, decimal_separator, date_format, is_default, is_active')
    .single<ShiftsTimePayrollMappingRow>();
}

export async function patchPayrollMapping(
  db: SupabaseClient,
  mappingId: string,
  payload: Partial<{
    template_name: string;
    provider_code: string | null;
    delimiter: string;
    include_header: boolean;
    quote_all: boolean;
    decimal_separator: string;
    date_format: string;
    is_default: boolean;
    is_active: boolean;
    notes: string | null;
  }>,
) {
  return db
    .from('payroll_export_mappings')
    .update(payload)
    .eq('id', mappingId)
    .is('archived_at', null)
    .select('id, template_name, provider_code, delimiter, include_header, quote_all, decimal_separator, date_format, is_default, is_active')
    .maybeSingle<ShiftsTimePayrollMappingRow>();
}

export async function archivePayrollMappingFields(
  db: SupabaseClient,
  mappingId: string,
  userId: string,
  reason: string,
) {
  return db
    .from('payroll_export_mapping_fields')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason,
    })
    .eq('mapping_id', mappingId)
    .is('archived_at', null);
}

export async function archivePayrollMappingFieldsExcept(
  db: SupabaseClient,
  mappingId: string,
  keepIds: string[],
  userId: string,
  reason: string,
) {
  const keepList = keepIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => `"${id.replace(/"/g, '\\"')}"`)
    .join(',');

  let query = db
    .from('payroll_export_mapping_fields')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason,
    })
    .eq('mapping_id', mappingId)
    .is('archived_at', null);

  if (keepList.length > 0) {
    query = query.not('id', 'in', `(${keepList})`);
  }

  return query;
}

export async function insertPayrollMappingFields(
  db: SupabaseClient,
  rows: Array<{
    tenant_id: string;
    mapping_id: string;
    sort_order: number;
    output_column_name: string;
    source_field?: string | null;
    static_value?: string | null;
    transform_config?: Record<string, unknown> | null;
    is_required?: boolean;
    is_enabled?: boolean;
  }>,
) {
  return db
    .from('payroll_export_mapping_fields')
    .insert(rows)
    .select(`
      id,
      mapping_id,
      sort_order,
      output_column_name,
      source_field,
      static_value,
      transform_config,
      is_required,
      is_enabled
    `);
}

export async function listRecentPayrollRuns(
  db: SupabaseClient,
  limit = 25,
) {
  return db
    .from('payroll_export_runs')
    .select(`
      id,
      period_start,
      period_end,
      status,
      created_at,
      exported_at,
      mapping:mapping_id(id, template_name)
    `)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
}
