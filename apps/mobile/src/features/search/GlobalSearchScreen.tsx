import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useDeferredValue } from "react";

import { clientsService } from "@/api/clients.service";
import { projectsService } from "@/api/projects.service";
import { tasksService } from "@/api/tasks.service";
import { queryKeys } from "@/api/query-keys";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useTheme } from "@/theme/theme.store";

type SearchHit = {
  id: string;
  kind: "client" | "project" | "task";
  title: string;
  subtitle: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function GlobalSearchScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const search = useSearchQuery("", 350);
  const deferredQ = useDeferredValue(search.query);
  const enabled = deferredQ.length >= 2;

  const [clientsQ, projectsQ, tasksQ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.search(`clients:${deferredQ}`),
        queryFn: () =>
          clientsService.list({
            search: deferredQ,
            sortBy: "updatedAt",
            sortOrder: "desc",
            page: 1,
            limit: 8,
          }),
        enabled: enabled && perms.canReadClients,
        staleTime: 30_000,
      },
      {
        queryKey: queryKeys.search(`projects:${deferredQ}`),
        queryFn: () =>
          projectsService.list({
            search: deferredQ,
            sortBy: "updatedAt",
            sortOrder: "desc",
            page: 1,
            limit: 8,
          }),
        enabled: enabled && perms.canReadProjects,
        staleTime: 30_000,
      },
      {
        queryKey: queryKeys.search(`tasks:${deferredQ}`),
        queryFn: () =>
          tasksService.list({
            search: deferredQ,
            sortBy: "updatedAt",
            sortOrder: "desc",
            page: 1,
            limit: 8,
          }),
        enabled: enabled && perms.canReadTasks,
        staleTime: 30_000,
      },
    ],
  });

  const hits = useMemo<SearchHit[]>(() => {
    const out: SearchHit[] = [];
    for (const c of clientsQ.data?.items ?? []) {
      out.push({
        id: `client-${c.id}`,
        kind: "client",
        title: c.companyName,
        subtitle: `${c.contactName} · Client`,
        href: `/(app)/clients/${c.id}`,
        icon: "people-outline",
      });
    }
    for (const p of projectsQ.data?.items ?? []) {
      out.push({
        id: `project-${p.id}`,
        kind: "project",
        title: p.name,
        subtitle: `${p.clientName || "Project"} · ${p.status}`,
        href: `/(app)/projects/${p.id}`,
        icon: "briefcase-outline",
      });
    }
    for (const t of tasksQ.data?.items ?? []) {
      out.push({
        id: `task-${t.id}`,
        kind: "task",
        title: t.title,
        subtitle: `${t.projectName || "Task"} · ${t.status}`,
        href: `/(app)/tasks/${t.id}`,
        icon: "checkbox-outline",
      });
    }
    return out;
  }, [clientsQ.data, projectsQ.data, tasksQ.data]);

  const loading =
    enabled &&
    (clientsQ.isLoading || projectsQ.isLoading || tasksQ.isLoading);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing[4], flex: 1 }}>
        <AppHeader title="Search" subtitle="Clients, projects, tasks" showSearch={false} />

        <View style={{ marginTop: spacing[4], marginBottom: spacing[3] }}>
          <TextField
            label="Query"
            value={search.value}
            onChangeText={search.setValue}
            placeholder="Type at least 2 characters…"
            autoCapitalize="none"
            returnKeyType="search"
            autoFocus
          />
        </View>

        {!enabled ? (
          <EmptyState
            icon="search-outline"
            title="Search the workspace"
            message="Find clients, projects, and tasks across the platform."
          />
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : hits.length === 0 ? (
          <EmptyState
            icon="file-tray-outline"
            title="No matches"
            message={`Nothing found for “${deferredQ}”.`}
          />
        ) : (
          <FlatList
            data={hits}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[8] }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(item.href as never)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius,
                    padding: spacing[4],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: colors.muted }]}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
