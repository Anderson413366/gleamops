'use client';

import { useCallback, useEffect, useMemo } from 'react';
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

  const getLiveSearchParams = useCallback(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  const rawUrlTab = searchParams.get('tab');
  const tab = resolveTab(rawUrlTab);

  // Keep URL canonical (aliases/invalid tabs normalize to resolved tab).
  useEffect(() => {
    if (!tab) return;
    if (rawUrlTab === tab) return;
    const next = getLiveSearchParams();
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [getLiveSearchParams, pathname, rawUrlTab, router, tab]);

  const setSyncedTab = useCallback((nextTab: string) => {
    const resolved = resolveTab(nextTab);
    if (!resolved) return;
    const next = getLiveSearchParams();
    if (next.get('tab') === resolved) return;
    next.set('tab', resolved);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [getLiveSearchParams, pathname, resolveTab, router]);

  return [tab, setSyncedTab] as const;
}
