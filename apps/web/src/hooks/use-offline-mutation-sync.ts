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

    window.addEventListener('online', onOnline);
    const timer = window.setInterval(() => {
      void flush();
    }, 45000);

    // Initial best-effort flush on mount.
    void flush();

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, [flush]);

  return { flush };
}
