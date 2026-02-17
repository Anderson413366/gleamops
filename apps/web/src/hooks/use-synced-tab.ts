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

  const searchParamsString = searchParams.toString();
  const rawUrlTab = searchParams.get('tab');
  const resolvedUrlTab = resolveTab(rawUrlTab);
  const [tab, setTab] = useState<string>(resolvedUrlTab);

  useEffect(() => {
    setTab(resolvedUrlTab);
  }, [resolvedUrlTab]);

  // Keep URL canonical only when a tab param exists (aliases/invalid tabs normalize
  // to the resolved canonical tab). Avoid writing default tabs back to the URL on
  // first load to prevent tab flicker/race behavior across module pages.
  useEffect(() => {
    if (!tab) return;
    if (!rawUrlTab) return;
    if (rawUrlTab === tab) return;
    const next = new URLSearchParams(searchParamsString);
    next.set('tab', tab);
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, rawUrlTab, router, searchParamsString, tab]);

  const setSyncedTab = useCallback((nextTab: string) => {
    const resolved = resolveTab(nextTab);
    if (!resolved) return;
    setTab(resolved);
    const next = new URLSearchParams(searchParamsString);
    if (next.get('tab') === resolved && rawUrlTab === resolved) return;
    next.set('tab', resolved);
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, rawUrlTab, resolveTab, router, searchParamsString]);

  return [tab, setSyncedTab] as const;
}
