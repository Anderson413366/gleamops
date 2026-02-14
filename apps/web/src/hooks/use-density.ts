'use client';

import { useState, useEffect, useCallback } from 'react';

export type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'gleamops-density';

function applyDensity(density: Density) {
  if (typeof document === 'undefined') return;
  if (density === 'compact') {
    document.documentElement.setAttribute('data-density', 'compact');
  } else {
    document.documentElement.removeAttribute('data-density');
  }
}

export function useDensity() {
  const [density, setDensityState] = useState<Density>('comfortable');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Density | null;
    const initial: Density = stored === 'compact' ? 'compact' : 'comfortable';
    setDensityState(initial);
    applyDensity(initial);
    setMounted(true);
  }, []);

  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    localStorage.setItem(STORAGE_KEY, value);
    applyDensity(value);
  }, []);

  const toggleDensity = useCallback(() => {
    setDensity(density === 'comfortable' ? 'compact' : 'comfortable');
  }, [density, setDensity]);

  return { density, setDensity, toggleDensity, mounted };
}
