import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { Project } from "@enterprise/shared";

import { projectsService } from "@/api/projects.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips, SortBar } from "@/components/ui/FilterChips";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { TextField } from "@/components/ui/TextField";
import { ProjectListItem } from "@/features/projects/ProjectListItem";
import { useInfiniteResource } from "@/hooks/useInfiniteResource";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "" as const, label: "All" },
  { value: "NOT_STARTED" as const, label: "Not started" },
  { value: "IN_PROGRESS" as const, label: "Active" },
  { value: "ON_HOLD" as const, label: "On hold" },
  { value: "COMPLETED" as const, label: "Done" },
  { value: "CANCELLED" as const, label: "Cancelled" },
];

type SortBy =
  | "name"
  | "status"
  | "priority"
  | "dueDate"
  | "progress"
  | "createdAt"
  | "updatedAt";

const SORT_CYCLE: SortBy[] = [
  "updatedAt",
  "dueDate",
  "name",
  "priority",
  "progress",
  "status",
];

export default function ProjectsListScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const search = useSearchQuery();
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filters = {
    search: search.query,
    status: status || undefined,
    sortBy,
    sortOrder,
  };

  const list = useInfiniteResource<Project, typeof filters>({
    queryKey: queryKeys.projects.list(filters),
    filters,
    enabled: perms.canReadProjects,
    fetchPage: (page, f, limit) =>
      projectsService.list({
        search: f.search ?? "",
        status: f.status as never,
        sortBy: f.sortBy as SortBy,
        sortOrder: f.sortOrder as "asc" | "desc",
        page,
        limit,
      }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Projects" subtitle="Portfolio" />
      <InfiniteList
        data={list.items}
        keyExtractor={(item) => item.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        isRefreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onEndReached={() => void list.fetchNextPage()}
        emptyTitle="No projects"
        emptyMessage="Projects from your workspace will show up here."
        emptyIcon="briefcase-outline"
        ListHeaderComponent={
          <View style={{ gap: spacing[3], paddingBottom: spacing[3] }}>
            <TextField
              label="Search"
              value={search.value}
              onChangeText={search.setValue}
              placeholder="Name, client…"
              autoCapitalize="none"
            />
            <FilterChips
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
            <SortBar
              label={sortBy}
              ascending={sortOrder === "asc"}
              onToggleOrder={() =>
                setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
              }
              onPressSort={() => {
                const idx = SORT_CYCLE.indexOf(sortBy);
                setSortBy(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]!);
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ProjectListItem
            project={item}
            onPress={() => router.push(`/(app)/projects/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
