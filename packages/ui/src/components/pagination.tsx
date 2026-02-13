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
    <div className="flex items-center justify-between px-4 py-4 text-sm">
      <p className="text-muted">
        Showing <span className="font-semibold text-foreground">{start}</span> to{' '}
        <span className="font-semibold text-foreground">{end}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-gray-50 hover:shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>
        <span className="text-muted tabular-nums font-medium">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-gray-50 hover:shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
