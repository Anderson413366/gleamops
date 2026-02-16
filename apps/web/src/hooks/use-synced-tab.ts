'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UseSyncedTabOptions {
  tabKeys: string[];
  defaultTab?: string;
  aliases?: Record<string, string>;
}

export function useSyncedTab({ tabKeys, defaultTab, aliases }: UseSyncedTabOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  const validTabKeys = useMemo(
    () => Array.from(new Set(tabKeys.filter(Boolean))),
    [tabKeys]
  );

  const resolveTab = useCallback((candidate?: string | null) => {
    const normalizedCandidate = candidate ? (aliases?.[candidate] ?? candidate) : candidate;
    if (normalizedCandidate && validTabKeys.includes(normalizedCandidate)) return normalizedCandidate;
    if (defaultTab && validTabKeys.includes(defaultTab)) return defaultTab;
    return validTabKeys[0] ?? '';
  }, [aliases, defaultTab, validTabKeys]);

  const [tab, setTab] = useState<string>(() => resolveTab(null));

  // Initialize from URL once to avoid tab flicker caused by repeated re-initialization.
  useEffect(() => {
    const rawTab = typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('tab');
    const initial = resolveTab(rawTab);
    setTab((prev) => (prev === initial ? prev : initial));
    setReady(true);
  }, [resolveTab]);

  // Keep state valid when tab set changes (for example, simple view hides tabs).
  useEffect(() => {
    if (!ready) return;
    if (!validTabKeys.includes(tab)) {
      setTab(resolveTab(searchParams.get('tab')));
    }
  }, [ready, resolveTab, searchParams, tab, validTabKeys]);

  // Keep state in sync when URL tab changes externally.
  useEffect(() => {
    if (!ready) return;
    const urlTab = searchParams.get('tab');
    const resolved = resolveTab(urlTab);
    if (resolved && resolved !== tab) {
      setTab(resolved);
    }
  }, [ready, resolveTab, searchParams, tab]);

  // Keep URL tab in sync with state changes.
  useEffect(() => {
    if (!ready || !tab) return;
    if (typeof window === 'undefined') return;
    const current = new URLSearchParams(window.location.search).get('tab');
    if (current === tab) return;
    const next = new URLSearchParams(window.location.search);
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, ready, router, tab]);

  return [tab, setTab] as const;
}
