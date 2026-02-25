'use client';

import { useEffect, useState } from 'react';
import { cn } from '../utils';

const PAGE_SIZE_STORAGE_KEY = 'gleamops-page-size';
const PAGE_SIZE_EVENT = 'gleamops:page-size-change';
const PAGE_SIZE_OPTIONS = [25, 50, 100, 0] as const; // 0 = all

function normalizeStoredPageSize(value: number, fallback = 25): number {
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]) ? value : fallback;
}

function readStoredPageSize(fallback = 25): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return normalizeStoredPageSize(parsed, fallback);
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onGoTo?: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onGoTo,
}: PaginationProps) {
  const [storedPageSize, setStoredPageSize] = useState<number>(() => readStoredPageSize(pageSize));
  const showPageSizeSelector = pageSize >= 25;

  useEffect(() => {
    if (!showPageSizeSelector || typeof window === 'undefined') return undefined;

    const onPageSizeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ pageSize?: number }>;
      const next = Number(customEvent.detail?.pageSize);
      if (Number.isNaN(next)) return;
      setStoredPageSize((prev) => normalizeStoredPageSize(next, prev));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PAGE_SIZE_STORAGE_KEY) return;
      const next = Number(event.newValue);
      if (Number.isNaN(next)) return;
      setStoredPageSize((prev) => normalizeStoredPageSize(next, prev));
    };

    window.addEventListener(PAGE_SIZE_EVENT, onPageSizeChange as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PAGE_SIZE_EVENT, onPageSizeChange as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [showPageSizeSelector]);

  if (totalItems <= 0) return null;
  if (totalPages <= 1 && !showPageSizeSelector) return null;

  const activePageSize = showPageSizeSelector
    ? (storedPageSize === 0 ? Math.max(totalItems, 1) : storedPageSize)
    : pageSize;
  const start = (currentPage - 1) * activePageSize + 1;
  const end = Math.min(currentPage * activePageSize, totalItems);

  // Build page numbers with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const handlePageSizeChange = (value: string) => {
    if (typeof window === 'undefined') return;
    const next = normalizeStoredPageSize(Number(value), 25);
    setStoredPageSize(next);
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent(PAGE_SIZE_EVENT, { detail: { pageSize: next } }));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-muted-foreground">
        {start}&ndash;{end} of {totalItems}
      </span>
      <div className="flex items-center gap-3">
        {showPageSizeSelector && (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={storedPageSize}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>All</option>
            </select>
          </label>
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ease-in-out hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {onGoTo
              ? pages.map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-muted-foreground">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onGoTo(p)}
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all duration-200 ease-in-out',
                        p === currentPage
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted'
                      )}
                    >
                      {p}
                    </button>
                  )
                )
              : (
                <span className="px-2 text-muted-foreground tabular-nums">
                  {currentPage} / {totalPages}
                </span>
              )
            }
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ease-in-out hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
