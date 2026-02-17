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
  const pendingTabRef = useRef<string | null>(null);

  // Keep state valid when tab set changes (for example, simple view hides tabs).
  useEffect(() => {
    if (!validTabKeys.includes(tab)) {
      const resolved = resolveTab(searchParams.get('tab'));
      setTab(resolved);
      const current = searchParams.get('tab');
      if (resolved && current !== resolved) {
        const next = new URLSearchParams(searchParams.toString());
        next.set('tab', resolved);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }
    }
  }, [pathname, resolveTab, router, searchParams, tab, validTabKeys]);

  // Keep state in sync when URL tab changes externally.
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const resolved = resolveTab(urlTab);
    if (pendingTabRef.current) {
      if (resolved === pendingTabRef.current) {
        pendingTabRef.current = null;
      } else {
        return;
      }
    }
    if (resolved && resolved !== tab) {
      setTab(resolved);
    }
    // Canonicalize legacy aliases in-place so URL/state stay consistent.
    if (urlTab && resolved && urlTab !== resolved) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', resolved);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }
  }, [pathname, resolveTab, router, searchParams, tab]);

  // Stable setter: updates local state and URL together from one action path.
  const setSyncedTab = useCallback((nextTab: string) => {
    const resolved = resolveTab(nextTab);
    if (!resolved) return;
    pendingTabRef.current = resolved;
    setTab(resolved);
    const current = searchParams.get('tab');
    if (current === resolved) {
      pendingTabRef.current = null;
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', resolved);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, resolveTab, router, searchParams]);

  return [tab, setSyncedTab] as const;
}
