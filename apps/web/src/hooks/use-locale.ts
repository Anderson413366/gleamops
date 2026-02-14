'use client';

import { useState, useEffect, useCallback } from 'react';
import { t, type Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@gleamops/shared';

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
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocaleState(stored);
    } else {
      // Fall back to browser language
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (SUPPORTED_LOCALES.includes(browserLang)) {
        setLocaleState(browserLang);
      }
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
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
