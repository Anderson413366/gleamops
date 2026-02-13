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
    <div className="flex items-center justify-between pt-4 text-sm">
      <p className="text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{start}</span> to{' '}
        <span className="font-semibold text-foreground">{end}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>
        <span className="text-muted-foreground tabular-nums font-medium">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
