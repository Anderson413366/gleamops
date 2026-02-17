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
  const tabKeySignature = JSON.stringify(tabKeys);
  const aliasSignature = JSON.stringify(aliases ?? {});

  const validTabKeys = useMemo(
    () => Array.from(new Set((JSON.parse(tabKeySignature) as string[]).filter(Boolean))),
    [tabKeySignature]
  );
  const aliasMap = useMemo(
    () => JSON.parse(aliasSignature) as Record<string, string>,
    [aliasSignature]
  );

  const resolveTab = useCallback((candidate?: string | null) => {
    const normalizedCandidate = candidate ? (aliasMap[candidate] ?? candidate) : candidate;
    if (normalizedCandidate && validTabKeys.includes(normalizedCandidate)) return normalizedCandidate;
    if (defaultTab && validTabKeys.includes(defaultTab)) return defaultTab;
    return validTabKeys[0] ?? '';
  }, [aliasMap, defaultTab, validTabKeys]);

  const rawUrlTab = searchParams.get('tab');
  const tab = resolveTab(rawUrlTab);

  // Keep URL canonical only when a tab param exists (aliases/invalid tabs normalize
  // to the resolved canonical tab). Avoid writing default tabs back to the URL on
  // first load to prevent tab flicker/race behavior across module pages.
  useEffect(() => {
    if (!tab) return;
    if (!rawUrlTab) return;
    if (rawUrlTab === tab) return;
    if (typeof window === 'undefined') return;
    const next = new URLSearchParams(window.location.search);
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, rawUrlTab, router, tab]);

  const setSyncedTab = useCallback((nextTab: string) => {
    const resolved = resolveTab(nextTab);
    if (!resolved) return;
    if (typeof window === 'undefined') return;
    const next = new URLSearchParams(window.location.search);
    if (next.get('tab') === resolved) return;
    next.set('tab', resolved);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, resolveTab, router]);

  return [tab, setSyncedTab] as const;
}
