'use client';

export interface OfflineMutation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: Record<string, unknown> | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

interface QueueMutationInput {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | null;
}

interface ExecuteWithQueueInput extends QueueMutationInput {
  headers?: Record<string, string>;
}

interface FlushResult {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  remaining: number;
}

const STORAGE_KEY = 'gleamops-offline-mutation-queue-v1';
const UPDATE_EVENT = 'gleamops-offline-mutation-queue-updated';
const MAX_ATTEMPTS = 8;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readQueue(): OfflineMutation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineMutation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.url === 'string' && typeof row.method === 'string');
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: queue.length } }));
}

export function getOfflineMutationEventName() {
  return UPDATE_EVENT;
}

export function getOfflineMutationCount(): number {
  return readQueue().length;
}

export function queueOfflineMutation(input: QueueMutationInput): OfflineMutation {
  const queue = readQueue();
  const record: OfflineMutation = {
    id: randomId(),
    url: input.url,
    method: input.method ?? 'POST',
    body: input.body ?? null,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  };
  queue.push(record);
  writeQueue(queue);
  return record;
}

export async function executeWithOfflineQueue(input: ExecuteWithQueueInput): Promise<{ queued: boolean; response?: Response }> {
  const method = input.method ?? 'POST';
  const headers = {
    'Content-Type': 'application/json',
    ...(input.headers ?? {}),
  };

  if (isBrowser() && !navigator.onLine) {
    queueOfflineMutation({ url: input.url, method, body: input.body ?? null });
    return { queued: true };
  }

  try {
    const response = await fetch(input.url, {
      method,
      headers,
      body: input.body == null ? undefined : JSON.stringify(input.body),
    });

    if (response.ok) return { queued: false, response };

    // Network-ish gateway errors can be retried later from queue.
    if ([502, 503, 504].includes(response.status)) {
      queueOfflineMutation({ url: input.url, method, body: input.body ?? null });
      return { queued: true, response };
    }

    return { queued: false, response };
  } catch {
    queueOfflineMutation({ url: input.url, method, body: input.body ?? null });
    return { queued: true };
  }
}

export async function flushOfflineMutations(getAccessToken: () => Promise<string | null>): Promise<FlushResult> {
  const originalQueue = readQueue();
  if (!isBrowser() || originalQueue.length === 0 || !navigator.onLine) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      remaining: originalQueue.length,
    };
  }

  let queue = [...originalQueue];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;

  for (const row of originalQueue) {
    if (!navigator.onLine) break;
    processed += 1;

    const token = await getAccessToken();
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-offline-replay': '1',
      'x-queued-at': row.created_at,
    };

    const perform = async (headers: Record<string, string>) => {
      return fetch(row.url, {
        method: row.method,
        headers,
        body: row.body == null ? undefined : JSON.stringify(row.body),
      });
    };

    try {
      let response = await perform(baseHeaders);
      if (response.status === 409 || response.status === 412) {
        conflicts += 1;
        response = await perform({ ...baseHeaders, 'x-conflict-strategy': 'last-writer-wins' });
      }

      if (response.ok) {
        succeeded += 1;
        queue = queue.filter((entry) => entry.id !== row.id);
        writeQueue(queue);
        continue;
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 409 && response.status !== 412) {
        failed += 1;
        queue = queue.filter((entry) => entry.id !== row.id);
        writeQueue(queue);
        continue;
      }

      // 5xx or unresolved conflict: keep queued with incremented attempt count.
      queue = queue.map((entry) =>
        entry.id === row.id
          ? {
              ...entry,
              attempts: entry.attempts + 1,
              last_error: `HTTP ${response.status}`,
            }
          : entry,
      );
      writeQueue(queue.filter((entry) => entry.attempts < MAX_ATTEMPTS));
      queue = readQueue();
    } catch (error) {
      // Keep current item queued; connectivity is likely unstable, stop the loop.
      queue = queue.map((entry) =>
        entry.id === row.id
          ? {
              ...entry,
              attempts: entry.attempts + 1,
              last_error: error instanceof Error ? error.message : 'Network error',
            }
          : entry,
      );
      writeQueue(queue.filter((entry) => entry.attempts < MAX_ATTEMPTS));
      queue = readQueue();
      break;
    }
  }

  return {
    processed,
    succeeded,
    failed,
    conflicts,
    remaining: readQueue().length,
  };
}
