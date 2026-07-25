import { useMemo } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";

import type { PaginatedResponse } from "@enterprise/shared";

type PageParam = number;

interface UseInfiniteResourceOptions<TItem, TFilters extends Record<string, unknown>> {
  queryKey: QueryKey;
  filters: TFilters;
  limit?: number;
  enabled?: boolean;
  fetchPage: (
    page: number,
    filters: TFilters,
    limit: number,
  ) => Promise<PaginatedResponse<TItem>>;
}

export function useInfiniteResource<
  TItem,
  TFilters extends Record<string, unknown>,
>({
  queryKey,
  filters,
  limit = 20,
  enabled = true,
  fetchPage,
}: UseInfiniteResourceOptions<TItem, TFilters>) {
  const query = useInfiniteQuery<
    PaginatedResponse<TItem>,
    Error,
    InfiniteData<PaginatedResponse<TItem>>,
    QueryKey,
    PageParam
  >({
    queryKey,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam, filters, limit),
    getNextPageParam: (last) => {
      const { page, totalPages } = last.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return {
    ...query,
    items,
  };
}
