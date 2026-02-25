'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

const PAGE_SIZE_STORAGE_KEY = 'gleamops-page-size';
const PAGE_SIZE_EVENT = 'gleamops:page-size-change';
const SELECTABLE_PAGE_SIZES = [25, 50, 100, 0] as const; // 0 = all

function normalizeSelectablePageSize(value: number, fallback: number): number {
  return SELECTABLE_PAGE_SIZES.includes(value as (typeof SELECTABLE_PAGE_SIZES)[number]) ? value : fallback;
}

function getStoredSelectablePageSize(fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return normalizeSelectablePageSize(parsed, fallback);
}

export function usePagination<T>(data: T[], pageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const supportsGlobalPageSize = pageSize >= 25;
  const [pageSizeSetting, setPageSizeSetting] = useState<number>(() => (
    supportsGlobalPageSize ? getStoredSelectablePageSize(pageSize) : pageSize
  ));

  const totalItems = data.length;
  const effectivePageSize = pageSizeSetting === 0 ? Math.max(totalItems, 1) : pageSizeSetting;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));

  // Reset to page 1 when data shape or page-size changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems, effectivePageSize]);

  useEffect(() => {
    if (!supportsGlobalPageSize || typeof window === 'undefined') return undefined;

    const onPageSizeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ pageSize?: number }>;
      const next = Number(customEvent.detail?.pageSize);
      if (Number.isNaN(next)) return;
      setPageSizeSetting((prev) => normalizeSelectablePageSize(next, prev));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PAGE_SIZE_STORAGE_KEY) return;
      const next = Number(event.newValue);
      if (Number.isNaN(next)) return;
      setPageSizeSetting((prev) => normalizeSelectablePageSize(next, prev));
    };

    window.addEventListener(PAGE_SIZE_EVENT, onPageSizeChange as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(PAGE_SIZE_EVENT, onPageSizeChange as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [supportsGlobalPageSize]);

  const page = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return data.slice(start, start + effectivePageSize);
  }, [data, currentPage, effectivePageSize]);

  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback(
    (n: number) => {
      setCurrentPage(Math.max(1, Math.min(n, totalPages)));
    },
    [totalPages]
  );

  const setPageSize = useCallback(
    (next: number | 'all') => {
      if (!supportsGlobalPageSize) return;
      const normalized = next === 'all' ? 0 : Number(next);
      const resolved = normalizeSelectablePageSize(normalized, pageSize);
      setPageSizeSetting(resolved);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(resolved));
        window.dispatchEvent(new CustomEvent(PAGE_SIZE_EVENT, { detail: { pageSize: resolved } }));
      }
    },
    [pageSize, supportsGlobalPageSize],
  );

  return {
    page,
    currentPage,
    totalPages,
    totalItems,
    pageSize: effectivePageSize,
    pageSizeSetting: pageSizeSetting === 0 ? 'all' : pageSizeSetting,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  };
}
