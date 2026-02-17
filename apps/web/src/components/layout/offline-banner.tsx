'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { flushOfflineMutations, getOfflineMutationCount, getOfflineMutationEventName } from '@/lib/offline/mutation-queue';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const refreshCount = useCallback(() => {
    setPendingCount(getOfflineMutationCount());
  }, []);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    setFlushing(true);
    try {
      await flushOfflineMutations(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      });
      refreshCount();
    } finally {
      setFlushing(false);
    }
  }, [refreshCount, supabase]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onQueueUpdate = () => refreshCount();

    setOffline(!navigator.onLine);
    refreshCount();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(getOfflineMutationEventName(), onQueueUpdate);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(getOfflineMutationEventName(), onQueueUpdate);
    };
  }, [refreshCount]);

  if (!offline && pendingCount === 0) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm text-warning-foreground">
      <div className="flex items-center gap-2">
      <WifiOff className="h-4 w-4" />
        {offline
          ? `Offline mode. ${pendingCount > 0 ? `${pendingCount} queued change${pendingCount === 1 ? '' : 's'} will sync on reconnect.` : 'Changes will sync when connection returns.'}`
          : `${pendingCount} queued change${pendingCount === 1 ? '' : 's'} pending sync.`}
      </div>
      {!offline && pendingCount > 0 ? (
        <Button size="sm" variant="secondary" disabled={flushing} onClick={() => void flushQueue()}>
          {flushing ? 'Syncing…' : 'Sync Now'}
        </Button>
      ) : null}
    </div>
  );
}
