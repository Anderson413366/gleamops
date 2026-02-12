/**
 * Offline mutation queue.
 *
 * Stores pending writes in AsyncStorage when the device is offline.
 * When connectivity returns, they are replayed in order.
 *
 * Supported mutation types:
 *   - checklist_toggle — toggle a checklist item (idempotent, last-write-wins)
 *   - time_event      — clock in/out, break start/end (append-only)
 *   - photo_metadata   — photo metadata queued for upload (append-only)
 *
 * Queue key: @gleamops:mutations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = '@gleamops:mutations';

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
    // Non-fatal
  }
}

/**
 * Add a mutation to the offline queue.
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
    id: `${mutation.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
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
 * Flush: replay all pending mutations to Supabase, then clear succeeded ones.
 * Returns the number of mutations successfully synced.
 */
export async function flushQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed: PendingMutation[] = [];

  for (const mutation of queue) {
    try {
      if (mutation.type === 'checklist_toggle') {
        const { error } = await supabase
          .from('ticket_checklist_items')
          .update({
            is_checked: mutation.isChecked,
            checked_at: mutation.checkedAt,
          })
          .eq('id', mutation.itemId);

        if (error) { failed.push(mutation); } else { synced++; }

      } else if (mutation.type === 'time_event') {
        const { error } = await supabase
          .from('time_events')
          .insert({
            tenant_id: mutation.tenantId,
            staff_id: mutation.staffId,
            ticket_id: mutation.ticketId,
            site_id: mutation.siteId,
            event_type: mutation.eventType,
            recorded_at: mutation.recordedAt,
            lat: mutation.lat,
            lng: mutation.lng,
            accuracy_meters: mutation.accuracyMeters,
          });

        if (error) { failed.push(mutation); } else { synced++; }

      } else if (mutation.type === 'photo_metadata') {
        // Photo file upload requires a separate mechanism (expo-file-system).
        // Here we queue the metadata row; storage_path holds the local URI
        // until the actual upload replaces it with the remote path.
        const { error } = await supabase
          .from('ticket_photos')
          .insert({
            tenant_id: mutation.tenantId,
            ticket_id: mutation.ticketId,
            checklist_item_id: mutation.checklistItemId,
            storage_path: mutation.localUri,
            original_filename: mutation.originalFilename,
            mime_type: mutation.mimeType,
            size_bytes: mutation.sizeBytes,
            caption: mutation.caption,
            uploaded_by: mutation.uploadedBy,
          });

        if (error) { failed.push(mutation); } else { synced++; }
      }
    } catch {
      failed.push(mutation);
    }
  }

  // Keep only failed mutations for retry
  await setQueue(failed);
  return synced;
}
