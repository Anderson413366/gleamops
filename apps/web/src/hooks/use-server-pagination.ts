import { useState, useCallback, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface UseServerPaginationOptions {
  table: string;
  select?: string;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
}

interface UseServerPaginationResult<T> {
  page: T[];
  loading: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (n: number) => void;
  refresh: () => void;
}

/**
 * Server-side pagination hook using Supabase .range(from, to).
 * Fetches only the current page from the database.
 */
export function useServerPagination<T>(
  options: UseServerPaginationOptions
): UseServerPaginationResult<T> {
  const { table, select = '*', pageSize = 25, orderBy = 'created_at', ascending = false, filters = {} } = options;

  const [page, setPage] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Count total
      let countQuery = supabase.from(table).select('id', { count: 'exact', head: true }).is('archived_at', null);
      for (const [key, value] of Object.entries(filters)) {
        countQuery = countQuery.eq(key, value);
      }
      const { count } = await countQuery;
      const total = count ?? 0;
      setTotalItems(total);

      // Fetch page
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase
        .from(table)
        .select(select)
        .is('archived_at', null)
        .order(orderBy, { ascending })
        .range(from, to);

      for (const [key, value] of Object.entries(filters)) {
        dataQuery = dataQuery.eq(key, value);
      }

      const { data } = await dataQuery;
      setPage((data as unknown as T[]) ?? []);
      setCurrentPage(pageNum);
      setLoading(false);
    },
    [table, select, pageSize, orderBy, ascending, filters]
  );

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  const nextPage = useCallback(() => {
    if (hasNext) fetchPage(currentPage + 1);
  }, [hasNext, currentPage, fetchPage]);

  const prevPage = useCallback(() => {
    if (hasPrev) fetchPage(currentPage - 1);
  }, [hasPrev, currentPage, fetchPage]);

  const goToPage = useCallback(
    (n: number) => {
      if (n >= 1 && n <= totalPages) fetchPage(n);
    },
    [totalPages, fetchPage]
  );

  const refresh = useCallback(() => {
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  return {
    page,
    loading,
    currentPage,
    totalItems,
    totalPages,
    pageSize,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
}
