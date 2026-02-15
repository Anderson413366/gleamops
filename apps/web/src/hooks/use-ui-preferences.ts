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
    // Attributes enable pre-hydration CSS (via inline script) and deterministic styling.
    root.dataset.focusMode = preferences.focus_mode ? 'true' : 'false';
    root.dataset.simpleView = preferences.simple_view ? 'true' : 'false';
  }, [
    mounted,
    preferences.dyslexia_font,
    preferences.reading_ruler,
    preferences.focus_mode,
    preferences.simple_view,
  ]);

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
