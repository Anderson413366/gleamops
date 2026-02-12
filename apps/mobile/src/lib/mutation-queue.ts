/**
 * Offline mutation queue for checklist toggles.
 *
 * When the device is offline, checklist toggle mutations are stored locally.
 * When connectivity returns, they are replayed in order.
 *
 * Each mutation is idempotent: we store the final desired state (is_checked),
 * not a toggle instruction, so replaying is safe.
 *
 * Queue key: @gleamops:mutations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = '@gleamops:mutations';

export interface PendingMutation {
  id: string;            // unique mutation id
  type: 'checklist_toggle';
  itemId: string;        // ticket_checklist_items.id
  isChecked: boolean;    // desired state
  checkedAt: string | null;
  createdAt: string;     // when the mutation was created
}

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
 * Add a checklist toggle mutation to the queue.
 * If a mutation for the same item already exists, replace it (last-write-wins).
 */
export async function enqueue(mutation: Omit<PendingMutation, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();

  // Deduplicate: replace any existing mutation for the same item
  const filtered = queue.filter((m) => !(m.type === mutation.type && m.itemId === mutation.itemId));

  filtered.push({
    ...mutation,
    id: `${mutation.itemId}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  });

  await setQueue(filtered);
}

/**
 * Get all pending mutations (for display: show sync indicator).
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Get pending item IDs (for showing "pending sync" indicator on items).
 */
export async function getPendingItemIds(): Promise<Set<string>> {
  const queue = await getQueue();
  return new Set(queue.map((m) => m.itemId));
}

/**
 * Flush: replay all pending mutations to Supabase, then clear.
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

        if (error) {
          failed.push(mutation);
        } else {
          synced++;
        }
      }
    } catch {
      failed.push(mutation);
    }
  }

  // Keep only failed mutations for retry
  await setQueue(failed);
  return synced;
}
