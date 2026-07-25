import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Client, ClientStatusValue } from "@enterprise/shared";

import { clientsService } from "@/api/clients.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips, SortBar } from "@/components/ui/FilterChips";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { TextField } from "@/components/ui/TextField";
import { ClientListItem } from "@/features/clients/ClientListItem";
import { useInfiniteResource } from "@/hooks/useInfiniteResource";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "" as const, label: "All" },
  { value: "ACTIVE" as const, label: "Active" },
  { value: "LEAD" as const, label: "Leads" },
  { value: "INACTIVE" as const, label: "Inactive" },
];

type SortBy =
  | "companyName"
  | "contactName"
  | "email"
  | "status"
  | "createdAt"
  | "updatedAt";

const SORT_CYCLE: SortBy[] = [
  "updatedAt",
  "companyName",
  "contactName",
  "status",
  "createdAt",
];

export default function ClientsListScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const search = useSearchQuery();
  const [status, setStatus] = useState<ClientStatusValue | "">("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filters = {
    search: search.query,
    status: status || undefined,
    sortBy,
    sortOrder,
  };

  const list = useInfiniteResource<Client, typeof filters>({
    queryKey: queryKeys.clients.list(filters),
    filters,
    enabled: perms.canReadClients,
    fetchPage: (page, f, limit) =>
      clientsService.list({
        search: f.search ?? "",
        status: f.status as ClientStatusValue | undefined,
        sortBy: f.sortBy as SortBy,
        sortOrder: f.sortOrder as "asc" | "desc",
        page,
        limit,
      }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Clients"
        subtitle="CRM"
        right={
          perms.canWriteClients ? (
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(app)/clients/create")}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />

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
        emptyTitle="No clients yet"
        emptyMessage="Add your first client to get started."
        emptyIcon="people-outline"
        ListHeaderComponent={
          <View style={{ gap: spacing[3], paddingBottom: spacing[3] }}>
            <TextField
              label="Search"
              value={search.value}
              onChangeText={search.setValue}
              placeholder="Company, contact, email…"
              autoCapitalize="none"
              returnKeyType="search"
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
          <ClientListItem
            client={item}
            onPress={() => router.push(`/(app)/clients/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
