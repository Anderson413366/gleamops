'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * React hook that tracks a CSS media query.
 * Returns `false` during SSR and on initial render (safe for hydration).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  const update = useCallback((e: MediaQueryListEvent | MediaQueryList) => {
    setMatches(e.matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query, update]);

  return matches;
}
