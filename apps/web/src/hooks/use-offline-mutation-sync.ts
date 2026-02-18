'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { flushOfflineMutations } from '@/lib/offline/mutation-queue';

export function useOfflineMutationSync() {
  const supabaseRef = useRef(getSupabaseBrowserClient());

  const getAccessToken = useCallback(async () => {
    const { data } = await supabaseRef.current.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const flush = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;
    await flushOfflineMutations(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    const onOnline = () => {
      void flush();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void flush();
      }
    };
    const onBeforeUnload = () => {
      void flush();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('beforeunload', onBeforeUnload);
    const timer = window.setInterval(() => {
      void flush();
    }, 45000);

    // Initial best-effort flush on mount.
    void flush();

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearInterval(timer);
    };
  }, [flush]);

  return { flush };
}
