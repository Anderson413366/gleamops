'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gleamops-theme';
const TRUE_BLACK_KEY = 'gleamops-true-black';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme, trueBlack: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    if (trueBlack) {
      root.setAttribute('data-theme', 'true-black');
    } else {
      root.removeAttribute('data-theme');
    }
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [trueBlack, setTrueBlackState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const storedTB = localStorage.getItem(TRUE_BLACK_KEY) === 'true';
    const initial = stored || 'system';
    const resolved = initial === 'system' ? getSystemTheme() : initial;

    setThemeState(initial);
    setResolvedTheme(resolved);
    setTrueBlackState(storedTB);
    applyTheme(resolved, storedTB);
    setMounted(true);
  }, []);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(e: MediaQueryListEvent) {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved, trueBlack);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, trueBlack]);

  const setTheme = useCallback((newTheme: Theme) => {
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;

    setThemeState(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved, trueBlack);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, [trueBlack]);

  const setTrueBlack = useCallback((value: boolean) => {
    setTrueBlackState(value);
    localStorage.setItem(TRUE_BLACK_KEY, String(value));
    applyTheme(resolvedTheme, value);
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    trueBlack,
    setTheme,
    setTrueBlack,
    toggleTheme,
    mounted,
  };
}
