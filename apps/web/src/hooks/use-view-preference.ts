'use client';

import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'card';

export function useViewPreference(entityKey: string) {
  const storageKey = `gleamops-view-${entityKey}`;
  const [view, setViewState] = useState<ViewMode>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');

    const apply = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      if (mobile) {
        setViewState('list');
        setMounted(true);
        return;
      }
      const stored = localStorage.getItem(storageKey);
      if (stored === 'card' || stored === 'list') {
        setViewState(stored);
      } else {
        setViewState('list');
      }
      setMounted(true);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [storageKey]);

  const setView = (v: ViewMode) => {
    if (isMobile) {
      setViewState('list');
      return;
    }
    setViewState(v);
    localStorage.setItem(storageKey, v);
  };

  return { view: isMobile ? 'list' : view, setView, mounted, isMobile };
}
