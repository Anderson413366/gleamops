'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Color token to Tailwind class mapping.
 * Each token maps to border, background, and text classes for the PositionBlock.
 */
export const COLOR_TOKEN_MAP: Record<string, { block: string; badge: 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray' }> = {
  green:   { block: 'border-green-300/70 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200',     badge: 'green' },
  red:     { block: 'border-red-300/70 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200',                 badge: 'red' },
  blue:    { block: 'border-blue-300/70 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200',            badge: 'blue' },
  yellow:  { block: 'border-yellow-300/70 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200', badge: 'yellow' },
  pink:    { block: 'border-pink-300/70 bg-pink-50 text-pink-900 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-200',            badge: 'red' },
  purple:  { block: 'border-purple-300/70 bg-purple-50 text-purple-900 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200', badge: 'purple' },
  indigo:  { block: 'border-indigo-300/70 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200', badge: 'blue' },
  orange:  { block: 'border-orange-300/70 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200', badge: 'orange' },
  teal:    { block: 'border-teal-300/70 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200',            badge: 'green' },
  emerald: { block: 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200', badge: 'green' },
  amber:   { block: 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',     badge: 'yellow' },
  cyan:    { block: 'border-cyan-300/70 bg-cyan-50 text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200',            badge: 'blue' },
  gray:    { block: 'border-slate-300/70 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200',      badge: 'gray' },
  slate:   { block: 'border-slate-300/70 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200',      badge: 'gray' },
};

const FALLBACK_THEME = COLOR_TOKEN_MAP.slate;

export interface PositionTypeConfig {
  positionCode: string;
  label: string;
  colorToken: string;
  block: string;
  badge: 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray';
}

/** Module-level cache to avoid redundant fetches across components. */
let cachedMap: Map<string, PositionTypeConfig> | null = null;
let cachePromise: Promise<Map<string, PositionTypeConfig>> | null = null;

function fetchPositionTypes(): Promise<Map<string, PositionTypeConfig>> {
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('staff_positions')
      .select('position_code, title, color_token')
      .eq('is_active', true)
      .is('archived_at', null)
      .order('title', { ascending: true });

    const map = new Map<string, PositionTypeConfig>();
    if (data) {
      for (const row of data as Array<{ position_code: string; title: string; color_token: string }>) {
        const theme = COLOR_TOKEN_MAP[row.color_token] ?? FALLBACK_THEME;
        map.set(row.position_code, {
          positionCode: row.position_code,
          label: row.title,
          colorToken: row.color_token,
          block: theme.block,
          badge: theme.badge,
        });
      }
    }
    cachedMap = map;
    return map;
  })();

  return cachePromise;
}

/** Invalidate the position types cache (call after admin edits). */
export function invalidatePositionTypesCache() {
  cachedMap = null;
  cachePromise = null;
}

/**
 * Hook to fetch and cache position type configs (code → color/label) from DB.
 * Returns a Map<positionCode, PositionTypeConfig> and a loading flag.
 */
export function usePositionTypes() {
  const [positionTypes, setPositionTypes] = useState<Map<string, PositionTypeConfig>>(cachedMap ?? new Map());
  const [loading, setLoading] = useState(!cachedMap);

  useEffect(() => {
    if (cachedMap) {
      setPositionTypes(cachedMap);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void fetchPositionTypes().then((map) => {
      if (!cancelled) {
        setPositionTypes(map);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { positionTypes, loading };
}

/**
 * Resolve a position code to its theme (block classes + badge color).
 * Uses the cached position types map, with fallback to slate for unknown types.
 */
export function resolvePositionTheme(positionCode: string | undefined | null, positionTypes: Map<string, PositionTypeConfig>) {
  if (!positionCode) {
    return {
      label: 'Unassigned Position',
      ...FALLBACK_THEME,
    };
  }

  const config = positionTypes.get(positionCode);
  if (config) {
    return {
      label: config.label,
      block: config.block,
      badge: config.badge,
    };
  }

  // Fallback: format the code as a readable label, use slate theme
  return {
    label: positionCode.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
    ...FALLBACK_THEME,
  };
}
