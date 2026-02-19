'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_UI_PREFERENCES, type UiPreferences } from '@gleamops/shared';

const STORAGE_KEY = 'gleamops-ui-preferences';

export function useUiPreferences() {
  const [preferences, setPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiPreferences>;
        setPreferences({ ...DEFAULT_UI_PREFERENCES, ...parsed });
      }
    } catch {
      // Ignore parse/storage errors and keep defaults.
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.toggle('dyslexia-font', preferences.dyslexia_font);
    root.classList.toggle('reading-ruler', preferences.reading_ruler);
    root.classList.toggle('reduce-motion', preferences.reduce_motion);
    root.classList.toggle('high-contrast', preferences.high_contrast);
    root.classList.toggle('large-text', preferences.large_text);
    // Attributes enable pre-hydration CSS (via inline script) and deterministic styling.
    root.dataset.focusMode = preferences.focus_mode ? 'true' : 'false';
    root.dataset.simpleView = preferences.simple_view ? 'true' : 'false';
  }, [
    mounted,
    preferences.dyslexia_font,
    preferences.reading_ruler,
    preferences.reduce_motion,
    preferences.high_contrast,
    preferences.large_text,
    preferences.focus_mode,
    preferences.simple_view,
  ]);

  useEffect(() => {
    if (!mounted) return;
    if (!preferences.reading_ruler) return;
    const root = document.documentElement;
    const onMove = (e: MouseEvent) => {
      // Used by CSS to draw a subtle horizontal highlight line at cursor height.
      root.style.setProperty('--reading-ruler-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      root.style.removeProperty('--reading-ruler-y');
    };
  }, [mounted, preferences.reading_ruler]);

  const updatePreference = useCallback(<K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePreference = useCallback(<K extends keyof UiPreferences>(key: K) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return useMemo(
    () => ({ preferences, updatePreference, togglePreference, mounted }),
    [preferences, updatePreference, togglePreference, mounted],
  );
}
