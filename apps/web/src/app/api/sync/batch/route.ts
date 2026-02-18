import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/sync/batch';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const syncItemSchema = z.object({
  queue_item_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  operation: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  base_version_etag: z.string().uuid().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
});

const syncBatchSchema = z.object({
  items: z.array(syncItemSchema).max(500),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canIngestSync(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR', 'ADMIN', 'OPERATIONS', 'TECHNICIAN']);
}

async function processSyncOperation(db: ReturnType<typeof getUserClient>, item: z.infer<typeof syncItemSchema>, tenantId: string) {
  if (item.operation === 'checklist_item.complete' || item.operation === 'checklist_item.uncomplete') {
    const isChecked = item.operation === 'checklist_item.complete';
    const { error, count } = await db
      .from('ticket_checklist_items')
      .update({
        is_checked: isChecked,
        checked_at: isChecked ? new Date().toISOString() : null,
      })
      .eq('id', item.entity_id)
      .eq('tenant_id', tenantId)
      .is('archived_at', null);

    if (error) return { status: 'error', error_code: 'CHECKLIST_UPDATE_FAILED', error_message: error.message };
    if ((count ?? 0) === 0) return { status: 'conflict', error_code: 'CHECKLIST_NOT_FOUND', error_message: 'Checklist item not found or stale version' };
    return { status: 'accepted', server_id: item.entity_id };
  }

  if (item.operation === 'ticket.complete') {
    const query = db
      .from('work_tickets')
      .update({ status: 'COMPLETED' })
      .eq('id', item.entity_id)
      .eq('tenant_id', tenantId)
      .is('archived_at', null);

    if (item.base_version_etag) {
      query.eq('version_etag', item.base_version_etag);
    }

    const { error, count } = await query;
    if (error) return { status: 'error', error_code: 'TICKET_COMPLETE_FAILED', error_message: error.message };
    if ((count ?? 0) === 0) return { status: 'conflict', error_code: 'TICKET_VERSION_CONFLICT', error_message: 'Ticket version mismatch' };
    return { status: 'accepted', server_id: item.entity_id };
  }

  if (item.operation === 'time_event.clock_in' || item.operation === 'time_event.clock_out' || item.operation === 'time_event.break_start' || item.operation === 'time_event.break_end') {
    const eventTypeMap: Record<string, string> = {
      'time_event.clock_in': 'CHECK_IN',
      'time_event.clock_out': 'CHECK_OUT',
      'time_event.break_start': 'BREAK_START',
      'time_event.break_end': 'BREAK_END',
    };

    const payload = item.payload as Record<string, unknown>;
    const { data: existing } = await db
      .from('time_events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('staff_id', payload.staff_id as string)
      .eq('event_type', eventTypeMap[item.operation])
      .eq('recorded_at', (payload.recorded_at as string) ?? new Date().toISOString())
      .maybeSingle();

    if (existing) return { status: 'duplicate', server_id: existing.id };

    const { data, error } = await db
      .from('time_events')
      .insert({
        tenant_id: tenantId,
        staff_id: payload.staff_id,
        ticket_id: payload.ticket_id ?? null,
        site_id: payload.site_id ?? null,
        event_type: eventTypeMap[item.operation],
        recorded_at: payload.recorded_at ?? new Date().toISOString(),
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        accuracy_meters: payload.accuracy_meters ?? null,
      })
      .select('id')
      .single();

    if (error) return { status: 'error', error_code: 'TIME_EVENT_FAILED', error_message: error.message };
    return { status: 'accepted', server_id: data?.id ?? null };
  }

  if (item.operation === 'photo.upload') {
    const payload = item.payload as Record<string, unknown>;
    const { data, error } = await db
      .from('ticket_photos')
      .insert({
        tenant_id: tenantId,
        ticket_id: payload.ticket_id,
        checklist_item_id: payload.checklist_item_id ?? null,
        storage_path: payload.storage_path,
        original_filename: payload.original_filename,
        mime_type: payload.mime_type,
        size_bytes: payload.size_bytes,
        caption: payload.caption ?? null,
        uploaded_by: payload.uploaded_by,
      })
      .select('id')
      .single();

    if (error) return { status: 'error', error_code: 'PHOTO_UPLOAD_FAILED', error_message: error.message };
    return { status: 'accepted', server_id: data?.id ?? null };
  }

  if (item.operation === 'inspection_item.submit') {
    const payload = item.payload as Record<string, unknown>;
    const { error, count } = await db
      .from('inspection_items')
      .update({
        score: payload.score ?? null,
        notes: payload.notes ?? null,
        photo_taken: payload.photo_taken ?? false,
      })
      .eq('id', item.entity_id)
      .eq('tenant_id', tenantId)
      .is('archived_at', null);

    if (error) return { status: 'error', error_code: 'INSPECTION_ITEM_FAILED', error_message: error.message };
    if ((count ?? 0) === 0) return { status: 'conflict', error_code: 'INSPECTION_ITEM_CONFLICT', error_message: 'Inspection item not found or stale version' };
    return { status: 'accepted', server_id: item.entity_id };
  }

  return {
    status: 'error',
    error_code: 'UNSUPPORTED_OPERATION',
    error_message: `Unsupported operation: ${item.operation}`,
  };
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canIngestSync(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const db = getUserClient(request);

  const { data: staffRow } = await db
    .from('staff')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();

  const staffId = staffRow?.id ?? null;

  const results: Array<{
    queue_item_id: string;
    status: 'accepted' | 'duplicate' | 'conflict' | 'error';
    server_id: string | null;
    error_code: string | null;
    error_message: string | null;
  }> = [];

  for (const item of parsed.data.items) {
    const { data: existingSyncEvent } = await db
      .from('sync_events')
      .select('id, result, entity_id')
      .eq('tenant_id', auth.tenantId)
      .eq('idempotency_key', item.idempotency_key)
      .limit(1)
      .maybeSingle();

    if (existingSyncEvent) {
      results.push({
        queue_item_id: item.queue_item_id,
        status: 'duplicate',
        server_id: existingSyncEvent.entity_id,
        error_code: null,
        error_message: null,
      });
      continue;
    }

    const outcome = await processSyncOperation(db, item, auth.tenantId);

    const resultStatus = (outcome.status === 'accepted' || outcome.status === 'duplicate' || outcome.status === 'conflict')
      ? outcome.status
      : 'error';

    await db
      .from('sync_events')
      .insert({
        tenant_id: auth.tenantId,
        staff_id: staffId,
        idempotency_key: item.idempotency_key,
        operation: item.operation,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        payload: item.payload,
        result: resultStatus,
        error_code: outcome.error_code ?? null,
        error_message: outcome.error_message ?? null,
      });

    results.push({
      queue_item_id: item.queue_item_id,
      status: resultStatus,
      server_id: outcome.server_id ?? null,
      error_code: outcome.error_code ?? null,
      error_message: outcome.error_message ?? null,
    });
  }

  return NextResponse.json({ results });
}
