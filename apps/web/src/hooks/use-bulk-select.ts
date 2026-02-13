import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing multi-select state in data tables.
 * Provides toggle, toggleAll, clear, and status helpers.
 */
export function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected]
  );

  const allSelected = useMemo(
    () => items.length > 0 && selected.size === items.length,
    [items.length, selected.size]
  );

  const someSelected = useMemo(
    () => selected.size > 0 && selected.size < items.length,
    [items.length, selected.size]
  );

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected]
  );

  return {
    selected,
    selectedCount: selected.size,
    selectedItems,
    toggle,
    toggleAll,
    clear,
    isSelected,
    allSelected,
    someSelected,
  };
}
