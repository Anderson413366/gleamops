/**
 * Hook: useSync
 *
 * Manages the offline mutation queue lifecycle:
 *   - Auto-flushes when app comes to foreground
 *   - Tracks pending count + last sync timestamp
 *   - Exposes syncNow() for manual trigger (pull-to-refresh)
 *
 * Call once in _layout.tsx. Read state from any screen via useSyncState().
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { flushQueue, getFailedCount, getLastSyncAt, getPendingCount } from '../lib/mutation-queue';

/** Singleton state — shared across all hook consumers without React context */
let _pendingCount = 0;
let _failedCount = 0;
let _lastSyncAt: string | null = null;
let _isSyncing = false;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

/**
 * Initialize sync manager. Call ONCE in root layout.
 * Flushes queue on app foreground and on mount.
 */
export function useSyncManager() {
  const mountedRef = useRef(true);

  const doFlush = useCallback(async () => {
    if (_isSyncing) return;
    _isSyncing = true;
    notify();

    try {
      const synced = await flushQueue();
      _pendingCount = await getPendingCount();
      _failedCount = await getFailedCount();
      _lastSyncAt = await getLastSyncAt();

      if (synced > 0 && mountedRef.current) {
        notify();
      }
    } catch {
      // Non-fatal
    } finally {
      _isSyncing = false;
      notify();
    }
  }, []);

  // Flush on mount
  useEffect(() => {
    mountedRef.current = true;

    // Load initial state
    (async () => {
      _pendingCount = await getPendingCount();
      _failedCount = await getFailedCount();
      _lastSyncAt = await getLastSyncAt();
      notify();
    })();

    // Initial flush attempt
    doFlush();

    return () => { mountedRef.current = false; };
  }, [doFlush]);

  // Flush when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        doFlush();
      }
    });
    return () => sub.remove();
  }, [doFlush]);
}

/**
 * Read sync state from any component. Lightweight — subscribes to
 * the singleton state without requiring a context provider.
 */
export function useSyncState() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return {
    pendingCount: _pendingCount,
    failedCount: _failedCount,
    lastSyncAt: _lastSyncAt,
    isSyncing: _isSyncing,
  };
}

/**
 * Manual sync trigger. Returns number of mutations synced.
 */
export async function syncNow(): Promise<number> {
  if (_isSyncing) return 0;
  _isSyncing = true;
  notify();

  try {
    const synced = await flushQueue();
    _pendingCount = await getPendingCount();
    _failedCount = await getFailedCount();
    _lastSyncAt = await getLastSyncAt();
    return synced;
  } finally {
    _isSyncing = false;
    notify();
  }
}
