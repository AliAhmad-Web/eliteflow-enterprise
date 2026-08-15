"use client";

import { useProjects } from "@/features/projects/hooks/use-projects";
import { useQuotes } from "@/features/quotes/hooks/use-quotes";
import { useRole } from "@/features/rbac/hooks/use-permissions";

export function useClientWorkspaceAccess() {
  const { isClient } = useRole();
  const quotesQuery = useQuotes({
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  });
  const projectsQuery = useProjects({
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 1,
  });

  if (!isClient) {
    return {
      isClient: false,
      unlocked: true,
      isLoading: false,
      quotes: quotesQuery.data?.items ?? [],
    };
  }

  const quotes = quotesQuery.data?.items ?? [];
  const unlocked =
    quotes.some((item) => item.workspaceUnlocked) ||
    (projectsQuery.data?.pagination.total ?? 0) > 0;

  return {
    isClient: true,
    unlocked,
    isLoading: quotesQuery.isLoading || projectsQuery.isLoading,
    quotes,
  };
}
