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
    [tabKeys.join('|')]
  );

  const resolveTab = useCallback((candidate?: string | null) => {
    const normalizedCandidate = candidate ? (aliases?.[candidate] ?? candidate) : candidate;
    if (normalizedCandidate && validTabKeys.includes(normalizedCandidate)) return normalizedCandidate;
    if (defaultTab && validTabKeys.includes(defaultTab)) return defaultTab;
    return validTabKeys[0] ?? '';
  }, [aliases, defaultTab, validTabKeys]);

  const [tab, setTab] = useState<string>(() => resolveTab(null));

  // On first mount, read the URL query directly to avoid hydration timing races.
  useEffect(() => {
    const rawTab = typeof window === 'undefined'
      ? searchParams.get('tab')
      : new URLSearchParams(window.location.search).get('tab');
    const initial = resolveTab(rawTab);
    setTab((prev) => (prev === initial ? prev : initial));
    setReady(true);
  }, [resolveTab, searchParams]);

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
    const current = searchParams.get('tab');
    if (current === tab) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, ready, router, searchParams, tab]);

  return [tab, setTab] as const;
}
