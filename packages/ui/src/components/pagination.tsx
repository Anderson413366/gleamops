import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
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
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <p className="text-muted">
        Showing <span className="font-medium text-foreground">{start}</span> to{' '}
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>
        <span className="text-muted">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
