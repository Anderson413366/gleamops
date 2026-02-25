'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, type Locale, DEFAULT_LOCALE } from '@gleamops/shared';
import { resolvePreferredLocale, toSupportedLocale } from '@/lib/locale';

const STORAGE_KEY = 'gleamops-locale';

/**
 * Hook for locale management.
 * Reads preferred locale from localStorage > browser > default (en).
 * Returns a pre-bound `t()` function for the current locale.
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage first
    const stored = toSupportedLocale(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setLocaleState(stored);
    } else {
      // Fall back to browser language preferences
      const browserLocales = [...(navigator.languages ?? []), navigator.language];
      setLocaleState(resolvePreferredLocale(browserLocales));
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    const resolved = toSupportedLocale(newLocale) ?? DEFAULT_LOCALE;
    setLocaleState(resolved);
    localStorage.setItem(STORAGE_KEY, resolved);
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, locale, vars),
    [locale],
  );

  return {
    locale,
    setLocale,
    t: translate,
    mounted,
  };
}
