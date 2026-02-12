'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

export function usePagination<T>(data: T[], pageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const page = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

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

  return {
    page,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
  };
}
