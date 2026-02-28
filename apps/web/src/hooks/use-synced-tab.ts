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
  const pendingTabRef = useRef<string | null>(null);

  useEffect(() => {
    // Avoid tab "bounce" while router.replace is still propagating search params.
    // When we trigger a tab change, keep local state stable until URL catches up.
    if (pendingTabRef.current && resolvedUrlTab !== pendingTabRef.current) return;
    if (pendingTabRef.current && resolvedUrlTab === pendingTabRef.current) {
      pendingTabRef.current = null;
    }
    setTab(resolvedUrlTab);
  }, [resolvedUrlTab]);

  // Normalize aliased or invalid tab keys in the URL. When the URL tab is already
  // a valid (non-aliased) key, skip the rewrite — it was set by external navigation
  // (e.g. sidebar link) and the stale closure value of `tab` would cause a bounce loop.
  useEffect(() => {
    if (!tab) return;
    if (!rawUrlTab) return;
    if (rawUrlTab === tab) return;
    // If the URL already contains a valid tab key, don't rewrite — let Effect 1
    // sync state from the URL instead. Only rewrite for aliases/invalid keys.
    if (validTabKeys.includes(rawUrlTab)) return;
    const next = new URLSearchParams(searchParamsString);
    next.set('tab', tab);
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, rawUrlTab, router, searchParamsString, tab, validTabKeys]);

  const setSyncedTab = useCallback((nextTab: string) => {
    const resolved = resolveTab(nextTab);
    if (!resolved) return;
    const next = new URLSearchParams(searchParamsString);
    if (next.get('tab') === resolved && rawUrlTab === resolved) {
      pendingTabRef.current = null;
      setTab(resolved);
      return;
    }
    pendingTabRef.current = resolved;
    setTab(resolved);
    next.set('tab', resolved);
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, rawUrlTab, resolveTab, router, searchParamsString]);

  return [tab, setSyncedTab] as const;
}
