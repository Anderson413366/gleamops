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
const LAST_SYNC_KEY = '@gleamops:last_sync_at';
const MAX_RETRIES = 10;

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

type MutationPayload = ChecklistToggle | TimeEventMutation | PhotoMetadataMutation;

export type PendingMutation = MutationPayload & {
  id: string;
  createdAt: string;
  retryCount: number;
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

  // Deduplicate: checklist toggles replace existing mutation for same item
  let filtered = queue;
  if (mutation.type === 'checklist_toggle') {
    filtered = queue.filter(
      (m) => !(m.type === 'checklist_toggle' && m.itemId === mutation.itemId),
    );
  }

  filtered.push({
    ...mutation,
    id: `${mutation.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  } as PendingMutation);

  await setQueue(filtered);
}

/**
 * Get count of all pending mutations (for badge display).
 */
export async function getPendingCount(): Promise<number> {
  return (await getQueue()).length;
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

  for (const mutation of queue) {
    // Drop mutations that have exceeded retry limit
    if (mutation.retryCount >= MAX_RETRIES) {
      console.error('[sync] dropping mutation after max retries:', mutation.id);
      continue;
    }

    let ok = false;
    try {
      if (mutation.type === 'checklist_toggle') {
        ok = await flushChecklist(mutation as PendingMutation & ChecklistToggle);
      } else if (mutation.type === 'time_event') {
        ok = await flushTimeEvent(mutation as PendingMutation & TimeEventMutation);
      } else if (mutation.type === 'photo_metadata') {
        ok = await flushPhoto(mutation as PendingMutation & PhotoMetadataMutation);
      }
    } catch {
      ok = false;
    }

    if (ok) {
      synced++;
    } else {
      remaining.push({ ...mutation, retryCount: mutation.retryCount + 1 });
    }
  }

  await setQueue(remaining);

  if (synced > 0) {
    await setLastSyncAt();
  }

  return synced;
}
