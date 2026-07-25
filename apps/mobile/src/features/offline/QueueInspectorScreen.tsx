import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import {
  mutationQueue,
  type QueuedMutation,
} from "@/offline/mutation-queue";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "conflict", label: "Conflicts" },
];

export default function QueueInspectorScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const [items, setItems] = useState<QueuedMutation[]>([]);
  const [filter, setFilter] = useState("all");
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const unsubQ = mutationQueue.subscribe(setItems);
    const unsubN = NetInfo.addEventListener((s) =>
      setOnline(Boolean(s.isConnected)),
    );
    return () => {
      unsubQ();
      unsubN();
    };
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    return {
      pending: items.filter((i) => i.status === "pending").length,
      failed: items.filter((i) => i.status === "failed").length,
      conflict: items.filter((i) => i.status === "conflict").length,
    };
  }, [items]);

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await mutationQueue.flush();
      setLastSync(new Date().toISOString());
      Alert.alert(
        "Sync complete",
        `Synced ${result.synced}, failed ${result.failed}, conflicts ${result.conflicts}`,
      );
    } finally {
      setSyncing(false);
    }
  }

  function resolveConflict(item: QueuedMutation) {
    Alert.alert(
      "Resolve conflict",
      `${item.label}\n\nServer rejected this change (${item.lastError ?? "409/422"}).`,
      [
        {
          text: "Retry keep local",
          onPress: () => void mutationQueue.resolveKeepLocal(item.id),
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => void mutationQueue.discard(item.id),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Sync queue" subtitle="Offline inspector" />

      <View style={{ padding: spacing[4], gap: spacing[3], flex: 1 }}>
        <View
          style={[
            styles.status,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[4],
            },
          ]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            Sync status
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Network: {online ? "Online" : "Offline"}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Pending {counts.pending} · Failed {counts.failed} · Conflicts{" "}
            {counts.conflict}
          </Text>
          {lastSync ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Last sync {formatDateTime(lastSync)}
            </Text>
          ) : null}
          <Button
            title="Sync now"
            loading={syncing}
            disabled={!online}
            onPress={() => void syncNow()}
          />
        </View>

        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={(v) => v && setFilter(v)}
        />

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing[2], flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="cloud-done-outline"
              title="Queue empty"
              message="Offline mutations and conflicts will appear here."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[4],
                  gap: spacing[2],
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {item.label}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {item.method} {item.path}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {item.status.toUpperCase()} · attempts {item.attempts} ·{" "}
                {formatDateTime(item.createdAt)}
              </Text>
              {item.lastError ? (
                <Text style={{ color: colors.destructive, fontSize: 12 }}>
                  {item.lastError}
                </Text>
              ) : null}

              <View style={styles.actions}>
                {item.status === "conflict" ? (
                  <Pressable onPress={() => resolveConflict(item)}>
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      Resolve
                    </Text>
                  </Pressable>
                ) : null}
                {item.status === "failed" || item.status === "pending" ? (
                  <Pressable
                    onPress={() => void mutationQueue.retry(item.id)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      Retry
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void mutationQueue.discard(item.id)}
                >
                  <Text style={{ color: colors.destructive, fontWeight: "600" }}>
                    Discard
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { borderWidth: 1, gap: 8 },
  row: { borderWidth: 1 },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
});
