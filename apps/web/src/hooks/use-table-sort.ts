'use client';

import { useMemo, useState, useCallback } from 'react';

type SortDir = 'asc' | 'desc' | false;

export function useTableSort<T extends Record<string, unknown>>(
  data: T[],
  defaultKey: string,
  defaultDir: 'asc' | 'desc' = 'asc'
) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const onSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? false : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const sorted = useMemo(() => {
    if (!sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return String(aVal).localeCompare(String(bVal)) * (sortDir === 'asc' ? 1 : -1);
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, onSort };
}
