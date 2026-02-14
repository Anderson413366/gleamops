'use client';

import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'card';

export function useViewPreference(entityKey: string) {
  const storageKey = `gleamops-view-${entityKey}`;
  const [view, setViewState] = useState<ViewMode>('list');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'card' || stored === 'list') {
      setViewState(stored);
    }
    setMounted(true);
  }, [storageKey]);

  const setView = (v: ViewMode) => {
    setViewState(v);
    localStorage.setItem(storageKey, v);
  };

  return { view, setView, mounted };
}
