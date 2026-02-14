'use client';

import { cn } from '../utils';

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
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

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

  return (
    <div className="flex items-center justify-between pt-4 text-sm">
      <span className="text-muted-foreground">
        {start}&ndash;{end} of {totalItems}
      </span>
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
    </div>
  );
}
