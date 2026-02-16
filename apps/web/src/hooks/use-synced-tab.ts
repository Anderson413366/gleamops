'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Initialize directly from URL to avoid first-render tab flicker.
  const [tab, setTab] = useState<string>(() => resolveTab(searchParams.get('tab')));
  const pendingUrlSyncTab = useRef<string | null>(null);

  // Keep state valid when tab set changes (for example, simple view hides tabs).
  useEffect(() => {
    if (!validTabKeys.includes(tab)) {
      setTab(resolveTab(searchParams.get('tab')));
    }
  }, [resolveTab, searchParams, tab, validTabKeys]);

  // Keep state in sync when URL tab changes externally.
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const resolved = resolveTab(urlTab);
    if (pendingUrlSyncTab.current) {
      // Ignore stale URL values while waiting for router.replace() to finish.
      if (resolved === pendingUrlSyncTab.current) {
        pendingUrlSyncTab.current = null;
      }
      return;
    }
    if (resolved && resolved !== tab) {
      setTab(resolved);
    }
  }, [resolveTab, searchParams, tab]);

  // Keep URL tab in sync with state changes.
  useEffect(() => {
    if (!tab) return;
    const current = searchParams.get('tab');
    if (current === tab) return;
    pendingUrlSyncTab.current = tab;
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, tab]);

  return [tab, setTab] as const;
}
