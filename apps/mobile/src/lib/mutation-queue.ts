/**
 * Offline mutation queue — durable, retry-aware, idempotent.
 *
 * Every checklist toggle, time event, and photo metadata write goes through
 * this queue FIRST (AsyncStorage), so it survives app crashes and restarts.
 * Flush replays pending writes to Supabase with idempotency checks.
 *
 * Queue key: @gleamops:mutations
 * Sync timestamp key: @gleamops:last_sync_at
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = '@gleamops:mutations';
const FAILED_QUEUE_KEY = '@gleamops:failed_mutations';
const LAST_SYNC_KEY = '@gleamops:last_sync_at';
const MAX_RETRIES = 10;
const WEB_API_BASE_URL = (
  process.env.EXPO_PUBLIC_WEB_BASE_URL
  ?? process.env.EXPO_PUBLIC_API_BASE_URL
  ?? ''
).trim().replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Discriminated union types
// ---------------------------------------------------------------------------
interface ChecklistToggle {
  type: 'checklist_toggle';
  itemId: string;
  isChecked: boolean;
  checkedAt: string | null;
}

interface TimeEventMutation {
  type: 'time_event';
  tenantId: string;
  staffId: string;
  ticketId: string | null;
  siteId: string | null;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  recordedAt: string;
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
}

interface PhotoMetadataMutation {
  type: 'photo_metadata';
  tenantId: string;
  ticketId: string;
  checklistItemId: string | null;
  localUri: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number | null;
  caption: string;
  uploadedBy: string;
}

interface InspectionScoreMutation {
  type: 'inspection_score';
  inspectionItemId: string;
  score: number;
  notes: string | null;
  photoTaken: boolean;
}

interface InspectionStatusMutation {
  type: 'inspection_status';
  tenantId: string;
  inspectionId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED';
  completedAt: string | null;
  totalScore: number | null;
  maxScore: number | null;
  scorePct: number | null;
  passed: boolean | null;
  clientVersion: number;
}

type MutationPayload =
  | ChecklistToggle
  | TimeEventMutation
  | PhotoMetadataMutation
  | InspectionScoreMutation
  | InspectionStatusMutation;

interface SyncBatchItem {
  queue_item_id: string;
  idempotency_key: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
}

export type PendingMutation = MutationPayload & {
  id: string;
  createdAt: string;
  retryCount: number;
  lastError?: string | null;
};

export type FailedMutation = PendingMutation & {
  failedAt: string;
};

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------
async function getQueue(): Promise<PendingMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setQueue(queue: PendingMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal — but this means the write could be lost.
    // In practice AsyncStorage rarely fails.
  }
}

async function getFailedQueue(): Promise<FailedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setFailedQueue(queue: FailedMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal
  }
}

/**
 * Add a mutation to the durable offline queue.
 *
 * This MUST be called BEFORE the optimistic UI update so the write
 * is persisted to disk even if the app crashes immediately after.
 *
 * Checklist toggles are deduplicated (last-write-wins for same itemId).
 * Time events and photos are append-only.
 */
export async function enqueue(mutation: MutationPayload): Promise<void> {
  const queue = await getQueue();

  // Deduplicate: checklist toggles and inspection scores use last-write-wins
  let filtered = queue;
  if (mutation.type === 'checklist_toggle') {
    filtered = queue.filter(
      (m) => !(m.type === 'checklist_toggle' && m.itemId === mutation.itemId),
    );
  } else if (mutation.type === 'inspection_score') {
    filtered = queue.filter(
      (m) => !(m.type === 'inspection_score' && m.inspectionItemId === mutation.inspectionItemId),
    );
  } else if (mutation.type === 'inspection_status') {
    filtered = queue.filter(
      (m) => !(m.type === 'inspection_status' && m.inspectionId === mutation.inspectionId),
    );
  }

  filtered.push({
    ...mutation,
    id: `${mutation.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  } as PendingMutation);

  await setQueue(filtered);
}

/**
 * Get count of all pending mutations (for badge display).
 */
export async function getPendingCount(): Promise<number> {
  return (await getQueue()).length;
}

export async function getFailedCount(): Promise<number> {
  return (await getFailedQueue()).length;
}

/**
 * Get pending checklist item IDs (for "pending sync" indicator on items).
 */
export async function getPendingItemIds(): Promise<Set<string>> {
  const queue = await getQueue();
  return new Set(
    queue
      .filter((m): m is PendingMutation & ChecklistToggle => m.type === 'checklist_toggle')
      .map((m) => m.itemId),
  );
}

/**
 * Get pending inspection item IDs (for "pending sync" indicator on scored items).
 */
export async function getPendingInspectionItemIds(): Promise<Set<string>> {
  const queue = await getQueue();
  return new Set(
    queue
      .filter((m): m is PendingMutation & InspectionScoreMutation => m.type === 'inspection_score')
      .map((m) => m.inspectionItemId),
  );
}

/**
 * Get the ISO timestamp of the last successful sync.
 */
export async function getLastSyncAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

async function setLastSyncAt(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // Non-fatal
  }
}

function toSyncBatchItem(mutation: PendingMutation): SyncBatchItem | null {
  if (mutation.type === 'checklist_toggle') {
    return {
      queue_item_id: mutation.id,
      idempotency_key: mutation.id,
      operation: mutation.isChecked ? 'checklist_item.complete' : 'checklist_item.uncomplete',
      entity_type: 'checklist_item',
      entity_id: mutation.itemId,
      payload: {
        checked_at: mutation.checkedAt,
      },
    };
  }

  if (mutation.type === 'time_event') {
    const operationMap: Record<TimeEventMutation['eventType'], string> = {
      CHECK_IN: 'time_event.clock_in',
      CHECK_OUT: 'time_event.clock_out',
      BREAK_START: 'time_event.break_start',
      BREAK_END: 'time_event.break_end',
    };
    return {
      queue_item_id: mutation.id,
      idempotency_key: mutation.id,
      operation: operationMap[mutation.eventType],
      entity_type: 'time_event',
      entity_id: mutation.id,
      payload: {
        staff_id: mutation.staffId,
        ticket_id: mutation.ticketId,
        site_id: mutation.siteId,
        recorded_at: mutation.recordedAt,
        lat: mutation.lat,
        lng: mutation.lng,
        accuracy_meters: mutation.accuracyMeters,
      },
    };
  }

  if (mutation.type === 'photo_metadata') {
    return {
      queue_item_id: mutation.id,
      idempotency_key: mutation.id,
      operation: 'photo.upload',
      entity_type: 'photo',
      entity_id: mutation.id,
      payload: {
        ticket_id: mutation.ticketId,
        checklist_item_id: mutation.checklistItemId,
        storage_path: mutation.localUri,
        original_filename: mutation.originalFilename,
        mime_type: mutation.mimeType,
        size_bytes: mutation.sizeBytes,
        caption: mutation.caption,
        uploaded_by: mutation.uploadedBy,
      },
    };
  }

  if (mutation.type === 'inspection_score') {
    return {
      queue_item_id: mutation.id,
      idempotency_key: mutation.id,
      operation: 'inspection_item.submit',
      entity_type: 'inspection_item',
      entity_id: mutation.inspectionItemId,
      payload: {
        score: mutation.score,
        notes: mutation.notes,
        photo_taken: mutation.photoTaken,
      },
    };
  }

  // inspection_status is not part of the batch contract yet; use direct fallback.
  return null;
}

async function flushViaSyncBatch(mutation: PendingMutation): Promise<{ handled: boolean; ok: boolean; error: string | null }> {
  if (!WEB_API_BASE_URL) return { handled: false, ok: false, error: null };

  const item = toSyncBatchItem(mutation);
  if (!item) return { handled: false, ok: false, error: null };

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { handled: false, ok: false, error: null };

  try {
    const response = await fetch(`${WEB_API_BASE_URL}/api/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ items: [item] }),
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        handled: true,
        ok: false,
        error: text || `Sync API failed with HTTP ${response.status}`,
      };
    }

    const payload = text ? JSON.parse(text) as {
      results?: Array<{ status?: string; error_message?: string | null }>;
    } : {};
    const result = payload.results?.[0];
    const status = result?.status;

    if (status === 'accepted' || status === 'duplicate') {
      return { handled: true, ok: true, error: null };
    }

    return {
      handled: true,
      ok: false,
      error: result?.error_message ?? (status ? `Sync status: ${status}` : 'Sync API returned no result'),
    };
  } catch (error) {
    return {
      handled: false,
      ok: false,
      error: error instanceof Error ? error.message : 'Sync batch request failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Idempotent write helpers
// ---------------------------------------------------------------------------

async function flushChecklist(m: PendingMutation & ChecklistToggle): Promise<boolean> {
  // UPDATE is naturally idempotent — same values written on retry
  const { error } = await supabase
    .from('ticket_checklist_items')
    .update({ is_checked: m.isChecked, checked_at: m.checkedAt })
    .eq('id', m.itemId);
  return !error;
}

async function flushTimeEvent(m: PendingMutation & TimeEventMutation): Promise<boolean> {
  // Idempotency: check if a record with same staff+type+timestamp already exists
  const { data: existing } = await supabase
    .from('time_events')
    .select('id')
    .eq('staff_id', m.staffId)
    .eq('event_type', m.eventType)
    .eq('recorded_at', m.recordedAt)
    .maybeSingle();

  if (existing) return true; // Already synced — skip insert

  const { error } = await supabase
    .from('time_events')
    .insert({
      tenant_id: m.tenantId,
      staff_id: m.staffId,
      ticket_id: m.ticketId,
      site_id: m.siteId,
      event_type: m.eventType,
      recorded_at: m.recordedAt,
      lat: m.lat,
      lng: m.lng,
      accuracy_meters: m.accuracyMeters,
    });
  return !error;
}

async function flushPhoto(m: PendingMutation & PhotoMetadataMutation): Promise<boolean> {
  // Idempotency: check by localUri + ticket (same photo won't be uploaded twice)
  const { data: existing } = await supabase
    .from('ticket_photos')
    .select('id')
    .eq('ticket_id', m.ticketId)
    .eq('storage_path', m.localUri)
    .maybeSingle();

  if (existing) return true;

  const { error } = await supabase
    .from('ticket_photos')
    .insert({
      tenant_id: m.tenantId,
      ticket_id: m.ticketId,
      checklist_item_id: m.checklistItemId,
      storage_path: m.localUri,
      original_filename: m.originalFilename,
      mime_type: m.mimeType,
      size_bytes: m.sizeBytes,
      caption: m.caption,
      uploaded_by: m.uploadedBy,
    });
  return !error;
}

async function flushInspectionScore(m: PendingMutation & InspectionScoreMutation): Promise<boolean> {
  // UPDATE is naturally idempotent — same values written on retry
  const { error } = await supabase
    .from('inspection_items')
    .update({
      score: m.score,
      notes: m.notes,
      photo_taken: m.photoTaken,
    })
    .eq('id', m.inspectionItemId);
  return !error;
}

async function flushInspectionStatus(m: PendingMutation & InspectionStatusMutation): Promise<boolean> {
  // Optimistic locking: only update if client_version matches
  const update: Record<string, unknown> = { status: m.status };
  if (m.completedAt) update.completed_at = m.completedAt;
  if (m.totalScore !== null) update.total_score = m.totalScore;
  if (m.maxScore !== null) update.max_score = m.maxScore;
  if (m.scorePct !== null) update.score_pct = m.scorePct;
  if (m.passed !== null) update.passed = m.passed;
  // Bump client_version for next offline sync round
  update.client_version = m.clientVersion + 1;

  const { error, count } = await supabase
    .from('inspections')
    .update(update)
    .eq('id', m.inspectionId)
    .eq('client_version', m.clientVersion);

  // If count === 0, someone else updated — still consider it "synced" to avoid stuck queue
  if (error) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Flush: replay all pending mutations to Supabase
// ---------------------------------------------------------------------------

/**
 * Flush: replay pending mutations. Returns count of successfully synced items.
 *
 * - Failed mutations stay in queue with incremented retryCount.
 * - Mutations exceeding MAX_RETRIES are dropped (logged as error).
 * - On any successful sync, updates lastSyncAt timestamp.
 */
export async function flushQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const remaining: PendingMutation[] = [];
  const failed = await getFailedQueue();

  for (const mutation of queue) {
    // Move mutations that exceeded retry limit to the failed inbox.
    if (mutation.retryCount >= MAX_RETRIES) {
      failed.push({
        ...mutation,
        failedAt: new Date().toISOString(),
        lastError: mutation.lastError ?? 'Retry limit exceeded',
      });
      continue;
    }

    let ok = false;
    let errorMessage: string | null = null;
    try {
      const batchResult = await flushViaSyncBatch(mutation);
      if (batchResult.handled) {
        ok = batchResult.ok;
        errorMessage = batchResult.error;
      } else if (mutation.type === 'checklist_toggle') {
        ok = await flushChecklist(mutation as PendingMutation & ChecklistToggle);
      } else if (mutation.type === 'time_event') {
        ok = await flushTimeEvent(mutation as PendingMutation & TimeEventMutation);
      } else if (mutation.type === 'photo_metadata') {
        ok = await flushPhoto(mutation as PendingMutation & PhotoMetadataMutation);
      } else if (mutation.type === 'inspection_score') {
        ok = await flushInspectionScore(mutation as PendingMutation & InspectionScoreMutation);
      } else if (mutation.type === 'inspection_status') {
        ok = await flushInspectionStatus(mutation as PendingMutation & InspectionStatusMutation);
      }
    } catch (error) {
      ok = false;
      errorMessage = error instanceof Error ? error.message : 'Sync failed';
    }

    if (ok) {
      synced++;
    } else {
      remaining.push({
        ...mutation,
        retryCount: mutation.retryCount + 1,
        lastError: errorMessage ?? mutation.lastError ?? 'Sync failed',
      });
    }
  }

  await setQueue(remaining);
  await setFailedQueue(failed);

  if (synced > 0) {
    await setLastSyncAt();
  }

  return synced;
}

export async function getFailedMutations(): Promise<FailedMutation[]> {
  return getFailedQueue();
}

export async function retryFailedMutation(mutationId: string): Promise<void> {
  const [failed, queue] = await Promise.all([getFailedQueue(), getQueue()]);
  const target = failed.find((row) => row.id === mutationId);
  if (!target) return;

  const nextFailed = failed.filter((row) => row.id !== mutationId);
  const retryMutation: PendingMutation = {
    ...target,
    retryCount: 0,
    lastError: null,
  };
  delete (retryMutation as { failedAt?: string }).failedAt;

  await setFailedQueue(nextFailed);
  await setQueue([...queue, retryMutation]);
}

export async function dismissFailedMutation(mutationId: string): Promise<void> {
  const failed = await getFailedQueue();
  const target = failed.find((row) => row.id === mutationId);
  const nextFailed = failed.filter((row) => row.id !== mutationId);
  await setFailedQueue(nextFailed);

  const { data } = await supabase.auth.getSession();
  const tenantId = (data.session?.user.app_metadata?.tenant_id as string | undefined) ?? null;
  if (!tenantId || !target) return;

  await supabase
    .from('sync_events')
    .insert({
      tenant_id: tenantId,
      staff_id: null,
      idempotency_key: `dismissed:${target.id}:${Date.now()}`,
      operation: 'offline.dismiss',
      entity_type: target.type,
      entity_id: target.id,
      payload: target,
      result: 'failed_dismissed',
      error_code: 'DISMISSED_BY_USER',
      error_message: target.lastError ?? null,
    });
}
