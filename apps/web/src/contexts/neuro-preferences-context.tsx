'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_UI_PREFERENCES, type UiPreferences } from '@gleamops/shared';

const STORAGE_KEY = 'gleamops-ui-preferences';

export interface NeuroPreferencesValue {
  preferences: UiPreferences;
  mounted: boolean;
  updatePreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  togglePreference: <K extends keyof UiPreferences>(key: K) => void;
}

export const NeuroPreferencesContext = createContext<NeuroPreferencesValue | null>(null);

export function useLocalNeuroPreferenceStore(enabled = true): NeuroPreferencesValue {
  const [preferences, setPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
  const [mounted, setMounted] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiPreferences>;
        setPreferences({ ...DEFAULT_UI_PREFERENCES, ...parsed });
      }
    } catch {
      // Keep defaults when storage is inaccessible.
    } finally {
      setMounted(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !mounted) return;

    const root = document.documentElement;
    root.classList.toggle('dyslexia-font', preferences.dyslexia_font);
    root.classList.toggle('reading-ruler', preferences.reading_ruler);
    root.classList.toggle('reduce-motion', preferences.reduce_motion);
    root.classList.toggle('high-contrast', preferences.high_contrast);
    root.classList.toggle('large-text', preferences.large_text);
    root.dataset.focusMode = preferences.focus_mode ? 'true' : 'false';
    root.dataset.simpleView = preferences.simple_view ? 'true' : 'false';
  }, [enabled, mounted, preferences]);

  useEffect(() => {
    if (!enabled || !mounted || !preferences.reading_ruler) return;

    const root = document.documentElement;
    const onMove = (event: MouseEvent) => {
      root.style.setProperty('--reading-ruler-y', `${event.clientY}px`);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      root.style.removeProperty('--reading-ruler-y');
    };
  }, [enabled, mounted, preferences.reading_ruler]);

  const persist = useCallback((next: UiPreferences) => {
    if (!enabled) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [enabled]);

  const updatePreference = useCallback(<K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  }, [persist]);

  const togglePreference = useCallback(<K extends keyof UiPreferences>(key: K) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next);
      return next;
    });
  }, [persist]);

  return useMemo(() => ({
    preferences,
    mounted,
    updatePreference,
    togglePreference,
  }), [preferences, mounted, updatePreference, togglePreference]);
}

export function NeuroPreferencesProvider({ children }: { children: React.ReactNode }) {
  const value = useLocalNeuroPreferenceStore();
  return (
    <NeuroPreferencesContext.Provider value={value}>
      {children}
    </NeuroPreferencesContext.Provider>
  );
}
