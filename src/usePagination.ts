import { useState, useMemo, useCallback } from "react";

export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  next: () => void;
  prev: () => void;
  goToPage: (page: number) => void;
  isFirstPage: boolean;
  isLastPage: boolean;
}

function clampPage(page: number, max: number): number {
  if (max <= 0) return 1;
  return Math.max(1, Math.min(page, max));
}

export function usePagination<T>(
  data: T[],
  itemsPerPage: number
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    if (itemsPerPage <= 0) return 0;
    return Math.ceil(data.length / itemsPerPage);
  }, [data.length, itemsPerPage]);

  // Tự clamp khi data thay đổi (vd: filter giảm số trang)
  const safePage = useMemo(
    () => clampPage(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, safePage, itemsPerPage]);

  const next = useCallback(() => {
    setCurrentPage((prev) => clampPage(prev + 1, totalPages));
  }, [totalPages]);

  const prev = useCallback(() => {
    setCurrentPage((prev) => clampPage(prev - 1, totalPages));
  }, [totalPages]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(clampPage(page, totalPages));
    },
    [totalPages]
  );

  return {
    currentPage: safePage,
    totalPages,
    paginatedData,
    next,
    prev,
    goToPage,
    isFirstPage: safePage <= 1,
    isLastPage: safePage >= totalPages || totalPages === 0,
  };
}

export default usePagination;
